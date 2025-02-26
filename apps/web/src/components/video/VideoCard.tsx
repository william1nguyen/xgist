import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FastForward,
  Heart,
  MoreHorizontal,
  Eye,
  Download,
  Share,
  Trash,
} from "lucide-react";

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

interface VideoCardProps {
  item: VideoItem;
  viewMode: "grid" | "list";
  isSelected: boolean;
  onSelect: (id: number) => void;
  contentType: "video" | "summary" | "favorite";
}

export const VideoCard: React.FC<VideoCardProps> = ({
  item,
  viewMode,
  isSelected,
  onSelect,
  contentType,
}) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('input[type="checkbox"]') ||
      (e.target as HTMLElement).closest("button")
    ) {
      return;
    }

    if (contentType === "video") {
      navigate(`/video/${item.id}`);
    } else if (contentType === "summary") {
      navigate(`/summary/${item.id}`);
    } else if (contentType === "favorite") {
      navigate(`/favorite/${item.id}`);
    }
  };

  if (viewMode === "grid") {
    return (
      <div
        className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="relative">
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-40 object-cover"
          />
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-0.5 text-xs rounded">
            {item.duration ||
              (item.originalDuration &&
                `${item.originalDuration} → ${item.readingTime}`)}
          </div>
          {"summarized" in item && item.summarized && (
            <div className="absolute top-2 left-2 bg-indigo-600 text-white px-2 py-0.5 text-xs rounded-md flex items-center">
              <FastForward size={12} className="mr-1" />
              Đã tóm tắt
            </div>
          )}
          <div
            className="absolute top-2 right-2"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              checked={isSelected}
              onChange={() => onSelect(item.id)}
            />
          </div>
        </div>

        <div className="p-3">
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 h-12">
            {item.title}
          </h3>

          <div className="flex items-center text-xs text-gray-500 mb-2">
            {contentType === "video" && item.views && (
              <>
                <span>{item.views} lượt xem</span>
                <span className="mx-1">•</span>
              </>
            )}
            <span>{formatDate(item.createdAt)}</span>
          </div>

          <div className="flex items-center justify-between">
            {contentType === "video" && item.creator && (
              <div className="flex items-center">
                <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium mr-2">
                  {item.creatorAvatar}
                </div>
                <span className="text-sm text-gray-700 truncate">
                  {item.creator}
                </span>
              </div>
            )}
            {contentType === "summary" && item.wordCount && (
              <div className="flex items-center text-xs text-gray-500">
                <span>{item.wordCount}</span>
              </div>
            )}

            <div
              className="flex items-center space-x-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="text-gray-400 hover:text-red-500">
                <Heart size={16} />
              </button>
              <button className="text-gray-400 hover:text-gray-700">
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="relative w-48 flex-shrink-0">
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-full h-28 object-cover"
        />
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-1.5 py-0.5 text-xs rounded">
          {item.duration ||
            (item.originalDuration && `${item.originalDuration}`)}
        </div>
        {"summarized" in item && item.summarized && (
          <div className="absolute top-2 left-2 bg-indigo-600 text-white px-1.5 py-0.5 text-xs rounded-md flex items-center">
            <FastForward size={10} className="mr-1" />
            Đã tóm tắt
          </div>
        )}
        <div
          className="absolute top-2 right-2"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            checked={isSelected}
            onChange={() => onSelect(item.id)}
          />
        </div>
      </div>

      <div className="p-4 flex-1">
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-1">
          {item.title}
        </h3>

        <div className="flex items-center text-xs text-gray-500 mb-2">
          {contentType === "video" && item.views && (
            <>
              <span>{item.views} lượt xem</span>
              <span className="mx-2">•</span>
            </>
          )}
          <span>{formatDate(item.createdAt)}</span>
          <span className="mx-2">•</span>
          {contentType === "video" ? (
            <span>
              {item.format}, {item.resolution}
            </span>
          ) : (
            <span>{item.format}</span>
          )}
          <span className="mx-2">•</span>
          {contentType === "summary" && item.wordCount ? (
            <span>{item.wordCount}</span>
          ) : item.size ? (
            <span>{item.size}</span>
          ) : (
            <span>--</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          {contentType === "video" && item.creator && (
            <div className="flex items-center">
              <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium mr-2">
                {item.creatorAvatar}
              </div>
              <span className="text-sm text-gray-700 truncate">
                {item.creator}
              </span>
            </div>
          )}
          {contentType === "summary" &&
            item.originalDuration &&
            item.readingTime && (
              <div className="flex items-center text-xs text-gray-600">
                <span>
                  Video gốc: {item.originalDuration} → Tóm tắt:{" "}
                  {item.readingTime}
                </span>
              </div>
            )}

          <div
            className="flex items-center space-x-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="p-1.5 text-gray-400 hover:text-gray-700 flex items-center">
              <Eye size={16} className="mr-1" />
              <span className="text-xs">Xem</span>
            </button>
            <button className="p-1.5 text-gray-400 hover:text-gray-700 flex items-center">
              <Download size={16} className="mr-1" />
              <span className="text-xs">Tải xuống</span>
            </button>
            <button className="p-1.5 text-gray-400 hover:text-gray-700 flex items-center">
              <Share size={16} className="mr-1" />
              <span className="text-xs">Chia sẻ</span>
            </button>
            <button className="p-1.5 text-gray-400 hover:text-red-500 flex items-center">
              <Trash size={16} className="mr-1" />
              <span className="text-xs">Xóa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
