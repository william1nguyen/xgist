import React from "react";
import { MediaCardProps } from "../../types/media";
import { MediaCardGrid } from "./MediaCardGrid";
import { MediaCardList } from "./MediaCardList";

export const MediaCard: React.FC<MediaCardProps> = (props) => {
  const { viewMode } = props;

  return viewMode === "grid" ? (
    <MediaCardGrid {...props} />
  ) : (
    <MediaCardList {...props} />
  );
};
