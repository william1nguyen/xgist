import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import prisma from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get summary from request body
    const { summary } = await request.json();
    if (!summary) {
      return NextResponse.json(
        { error: "Summary is required" },
        { status: 400 },
      );
    }

    // Fetch the video first
    const video = await prisma.video.findUnique({
      where: { id: params.id },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Update video with provided summary
    const updatedVideo = await prisma.video.update({
      where: { id: params.id },
      data: {
        summary: summary,
      },
    });

    return NextResponse.json({
      message: "Summary updated successfully",
      summary: updatedVideo.summary,
    });
  } catch (error) {
    console.error("Error updating summary:", error);
    return NextResponse.json(
      { error: "Failed to update summary" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: params.id },
      select: {
        summary: true,
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json({ summary: video.summary });
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 },
    );
  }
}
