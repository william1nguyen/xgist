"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useVideoStore } from "@/store/videoStore";
import VideoPlayer from "@/app/components/VideoPlayer";
import VideoInfo from "@/app/components/VideoDetail/VideoInfo";
import CommentSection from "@/app/components/CommentSection";
import RelatedVideos from "@/app/components/RelatedVideo";
import VideoDetailSkeleton from "@/app/components/VideoDetail/VideoDetailSkeleton";

export default function VideoDetailPage() {
  const { id } = useParams();
  const { currentVideo, setCurrentVideo, loading } = useVideoStore();

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await fetch(`/api/videos/${id}`);
        const data = await response.json();
        setCurrentVideo(data);
      } catch (error) {
        console.error("Error fetching video:", error);
      }
    };

    fetchVideo();
  }, [id, setCurrentVideo]);

  if (loading) return <VideoDetailSkeleton />;
  if (!currentVideo) return <div>Video không tồn tại</div>;

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <VideoPlayer video={currentVideo} />
            <VideoInfo video={currentVideo} />
            <CommentSection videoId={currentVideo.id} />
          </div>
          <div className="lg:col-span-1">
            <RelatedVideos currentVideoId={currentVideo.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
