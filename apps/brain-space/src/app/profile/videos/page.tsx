"use client";

import { useEffect, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import VideoCard from "@/app/components/VideoGrid/VideoCard";
import { Video } from "@/types/video";
import SettingsLayout from "@/app/settings/SettingsLayout";

export default function MyVideosPage() {
  const { user } = useUser();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyVideos = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/videos/my-videos");
        if (!response.ok) throw new Error("Failed to fetch videos");

        const data = await response.json();
        setVideos(data.videos);
      } catch (error) {
        console.error("Error fetching videos:", error);
        setError("Failed to load videos");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchMyVideos();
    }
  }, [user]);

  if (loading) {
    return (
      <SettingsLayout>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-64 bg-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </SettingsLayout>
    );
  }

  if (error) {
    return (
      <SettingsLayout>
        <div className="text-center text-red-600">{error}</div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Video của tôi</h2>

        {videos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Bạn chưa có video nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
