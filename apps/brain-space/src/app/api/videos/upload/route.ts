import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import prisma from "@/lib/db";
import { minioClient } from "@/lib/minio";

export async function POST(request: Request) {
  try {
    // Get and validate session
    const session = await getSession();
    console.log("Session:", JSON.stringify(session, null, 2));

    if (!session?.user) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    if (!session.user.sub) {
      console.error("No user.sub in session:", session.user);
      return NextResponse.json({ error: "No user ID found" }, { status: 401 });
    }

    // Log user information
    console.log("User Info:", {
      sub: session.user.sub,
      email: session.user.email,
      name: session.user.name,
    });

    // Create or update user first
    const user = await prisma.user.upsert({
      where: { id: session.user.sub },
      update: {
        email: session.user.email,
        name: session.user.name,
        avatar: session.user.picture,
      },
      create: {
        id: session.user.sub,
        email: session.user.email || "",
        name: session.user.name,
        avatar: session.user.picture,
      },
    });

    console.log("Created/Updated User:", user);

    const formData = await request.formData();
    const videoFile = formData.get("video") as File;
    const thumbnailFile = formData.get("thumbnail") as File;
    const data = JSON.parse(formData.get("data") as string);

    console.log("Form Data:", {
      hasVideo: !!videoFile,
      hasThumbnail: !!thumbnailFile,
      data: data,
    });

    // Upload video
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

    console.log("Video uploaded:", videoUrl);

    // Upload thumbnail if provided
    let thumbnailUrl;
    if (thumbnailFile) {
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
      console.log("Thumbnail uploaded:", thumbnailUrl);
    }

    // Create video with explicit type checking
    const videoData = {
      title: data.title,
      description: data.description || null,
      category: data.category || null,
      tags: data.tags
        ? data.tags.split(",").map((tag: string) => tag.trim())
        : [],
      url: videoUrl,
      thumbnailUrl: thumbnailUrl || null,
      userId: user.id, // Using the user.id we just confirmed exists
    };

    console.log("Creating video with data:", videoData);

    const video = await prisma.video.create({
      data: videoData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    console.log("Video created successfully:", video);

    return NextResponse.json(video);
  } catch (error: any) {
    console.error("Detailed upload error:", {
      error: error,
      message: error.message,
      code: error.code,
      meta: error.meta,
    });

    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error: "User authentication error",
          details:
            "Could not link video to user. Please ensure you're properly logged in.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Error uploading video",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
