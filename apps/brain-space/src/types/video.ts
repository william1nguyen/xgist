export interface User {
  id: string;
  name: string | null;
  avatar: string | null;
}

export interface Video {
  id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  summary: string | null;
  category: string | null;
  tags: string[];
  views: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user: User;
  _count: {
    likes: number;
    comments: number;
    views: number;
  };
  isLiked?: boolean;

  comments: number;
  likes: number;
}

export interface PaginatedResponse<T> {
  videos: T[];
  pagination: {
    page: number;
    totalPages: number;
    totalVideos: number;
    hasMore: boolean;
  };
}
