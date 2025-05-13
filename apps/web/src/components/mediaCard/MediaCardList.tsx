import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MediaBadge } from "./MediaBadge";
import { MediaCreator } from "./MediaCreator";
import {
  formatDate,
  formatViewCount,
  getMediaFormat,
  getMediaTypeLabel,
} from "../../utils/mediaFormatters";
import { MediaCardProps } from "../../types/media";
import { MediaActions } from "./MediaAction";

export const MediaCardList: React.FC<MediaCardProps> = ({
  item,
  contentType,
  onDelete,
}) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["videos"]);

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    navigate(`/media/${item.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(item.id);
  };

  return (
    <div
      className="flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative w-48 flex-shrink-0">
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-full h-28 object-cover"
        />
        <MediaBadge isSummarized={item.isSummarized} />
      </div>

      <div className="p-4 flex-1">
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-1">
          {item.title}
        </h3>

        <div className="flex items-center text-xs text-gray-500 mb-2">
          {item.views > 0 && (
            <>
              <span>{formatViewCount(item.views, t)}</span>
              <span className="mx-2">•</span>
            </>
          )}
          <span>{formatDate(item.createdTime, i18n.language)}</span>
          <span className="mx-2">•</span>
          <span>{getMediaTypeLabel(item.url)}</span>
          <span className="mx-2">•</span>
          <span>{getMediaFormat(item.url)}</span>
          {item.duration && (
            <>
              <span className="mx-2">•</span>
              <span>{item.formattedDuration}</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between">
          {contentType === "media" && (
            <MediaCreator
              avatar={
                item.creatorAvatar ||
                item.creator?.username?.substring(0, 2).toUpperCase() ||
                ""
              }
              name={item.creatorName || item.creator?.username || ""}
            />
          )}

          <MediaActions
            onEdit={() => navigate(`/media/${item.id}`)}
            onCreateAIPresenter={() =>
              navigate(`/media/${item.id}/create-presenter`)
            }
            onDelete={() => handleDelete(new MouseEvent("click") as any)}
          />
        </div>
      </div>
    </div>
  );
};
