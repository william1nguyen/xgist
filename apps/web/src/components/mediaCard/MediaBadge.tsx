import React from "react";
import { FastForward } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MediaBadgeProps {
  isSummarized: boolean;
}

export const MediaBadge: React.FC<MediaBadgeProps> = ({ isSummarized }) => {
  const { t } = useTranslation(["videos"]);

  if (!isSummarized) return null;

  return (
    <div className="absolute top-2 left-2 bg-indigo-600 text-white px-2 py-0.5 text-xs rounded-md flex items-center">
      <FastForward size={12} className="mr-1" />
      {t("card.summarized")}
    </div>
  );
};
