export interface Category {
  id: string;
  label: string;
}

export interface VideoItem {
  id: number;
  title: string;
  thumbnail: string;
  duration?: string;
  views?: string;
  likes?: number;
  category: string;
  creator?: string;
  creatorAvatar?: string;
  createdAt: string;
  summarized?: boolean;
  size?: string;
  format?: string;
  resolution?: string;
  originalDuration?: string;
  readingTime?: string;
  wordCount?: string;
  originalVideoId?: number;
}

export interface SummaryItem extends VideoItem {
  originalDuration: string;
  readingTime: string;
  wordCount: string;
  format: string;
  originalVideoId: number;
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
