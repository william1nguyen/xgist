import React from "react";
import { useTranslation } from "react-i18next";
import { Film } from "lucide-react";
import { VideoSkeleton } from "../../components/skeleton/VideoSkeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Media } from "../../types/media";
import { ViewMode } from "../../types/library";
import { adaptMedia } from "../../utils/mediaAdapter";
import { MediaCard } from "../mediaCard/MediaCard";

interface LibraryContentProps {
  mediaList: Media[];
  viewMode: ViewMode;
  loading: boolean;
}

export const LibraryContent: React.FC<LibraryContentProps> = ({
  mediaList,
  viewMode,
  loading,
}) => {
  const { t } = useTranslation(["library"]);

  if (loading) {
    return <VideoSkeleton viewMode={viewMode} count={8} />;
  }

  if (mediaList.length === 0) {
    return (
      <EmptyState
        title={t("empty.title")}
        description={t("empty.description")}
        icon={<Film className="text-gray-400" size={48} />}
      />
    );
  }

  return (
    <div
      className={`
        ${
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        } text-black
          `}
    >
      {mediaList.map((media) => (
        <MediaCard
          key={media.id}
          item={adaptMedia(media)}
          viewMode={viewMode}
          contentType="media"
        />
      ))}
    </div>
  );
};
