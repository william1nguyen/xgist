export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl?: string;
  likes: number;
  comments: number;
  category: string;
  createdAt: string;
  views: number;
  summary?: string;
}
