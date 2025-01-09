import { useState } from "react";
import { useVideoStore } from "@/store/videoStore";

export const useVideo = (videoId: string) => {
  const [isLiking, setIsLiking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setCurrentVideo } = useVideoStore();

  const likeVideo = async () => {
    try {
      setIsLiking(true);
      const response = await fetch(`/api/videos/${videoId}/like`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to like video");
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsLiking(false);
    }
  };

  const unlikeVideo = async () => {
    try {
      setIsLiking(true);
      const response = await fetch(`/api/videos/${videoId}/like`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to unlike video");
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsLiking(false);
    }
  };

  return {
    isLiking,
    error,
    likeVideo,
    unlikeVideo,
  };
};
