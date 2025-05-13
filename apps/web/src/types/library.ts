import { Media } from "./media";

export type LibraryTab = "all" | "video" | "audio";
export type SortType = "recent" | "oldest" | "title" | "views";
export type ViewMode = "grid" | "list";

export interface LibraryState {
  activeTab: LibraryTab;
  viewMode: ViewMode;
  sortBy: SortType;
  loading: boolean;
  searchQuery: string;
  mediaList: Media[];
  error: string | null;
  page: number;
  totalPages: number;
}

export interface LibraryFilters {
  searchQuery: string;
  mediaType?: LibraryTab;
  page: number;
  size: number;
}
