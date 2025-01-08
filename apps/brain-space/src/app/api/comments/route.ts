import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newComment = {
      id: Date.now().toString(),
      videoId: body.videoId,
      content: body.content,
      author: "User Name",
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(newComment);
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating comment" },
      { status: 500 }
    );
  }
}
