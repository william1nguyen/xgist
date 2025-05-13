import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MediaBadge } from "./MediaBadge";
import { MediaCreator } from "./MediaCreator";
import { MediaCardProps } from "../../types/media";
import { formatDate, formatViewCount } from "../../utils/mediaFormatters";

export const MediaCardGrid: React.FC<MediaCardProps> = ({
  item,
  contentType,
}) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["videos"]);

  const handleClick = () => navigate(`/media/${item.id}`);

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative">
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-full h-40 object-cover"
        />
        <MediaBadge isSummarized={item.isSummarized} />
      </div>

      <div className="p-3">
        <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 h-12">
          {item.title}
        </h3>

        <div className="flex items-center text-xs text-gray-500 mb-2">
          {item.views > 0 && (
            <>
              <span>{formatViewCount(item.views, t)}</span>
              <span className="mx-1">•</span>
            </>
          )}
          <span>{formatDate(item.createdTime, i18n.language)}</span>
        </div>

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
      </div>
    </div>
  );
};
