"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
import Image from "next/image";
import CommentSection from "@/app/components/CommentSection";
import { useVideoStore } from "@/store/videoStore";
import LikeButton from "@/app/components/VideoPlayer/LikeButton";
import VideoPlayer from "@/app/components/VideoPlayer";
import RelatedVideos from "@/app/components/RelatedVideo";
import { Video } from "@/types/video";
import VideoSummary from "@/app/components/VideoSummary";

function VideoMeta({ video }: { video: Video }) {
  return (
    <div className="flex items-center mt-2 text-sm text-gray-600">
      <span>{video._count?.views || 0} lượt xem</span>
      <span className="mx-2">•</span>
      <span>
        {new Date(video.createdAt).toLocaleDateString("vi-VN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </span>
    </div>
  );
}

function UserInfo({ user }: { user: Video["user"] }) {
  return (
    <div className="flex items-center gap-4">
      {user.avatar && (
        <div className="relative w-12 h-12">
          <Image
            src={user.avatar}
            alt={user.name || ""}
            fill
            className="rounded-full object-cover"
          />
        </div>
      )}
      <div>
        <h3 className="font-semibold">{user.name}</h3>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="bg-gray-200 rounded-lg h-[500px] mb-4"></div>
          <div className="bg-white rounded-lg p-6">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="h-24 bg-gray-200 rounded mb-4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Đã có lỗi xảy ra
        </h2>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

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
        setError(null);

        const response = await fetch(`/api/videos/${id}`);
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Video không tồn tại"
              : "Không thể tải video"
          );
        }

        const data = await response.json();
        setCurrentVideo(data);
      } catch (error) {
        console.error("Error fetching video:", error);
        setError(error instanceof Error ? error.message : "Đã có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVideo();
    }

    // Cleanup when leaving the page
    return () => {
      setCurrentVideo(null);
    };
  }, [id, setCurrentVideo, setLoading]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!currentVideo) return <ErrorState message="Không tìm thấy video" />;

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
                  <VideoMeta video={currentVideo} />
                </div>
                <LikeButton
                  videoId={currentVideo.id}
                  initialLiked={currentVideo.isLiked}
                  likeCount={currentVideo._count?.likes || 0}
                />
              </div>

              <div className="border-t border-b border-gray-200 py-4 my-4">
                <UserInfo user={currentVideo.user} />
              </div>

              {currentVideo.description && (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {currentVideo.description}
                </p>
              )}
              <VideoSummary videoUrl={currentVideo.url} />
            </div>

            <CommentSection
              videoId={currentVideo.id}
              isAuthenticated={!!user}
            />
          </div>

          <div className="lg:col-span-1">
            <RelatedVideos currentVideoId={currentVideo.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
