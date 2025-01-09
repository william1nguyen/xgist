"use client";

import { useEffect, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import VideoCard from "./VideoCard";
import { useVideoStore } from "@/store/videoStore";
import VideoSkeleton from "./VideoSkeleton";
import { PaginatedResponse, Video } from "@/types/video";

export default function VideoGrid() {
  const {
    videos,
    loading,
    hasMore,
    page,
    category,
    sortBy,
    filters,
    searchQuery,
    appendVideos,
    setLoading,
    setHasMore,
    setPage,
    setVideos,
  } = useVideoStore();

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  });

  // Initial load
  useEffect(() => {
    const fetchInitialVideos = async () => {
      setLoading(true);
      try {
        const searchParams = new URLSearchParams({
          page: "1",
          category,
          sort: sortBy,
          ...(searchQuery && { search: searchQuery }),
          ...(filters.dateRange && { dateRange: filters.dateRange }),
        });

        const response = await fetch(`/api/videos?${searchParams}`);
        if (!response.ok) throw new Error("Failed to fetch videos");

        const data: PaginatedResponse<Video> = await response.json();

        setVideos(data.videos);
        setHasMore(data.pagination.hasMore);
        setPage(2); // Set to 2 since we've loaded page 1
      } catch (error) {
        console.error("Error fetching initial videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialVideos();
  }, [category, sortBy, searchQuery, filters]); // Reset and reload when filters change

  const loadMoreVideos = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        category,
        sort: sortBy,
        ...(searchQuery && { search: searchQuery }),
        ...(filters.dateRange && { dateRange: filters.dateRange }),
      });

      const response = await fetch(`/api/videos?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch more videos");

      const data: PaginatedResponse<Video> = await response.json();

      appendVideos(data.videos);
      setHasMore(data.pagination.hasMore);
      setPage(page + 1);
    } catch (error) {
      console.error("Error fetching more videos:", error);
    } finally {
      setLoading(false);
    }
  }, [page, category, sortBy, searchQuery, filters, loading, hasMore]);

  // Load more when scrolling to bottom
  useEffect(() => {
    if (inView && !loading) {
      loadMoreVideos();
    }
  }, [inView, loadMoreVideos]);

  if (videos.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-600">
        <p className="text-lg">Không tìm thấy video nào</p>
        <p className="text-sm mt-2">Thử thay đổi bộ lọc hoặc tìm kiếm khác</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <VideoSkeleton />
          <VideoSkeleton />
          <VideoSkeleton />
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && <div ref={ref} className="h-10" />}

      {/* End of content message */}
      {!hasMore && videos.length > 0 && (
        <div className="text-center text-gray-600 py-8">
          Bạn đã xem hết video
        </div>
      )}
    </div>
  );
}
