import { create } from "zustand";
import { Video } from "@/types/video";

interface VideoState {
  videos: Video[];
  currentVideo: Video | null;
  loading: boolean;
  hasMore: boolean;
  page: number;
  category: string;
  sortBy: "newest" | "popular" | "views";
  setVideos: (videos: Video[]) => void;
  appendVideos: (videos: Video[]) => void;
  setCurrentVideo: (video: Video) => void;
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setPage: (page: number) => void;
  setCategory: (category: string) => void;
  setSortBy: (sortBy: "newest" | "popular" | "views") => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  videos: [],
  currentVideo: null,
  loading: false,
  hasMore: true,
  page: 1,
  category: "all",
  sortBy: "newest",
  setVideos: (videos) => set({ videos }),
  appendVideos: (newVideos) =>
    set((state) => ({
      videos: [...state.videos, ...newVideos],
    })),
  setCurrentVideo: (video) => set({ currentVideo: video }),
  setLoading: (loading) => set({ loading }),
  setHasMore: (hasMore) => set({ hasMore }),
  setPage: (page) => set({ page }),
  setCategory: (category) => set({ category }),
  setSortBy: (sortBy) => set({ sortBy }),
}));
