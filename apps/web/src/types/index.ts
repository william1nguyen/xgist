export interface Category {
  id: string;
  label: string;
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  userId: string;
  category:
    | "technology"
    | "education"
    | "productivity"
    | "finance"
    | "travel"
    | "health"
    | "other";
  duration: number;
  views: number;
  likes: number;
  isSummarized: boolean;
  isLiked: {
    state: boolean;
  };
  isBookmarked: {
    state: boolean;
  };
  metadata?: any;
  creator: {
    id: string;
    keycloakUserId: string;
    username: string;
    email: string;
    createdTime?: string | null;
    updatedTime?: string | null;
    deletedTime?: string | null;
  };
  createdTime?: string | null;
  updatedTime?: string | null;
  deletedTime?: string | null;
}

export interface SummaryItem extends Omit<VideoItem, "isSummarized"> {
  originalDuration: string;
  readingTime: string;
  wordCount: string;
  format: string;
  originalVideoId: string;
}

export interface StatisticsData {
  totalVideos: number;
  totalSummaries: number;
  totalDuration: string;
  totalSavedTime: string;
  uploadedThisMonth: number;
  summarizedThisMonth: number;
}

export interface CategoryData {
  name: string;
  count: number;
  percentage: number;
}

export interface Activity {
  id: string | number;
  title: string;
  timestamp: string;
  icon: React.ReactNode;
  iconColor: "indigo" | "purple" | "green" | "blue" | "red";
}

export interface SortOption {
  id: string;
  label: string;
}

export interface TabItem {
  id: string;
  label: string;
}

export interface PaginationMetadata {
  page: number;
  size: number;
  total: number;
}

export interface ApiResponse<T> {
  data: T;
  metadata?: PaginationMetadata;
}

export interface VideosResponse {
  videos: VideoItem[];
}
