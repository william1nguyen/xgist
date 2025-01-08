import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const video = formData.get("video");
    const thumbnail = formData.get("thumbnail");
    const data = JSON.parse(formData.get("data") as string);

    const mockVideoId = Date.now().toString();

    return NextResponse.json({
      id: mockVideoId,
      message: "Upload successful",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error uploading video" },
      { status: 500 }
    );
  }
}
