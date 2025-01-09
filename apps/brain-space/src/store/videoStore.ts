import { create } from "zustand";
import { Video } from "@/types/video";

interface Filters {
  dateRange?: "today" | "week" | "month" | "year" | "all";
  duration?: "short" | "medium" | "long";
}

interface VideoState {
  videos: Video[];
  currentVideo: Video | null;
  loading: boolean;
  hasMore: boolean;
  page: number;
  category: string;
  sortBy: "newest" | "popular" | "views";
  searchQuery: string;
  filters: Filters;
  setVideos: (videos: Video[]) => void;
  appendVideos: (newVideos: Video[]) => void;
  setCurrentVideo: (video: Video) => void;
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setPage: (page: number) => void;
  setCategory: (category: string) => void;
  setSortBy: (sortBy: "newest" | "popular" | "views") => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<Filters>) => void;
  updateVideoLikes: (videoId: string, likeDelta: number) => void;
  updateVideoComments: (videoId: string, commentDelta: number) => void;
  resetFilters: () => void;
}

const defaultFilters: Filters = {
  dateRange: "all",
  duration: undefined,
};

export const useVideoStore = create<VideoState>((set) => ({
  videos: [],
  currentVideo: null,
  loading: false,
  hasMore: true,
  page: 1,
  category: "all",
  sortBy: "newest",
  searchQuery: "",
  filters: defaultFilters,

  setVideos: (videos) => set({ videos }),

  appendVideos: (newVideos) =>
    set((state) => ({
      videos: [...state.videos, ...newVideos],
    })),

  setCurrentVideo: (video) => set({ currentVideo: video }),

  setLoading: (loading) => set({ loading }),

  setHasMore: (hasMore) => set({ hasMore }),

  setPage: (page) => set({ page }),

  setCategory: (category) =>
    set((state) => ({
      category,
      page: 1,
      videos: [],
      hasMore: true,
    })),

  setSortBy: (sortBy) =>
    set((state) => ({
      sortBy,
      page: 1,
      videos: [],
      hasMore: true,
    })),

  setSearchQuery: (searchQuery) =>
    set((state) => ({
      searchQuery,
      page: 1,
      videos: [],
      hasMore: true,
    })),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      page: 1,
      videos: [],
      hasMore: true,
    })),

  updateVideoLikes: (videoId, likeDelta) =>
    set((state) => ({
      videos: state.videos.map((video) =>
        video.id === videoId
          ? {
              ...video,
              _count: {
                ...video._count,
                likes: video._count.likes + likeDelta,
              },
              isLiked: likeDelta > 0,
            }
          : video
      ),
      currentVideo:
        state.currentVideo?.id === videoId
          ? {
              ...state.currentVideo,
              _count: {
                ...state.currentVideo._count,
                likes: state.currentVideo._count.likes + likeDelta,
              },
              isLiked: likeDelta > 0,
            }
          : state.currentVideo,
    })),

  updateVideoComments: (videoId, commentDelta) =>
    set((state) => ({
      videos: state.videos.map((video) =>
        video.id === videoId
          ? {
              ...video,
              _count: {
                ...video._count,
                comments: video._count.comments + commentDelta,
              },
            }
          : video
      ),
      currentVideo:
        state.currentVideo?.id === videoId
          ? {
              ...state.currentVideo,
              _count: {
                ...state.currentVideo._count,
                comments: state.currentVideo._count.comments + commentDelta,
              },
            }
          : state.currentVideo,
    })),

  resetFilters: () =>
    set(() => ({
      filters: defaultFilters,
      category: "all",
      sortBy: "newest",
      searchQuery: "",
      page: 1,
      videos: [],
      hasMore: true,
    })),
}));
