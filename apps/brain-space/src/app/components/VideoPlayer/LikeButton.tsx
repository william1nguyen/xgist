"use client";

import { useVideo } from "@/app/hooks/useVideo";
import { Heart } from "lucide-react";
import { useState } from "react";

interface LikeButtonProps {
  videoId: string;
  initialLiked?: boolean;
  likeCount: number;
}

export default function LikeButton({
  videoId,
  initialLiked = false,
  likeCount,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(likeCount);
  const { isLiking, likeVideo, unlikeVideo } = useVideo(videoId);

  const handleClick = async () => {
    if (isLiking) return;

    try {
      if (liked) {
        await unlikeVideo();
        setCount((prev) => prev - 1);
      } else {
        await likeVideo();
        setCount((prev) => prev + 1);
      }
      setLiked(!liked);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLiking}
      className={`flex items-center gap-1 px-3 py-1 rounded-full ${
        liked
          ? "bg-red-100 text-red-600"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
      <span>{count}</span>
    </button>
  );
}
