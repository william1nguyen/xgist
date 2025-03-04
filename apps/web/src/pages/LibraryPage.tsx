import React, { useState, useEffect } from "react";
import { Folder } from "lucide-react";

import { VideoItem, TabItem, SortOption } from "../types";
import { TabNavigation } from "../components/navigation/TabNavigation";
import { Button } from "../components/ui/Button";
import { Layout } from "../components/layout/Layout";
import { SearchBar } from "../components/filter/SearchBar";
import { SortingMenu } from "../components/filter/SortingMenu";
import { ViewToggle } from "../components/filter/ViewToggle";
import { VideoSkeleton } from "../components/skeleton/VideoSkeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { VideoCard } from "../components/video/VideoCard";
import { env } from "../config/env";
import { useKeycloakAuth } from "../hooks/useKeycloakAuth";
import { httpClient } from "../config/httpClient";

interface BookmarkItem {
  video: VideoItem;
}

export const LibraryPage: React.FC = () => {
  const [activeTab] = useState("bookmarks");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user } = useKeycloakAuth();

  const tabs: TabItem[] = [{ id: "bookmarks", label: "Đã lưu" }];

  const sortOptions: SortOption[] = [
    { id: "recent", label: "Mới nhất" },
    { id: "oldest", label: "Cũ nhất" },
    { id: "title", label: "Tiêu đề A-Z" },
  ];

  useEffect(() => {
    setLoading(true);
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);

      const params: Record<string, any> = {
        page: 1,
        size: 20,
        q: searchQuery,
      };

      const response = await httpClient.get(
        `${env.VITE_BASE_URL}/v1/videos/bookmarks`,
        {
          params,
          headers: {
            Authorization: `Bearer ${user?.access_token}`,
          },
        }
      );
      setBookmarks(response.data.data.videos);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching bookmarks:", err);
      setError("Không thể tải danh sách đã lưu. Vui lòng thử lại sau.");
      setLoading(false);
    }
  };

  const handleReload = () => {
    setLoading(true);
    window.scrollTo(0, 0);
    fetchBookmarks();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    fetchBookmarks();
  };

  const getSortedData = () => {
    if (sortBy === "recent") {
      return [...bookmarks].sort(
        (a, b) =>
          new Date(b.video.createdTime || "").getTime() -
          new Date(a.video.createdTime || "").getTime()
      );
    } else if (sortBy === "oldest") {
      return [...bookmarks].sort(
        (a, b) =>
          new Date(a.video.createdTime || "").getTime() -
          new Date(b.video.createdTime || "").getTime()
      );
    } else if (sortBy === "title") {
      return [...bookmarks].sort((a, b) =>
        a.video.title.localeCompare(b.video.title)
      );
    } else {
      return bookmarks;
    }
  };

  const formatDuration = (durationInSeconds: number): string => {
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatViews = (viewCount: number): string => {
    if (viewCount === undefined || viewCount === null) {
      return "0";
    }

    if (viewCount >= 1000000) {
      return (viewCount / 1000000).toFixed(1) + "M";
    } else if (viewCount >= 1000) {
      return (viewCount / 1000).toFixed(1) + "K";
    }
    return viewCount.toString();
  };

  const adaptVideoForComponent = (video: VideoItem) => {
    return {
      ...video,
      formattedDuration: formatDuration(video.duration),
      formattedViews: formatViews(video.views),
      creatorName: video.creator?.username || "",
      creatorAvatar:
        video.creator?.username?.substring(0, 2).toUpperCase() || "",
      summarized: video.isSummarized,
      createdAt: video.createdTime,
    };
  };

  const displayData = getSortedData();

  const headerContent = (
    <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={() => {}} />
  );

  return (
    <Layout
      activeItem="library"
      title="Thư viện - Đã lưu"
      headerContent={headerContent}
    >
      {error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="w-full md:w-auto">
          <SearchBar
            placeholder="Tìm kiếm trong danh sách đã lưu..."
            onSearch={handleSearch}
            fullWidth={true}
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <SortingMenu
            options={sortOptions}
            selectedOption={sortBy}
            onSelect={setSortBy}
          />

          <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />

          <Button
            variant="outline"
            size="sm"
            onClick={handleReload}
            disabled={loading}
          >
            {loading ? "Đang tải..." : "Tải lại"}
          </Button>
        </div>
      </div>

      {loading ? (
        <VideoSkeleton viewMode={viewMode} count={6} />
      ) : displayData.length === 0 ? (
        <EmptyState
          title="Chưa có nội dung nào được lưu"
          description="Bạn chưa lưu nội dung nào"
          icon={<Folder className="text-gray-400" size={28} />}
        />
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
          }
        >
          {displayData.map((item) => (
            <VideoCard
              key={item.video.id}
              item={adaptVideoForComponent(item.video)}
              viewMode={viewMode}
              isSelected={false}
              onSelect={() => {}}
              contentType="bookmark"
            />
          ))}
        </div>
      )}
    </Layout>
  );
};
