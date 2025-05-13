export const formatDate = (
  dateString: string | null | undefined,
  locale: string
): string => {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  const localeCode = locale === "vi" ? "vi-VN" : "en-US";

  return date.toLocaleDateString(localeCode, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatViewCount = (views: number | undefined, t: any): string => {
  if (!views) return "";

  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }

  return t("videos:card.viewCount", { count: views });
};

export const getMediaTypeLabel = (url: string): string => {
  const extension = url.split(".").pop()?.toLowerCase();

  const videoExtensions = ["mp4", "avi", "mov", "mkv", "webm"];
  const audioExtensions = ["mp3", "wav", "flac", "aac", "m4a"];

  if (videoExtensions.includes(extension || "")) return "Video";
  if (audioExtensions.includes(extension || "")) return "Audio";

  return "Media";
};

export const getMediaFormat = (url: string): string => {
  const extension = url.split(".").pop()?.toUpperCase();
  return extension || "Unknown";
};
