import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import prisma from "@/lib/db";
import { minioClient } from "@/lib/minio";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user exists in database
    const user = await prisma.user.upsert({
      where: {
        email: session.user.email,
      },
      update: {
        name: session.user.name,
        avatar: session.user.picture,
      },
      create: {
        email: session.user.email,
        name: session.user.name,
        avatar: session.user.picture,
        id: session.user.sub, // Use Auth0 sub as user ID
      },
    });

    const formData = await request.formData();
    const videoFile = formData.get("video") as File;
    const thumbnailFile = formData.get("thumbnail") as File;
    const data = JSON.parse(formData.get("data") as string);

    // Validate video file
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

    // Upload video to MinIO
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

    // Upload thumbnail if provided
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

    // Create video in database
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
        userId: user.id, // Use the user ID we just ensured exists
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

    // Detailed error response
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

const ITEMS_PER_PAGE = 12;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const session = await getSession();

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * ITEMS_PER_PAGE;

    // Filters
    const category = searchParams.get("category") || "all";
    const sort = searchParams.get("sort") || "newest";
    const searchQuery = searchParams.get("search") || "";
    const dateRange = searchParams.get("dateRange") as
      | "today"
      | "week"
      | "month"
      | "year"
      | "all"
      | undefined;

    let where: any = {};

    if (category !== "all") {
      where.category = category;
    }

    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    if (dateRange) {
      const now = new Date();
      let dateFilter: Date;

      switch (dateRange) {
        case "today":
          dateFilter = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          dateFilter = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          dateFilter = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "year":
          dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          dateFilter = new Date(0);
      }
      where.createdAt = { gte: dateFilter };
    }

    let orderBy: any;
    switch (sort) {
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
        take: ITEMS_PER_PAGE,
        skip,
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
          ...(session?.user
            ? {
                likes: {
                  where: {
                    userId: session.user.sub,
                  },
                  select: {
                    id: true,
                  },
                },
              }
            : {}),
        },
      }),
      prisma.video.count({ where }),
    ]);

    const transformedVideos = videos.map((video) => ({
      ...video,
      isLiked: session?.user ? video.likes?.length > 0 : false,
      likes: undefined,
    }));

    return NextResponse.json({
      videos: transformedVideos,
      pagination: {
        page,
        totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE),
        totalVideos: totalCount,
        hasMore: skip + videos.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Error fetching videos" },
      { status: 500 }
    );
  }
}
