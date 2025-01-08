import { NextResponse } from "next/server";
import type { Video } from "@/types/video";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const category = searchParams.get("category") || "all";
  const sort = searchParams.get("sort") || "newest";

  const mockVideos: Video[] = Array.from({ length: 12 }, (_, i) => ({
    id: `${page}-${i + 1}`,
    title: `Video học tập ${page}-${i + 1}`,
    description: "Mô tả video học tập...",
    thumbnailUrl: "/api/placeholder/400/225",
    category: ["all", "programming", "math", "science", "language"][
      Math.floor(Math.random() * 5)
    ],
    likes: Math.floor(Math.random() * 1000),
    comments: Math.floor(Math.random() * 100),
    views: Math.floor(Math.random() * 10000),
    createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
  }));

  let filteredVideos = mockVideos;
  if (category !== "all") {
    filteredVideos = mockVideos.filter((video) => video.category === category);
  }

  switch (sort) {
    case "popular":
      filteredVideos.sort((a, b) => b.likes - a.likes);
      break;
    case "views":
      filteredVideos.sort((a, b) => b.views - a.views);
      break;
    default:
      filteredVideos.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));

  return NextResponse.json(filteredVideos);
}
