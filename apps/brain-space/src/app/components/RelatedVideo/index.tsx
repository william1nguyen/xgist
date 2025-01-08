"use client";

import { useVideoStore } from "@/store/videoStore";
import VideoCard from "../VideoGrid/VideoCard";

export default function RelatedVideos({
  currentVideoId,
}: {
  currentVideoId: string;
}) {
  const { videos } = useVideoStore();
  const relatedVideos = videos
    .filter((video) => video.id !== currentVideoId)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Video liên quan</h2>
      {relatedVideos.map((video) => (
        <VideoCard key={video.id} video={video} compact />
      ))}
    </div>
  );
}
