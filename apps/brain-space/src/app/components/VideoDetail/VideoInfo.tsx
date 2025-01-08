import { Video } from "@/types/video";
import { Heart, MessageCircle, Eye } from "lucide-react";
import SummaryModal from "./SummaryModal";

interface VideoInfoProps {
  video: Video;
}

export default function VideoInfo({ video }: VideoInfoProps) {
  return (
    <div className="bg-white rounded-lg p-6 mt-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
          <div className="flex items-center gap-4 text-gray-600 mb-4">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {video.views.toLocaleString()} lượt xem
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {video.likes.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              {video.comments.toLocaleString()}
            </span>
          </div>
        </div>
        <SummaryModal
          title={video.title}
          summary={video.summary || "Không có tóm tắt"}
        />
      </div>
      <div className="mt-4 text-gray-700 whitespace-pre-wrap">
        {video.description}
      </div>
    </div>
  );
}
