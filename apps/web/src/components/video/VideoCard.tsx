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
import { VideoItem } from "../../types";

interface VideoCardProps {
  item: VideoItem & {
    formattedDuration?: string;
    formattedViews?: string;
    creatorName?: string;
    creatorAvatar?: string;
    summarized?: boolean;
    readingTime?: string;
    wordCount?: string;
    size?: string;
    format?: string;
    resolution?: string;
    originalDuration?: string;
  };
  viewMode: "grid" | "list";
  isSelected: boolean;
  onSelect: (id: string) => void;
  contentType: "video" | "summary" | "bookmark";
  onDelete?: (id: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  item,
  viewMode,
  contentType,
  onDelete,
}) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
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

    navigate(`/videos/${item.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(item.id);
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
            {item.formattedDuration ||
              (item.originalDuration &&
                `${item.originalDuration} → ${item.readingTime}`)}
          </div>
          {(item.summarized || item.isSummarized) && (
            <div className="absolute top-2 left-2 bg-indigo-600 text-white px-2 py-0.5 text-xs rounded-md flex items-center">
              <FastForward size={12} className="mr-1" />
              Đã tóm tắt
            </div>
          )}
        </div>

        <div className="p-3">
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 h-12">
            {item.title}
          </h3>

          <div className="flex items-center text-xs text-gray-500 mb-2">
            {contentType === "video" && (item.formattedViews || item.views) && (
              <>
                <span>{item.formattedViews || `${item.views} lượt xem`}</span>
                <span className="mx-1">•</span>
              </>
            )}
            <span>{formatDate(item.createdTime || item.createdTime)}</span>
          </div>

          <div className="flex items-center justify-between">
            {contentType === "video" && (item.creatorName || item.creator) && (
              <div className="flex items-center">
                <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium mr-2">
                  {item.creatorAvatar ||
                    (item.creator
                      ? item.creator.username.substring(0, 2).toUpperCase()
                      : "N/A")}
                </div>
                <span className="text-sm text-gray-700 truncate">
                  {item.creatorName ||
                    (item.creator ? item.creator.username : "N/A")}
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
              <button
                className="text-gray-400 hover:text-red-500"
                onClick={handleDelete}
                title="Xóa"
              >
                <Trash size={16} />
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
          {item.formattedDuration ||
            (item.originalDuration && `${item.originalDuration}`)}
        </div>
        {(item.summarized || item.isSummarized) && (
          <div className="absolute top-2 left-2 bg-indigo-600 text-white px-1.5 py-0.5 text-xs rounded-md flex items-center">
            <FastForward size={10} className="mr-1" />
            Đã tóm tắt
          </div>
        )}
      </div>

      <div className="p-4 flex-1">
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-1">
          {item.title}
        </h3>

        <div className="flex items-center text-xs text-gray-500 mb-2">
          {contentType === "video" && (item.formattedViews || item.views) && (
            <>
              <span>{item.formattedViews || `${item.views} lượt xem`}</span>
              <span className="mx-2">•</span>
            </>
          )}
          <span>{formatDate(item.createdTime || item.createdTime)}</span>
          <span className="mx-2">•</span>
          {contentType === "video" ? (
            <span>
              {item.format || "MP4"}, {item.resolution || "HD"}
            </span>
          ) : (
            <span>{item.format || "TXT"}</span>
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
          {contentType === "video" && (item.creatorName || item.creator) && (
            <div className="flex items-center">
              <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium mr-2">
                {item.creatorAvatar ||
                  (item.creator
                    ? item.creator.username.substring(0, 2).toUpperCase()
                    : "N/A")}
              </div>
              <span className="text-sm text-gray-700 truncate">
                {item.creatorName ||
                  (item.creator ? item.creator.username : "N/A")}
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
            <button
              className="p-1.5 text-gray-400 hover:text-red-500 flex items-center"
              onClick={handleDelete}
            >
              <Trash size={16} className="mr-1" />
              <span className="text-xs">Xóa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
