import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import prisma from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    const video = await prisma.video.findUnique({
      where: { id: params.id },
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
        likes: session?.user
          ? {
              where: { userId: session.user.sub },
              select: { id: true },
            }
          : false,
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    await prisma.video.update({
      where: { id: params.id },
      data: { views: { increment: 1 } },
    });

    const responseVideo: Partial<typeof video> & { isLiked: boolean } = {
      ...video,
      isLiked: session?.user ? video.likes.length > 0 : false,
    };

    delete responseVideo.likes;

    return NextResponse.json(responseVideo);
  } catch (error) {
    console.error("Error fetching video:", error);
    return NextResponse.json(
      { error: "Error fetching video" },
      { status: 500 }
    );
  }
}
