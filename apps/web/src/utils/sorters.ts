import { SortType } from "../types/library";
import { Media } from "../types/media";

export const sortMedia = (mediaList: Media[], sortBy: SortType): Media[] => {
  const sorted = [...mediaList];

  switch (sortBy) {
    case "recent":
      return sorted.sort(
        (a, b) =>
          new Date(b.createdTime || "").getTime() -
          new Date(a.createdTime || "").getTime()
      );
    case "oldest":
      return sorted.sort(
        (a, b) =>
          new Date(a.createdTime || "").getTime() -
          new Date(b.createdTime || "").getTime()
      );
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "views":
      return sorted.sort((a, b) => b.views - a.views);
    default:
      return sorted;
  }
};
