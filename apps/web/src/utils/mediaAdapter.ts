import { Media } from "../types/media";
import { formatDuration, formatViews, getInitials } from "./formatters";

export interface AdaptedMedia extends Media {
  formattedDuration: string;
  formattedViews: string;
  creatorName: string;
  creatorAvatar: string;
  summarized: boolean;
  createdAt: string | null;
}

export const adaptMedia = (media: Media): AdaptedMedia => ({
  ...media,
  formattedDuration: formatDuration(media.duration),
  formattedViews: formatViews(media.views),
  creatorName: media.creator?.username || "",
  creatorAvatar: getInitials(media.creator?.username || ""),
  summarized: media.isSummarized,
  createdAt: media.createdTime,
});
