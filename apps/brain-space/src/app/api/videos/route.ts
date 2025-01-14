import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import prisma from "@/lib/db";
import { minioClient } from "@/lib/minio";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.upsert({
      where: {
        email: session.user.email,
      },
      update: {
        name: session.user.name,
        avatar: session.user.picture,
      },
      create: {
        email: session.user.email || "",
        name: session.user.name,
        avatar: session.user.picture,
        id: session.user.sub,
      },
    });

    const formData = await request.formData();
    const videoFile = formData.get("video") as File;
    const thumbnailFile = formData.get("thumbnail") as File;
    const data = JSON.parse(formData.get("data") as string);

    if (!videoFile || !ALLOWED_VIDEO_TYPES.includes(videoFile.type)) {
      return NextResponse.json(
        { error: "Invalid video file type" },
        { status: 400 }
      );
    }

    if (videoFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Video file size too large" },
        { status: 400 }
      );
    }

    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    const videoObjectName = `videos/${user.id}/${Date.now()}-${videoFile.name}`;
    await minioClient.putObject(
      "videos",
      videoObjectName,
      videoBuffer,
      videoFile.size,
      { "Content-Type": videoFile.type }
    );
    const videoUrl = `${process.env.MINIO_PUBLIC_URL}/videos/${videoObjectName}`;

    let thumbnailUrl;
    if (thumbnailFile) {
      if (!ALLOWED_IMAGE_TYPES.includes(thumbnailFile.type)) {
        return NextResponse.json(
          { error: "Invalid thumbnail file type" },
          { status: 400 }
        );
      }

      const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
      const thumbnailObjectName = `thumbnails/${user.id}/${Date.now()}-${thumbnailFile.name}`;
      await minioClient.putObject(
        "thumbnails",
        thumbnailObjectName,
        thumbnailBuffer,
        thumbnailFile.size,
        { "Content-Type": thumbnailFile.type }
      );
      thumbnailUrl = `${process.env.MINIO_PUBLIC_URL}/thumbnails/${thumbnailObjectName}`;
    }

    const video = await prisma.video.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags
          ? data.tags.split(",").map((tag: string) => tag.trim())
          : [],
        url: videoUrl,
        thumbnailUrl,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return NextResponse.json(video);
  } catch (error) {
    console.error("Error uploading video:", error);

    if ((error as any).code === "P2002") {
      return NextResponse.json(
        { error: "A video with this title already exists" },
        { status: 400 }
      );
    }

    if ((error as any).code === "P2003") {
      return NextResponse.json(
        { error: "User authentication error" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Error uploading video" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const sortBy = searchParams.get("sortBy") || "newest";
    const search = searchParams.get("search") || "";
    const limit = 12;
    const skip = (page - 1) * limit;

    let where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    let orderBy: any = {};
    switch (sortBy) {
      case "popular":
        orderBy = {
          likes: {
            _count: "desc",
          },
        };
        break;
      case "views":
        orderBy = {
          views: "desc",
        };
        break;
      default:
        orderBy = {
          createdAt: "desc",
        };
    }

    const [videos, totalCount] = await Promise.all([
      prisma.video.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.video.count({ where }),
    ]);

    return NextResponse.json({
      videos,
      pagination: {
        page,
        totalPages: Math.ceil(totalCount / limit),
        totalVideos: totalCount,
        hasMore: skip + videos.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error details:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
