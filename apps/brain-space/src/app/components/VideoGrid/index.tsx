"use client";

import { useEffect, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import VideoCard from "./VideoCard";
import { useVideoStore } from "@/store/videoStore";
import VideoSkeleton from "./VideoSkeleton";

export default function VideoGrid() {
  const {
    videos,
    loading,
    hasMore,
    page,
    category,
    sortBy,
    appendVideos,
    setLoading,
    setHasMore,
    setPage,
  } = useVideoStore();

  const { ref, inView } = useInView({
    threshold: 0,
  });

  const loadVideos = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/videos?page=${page}&category=${category}&sort=${sortBy}`
      );
      const data = await response.json();

      if (data.length < 12) {
        // assuming 12 items per page
        setHasMore(false);
      }

      appendVideos(data);
      setPage(page + 1);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  }, [page, category, sortBy, loading, hasMore]);

  useEffect(() => {
    if (inView) {
      loadVideos();
    }
  }, [inView, loadVideos]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
        {loading && (
          <>
            <VideoSkeleton />
            <VideoSkeleton />
            <VideoSkeleton />
          </>
        )}
      </div>
      <div ref={ref} className="h-10" />
    </>
  );
}
