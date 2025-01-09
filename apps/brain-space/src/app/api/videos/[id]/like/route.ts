import { getSession } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const like = await prisma.like.create({
      data: {
        videoId: params.id,
        userId: session.user.sub,
      },
    });

    return NextResponse.json(like);
  } catch (error) {
    if ((error as any).code === "P2002") {
      return NextResponse.json(
        { error: "Already liked this video" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Error liking video" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.like.delete({
      where: {
        like_video_user_unique: {
          videoId: params.id,
          userId: session.user.sub,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Error unliking video" },
      { status: 500 }
    );
  }
}
