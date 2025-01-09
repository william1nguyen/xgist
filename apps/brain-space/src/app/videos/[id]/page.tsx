"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";

import CommentSection from "@/app/components/CommentSection";
import { useVideoStore } from "@/store/videoStore";
import LikeButton from "@/app/components/VideoPlayer/LikeButton";
import VideoPlayer from "@/app/components/VideoPlayer";
import RelatedVideos from "@/app/components/RelatedVideo";

export default function VideoDetailPage() {
  const { id } = useParams();
  const { user } = useUser();
  const { currentVideo, setCurrentVideo, loading, setLoading } =
    useVideoStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/videos/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch video");
        }
        const data = await response.json();
        setCurrentVideo(data);
      } catch (error) {
        console.error("Error fetching video:", error);
        setError("Failed to load video");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVideo();
    }
  }, [id, setCurrentVideo, setLoading]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!currentVideo) return <div>Video not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <VideoPlayer video={currentVideo} />

            <div className="mt-4 bg-white rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold">{currentVideo.title}</h1>
                  <div className="flex items-center mt-2 text-sm text-gray-600">
                    <span>{currentVideo._count.views} views</span>
                    <span className="mx-2">•</span>
                    <span>
                      {new Date(currentVideo.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <LikeButton
                    videoId={currentVideo.id}
                    initialLiked={currentVideo.isLiked}
                    likeCount={currentVideo._count.likes}
                  />
                </div>
              </div>

              <div className="border-t border-b border-gray-200 py-4 my-4">
                <div className="flex items-center gap-4">
                  {currentVideo.user.avatar && (
                    <img
                      src={currentVideo.user.avatar}
                      alt={currentVideo.user.name}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold">{currentVideo.user.name}</h3>
                  </div>
                </div>
              </div>

              <p className="text-gray-700 whitespace-pre-wrap">
                {currentVideo.description}
              </p>
            </div>

            <CommentSection
              videoId={currentVideo.id}
              isAuthenticated={!!user}
            />
          </div>

          <div className="lg:col-span-1">
            <RelatedVideos
              currentVideoId={currentVideo.id}
              category={currentVideo.category}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
