import React, { useState, useEffect } from "react";
import { TrendingUp, Clock, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { VideoItem, SortOption } from "../types";
import { Layout } from "../components/layout/Layout";
import { SearchBar } from "../components/filter/SearchBar";
import { SortingMenu } from "../components/filter/SortingMenu";
import { ViewToggle } from "../components/filter/ViewToggle";
import { Button } from "../components/ui/Button";
import { VideoSkeleton } from "../components/skeleton/VideoSkeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { VideoCard } from "../components/video/VideoCard";
import { httpClient } from "../config/httpClient";

type ViewModeType = "grid" | "list";
type SortByType = "popular" | "newest" | "most-liked" | "most-viewed";
type TimeRangeType = "today" | "week" | "month" | "year";

export const TrendingPage: React.FC = () => {
  const { t } = useTranslation(["common", "trending"]);

  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewModeType>("grid");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortByType>("popular");
  const [timeRange, setTimeRange] = useState<TimeRangeType>("week");
  const [activeCategory, setActiveCategory] = useState<string>("technology");
  const [activeTab, setActiveTab] = useState<string>("trending");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const BASE_URL = import.meta.env.VITE_BASE_URL;

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        size: 20,
        page: 1,
      };

      if (searchQuery) {
        params.q = searchQuery;
      }

      const response = await httpClient.get(`${BASE_URL}/v1/videos`, {
        params,
      });

      if (response.data.data.videos) {
        setVideos(response.data.data.videos);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching trending videos:", err);
      setVideos([]);
      setError(t("trending:errors.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [activeCategory, sortBy, timeRange, activeTab]);

  const handleReload = (): void => {
    fetchVideos();
    window.scrollTo(0, 0);
  };

  const toggleSelectItem = (id: string): void => {
    setSelectedItems((prevSelectedItems) => {
      if (prevSelectedItems.includes(id)) {
        return prevSelectedItems.filter((itemId) => itemId !== id);
      } else {
        return [...prevSelectedItems, id];
      }
    });
  };

  const sortOptions: SortOption[] = [
    { id: "popular", label: t("trending:sorting.popular") },
    { id: "newest", label: t("trending:sorting.newest") },
    { id: "most-liked", label: t("trending:sorting.most_liked") },
    { id: "most-viewed", label: t("trending:sorting.most_viewed") },
  ];

  const timeRangeOptions: SortOption[] = [
    { id: "today", label: t("trending:time_range.today") },
    { id: "week", label: t("trending:time_range.week") },
    { id: "month", label: t("trending:time_range.month") },
    { id: "year", label: t("trending:time_range.year") },
  ];

  const handleCategoryClick = (category: string): void => {
    setActiveCategory(category);
  };

  const handleTabClick = (tab: string): void => {
    setActiveTab(tab);
  };

  const getSortedVideos = (): VideoItem[] => {
    let sorted = [...videos];

    if (activeCategory && activeCategory !== "all") {
      sorted = sorted.filter((video) => video.category === activeCategory);
    }

    switch (sortBy) {
      case "popular":
        return sorted.sort((a, b) => b.views - a.views);
      case "newest":
        return sorted.sort(
          (a, b) =>
            new Date(b.createdTime || 0).getTime() -
            new Date(a.createdTime || 0).getTime()
        );
      case "most-liked":
        return sorted.sort((a, b) => b.likes - a.likes);
      case "most-viewed":
        return sorted.sort((a, b) => b.views - a.views);
      default:
        return sorted;
    }
  };

  const handleSearch = (query: string): void => {
    setSearchQuery(query);
    fetchVideos();
  };

  const sortedVideos = getSortedVideos();

  const formatDuration = (durationInSeconds: number): string => {
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatViews = (viewCount: number): string => {
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
      creatorName: video.creator.username,
      creatorAvatar: video.creator.username.substring(0, 2).toUpperCase(),
      summarized: video.isSummarized,
      createdAt: video.createdTime,
    };
  };

  const headerContent = (
    <div className="flex space-x-4">
      <button
        className={`px-4 py-2 text-sm font-medium ${
          activeTab === "trending"
            ? "text-indigo-600 border-b-2 border-indigo-600"
            : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
        }`}
        onClick={() => handleTabClick("trending")}
      >
        {t("trending:tabs.trending")}
      </button>
      <button
        className={`px-4 py-2 text-sm font-medium ${
          activeTab === "popular"
            ? "text-indigo-600 border-b-2 border-indigo-600"
            : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
        }`}
        onClick={() => handleTabClick("popular")}
      >
        {t("trending:tabs.popular")}
      </button>
    </div>
  );

  return (
    <Layout
      activeItem="trending"
      title={t("trending:title")}
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
            placeholder={t("trending:search.placeholder")}
            onSearch={handleSearch}
            fullWidth={true}
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <SortingMenu
            options={timeRangeOptions}
            selectedOption={timeRange}
            onSelect={(optionId: string) =>
              setTimeRange(optionId as TimeRangeType)
            }
          />

          <SortingMenu
            options={sortOptions}
            selectedOption={sortBy}
            onSelect={(optionId: string) => setSortBy(optionId as SortByType)}
          />

          <ViewToggle
            viewMode={viewMode}
            onViewChange={(mode) => setViewMode(mode as ViewModeType)}
          />

          <Button
            onClick={handleReload}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            {loading
              ? t("trending:buttons.loading")
              : t("trending:buttons.reload")}
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="text-indigo-600" size={18} />
          <h2 className="text-lg font-semibold text-slate-900">
            {t("trending:categories.title")}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeCategory === "all" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleCategoryClick("all")}
          >
            {t("trending:categories.all")}
          </Button>
          <Button
            variant={activeCategory === "technology" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleCategoryClick("technology")}
          >
            {t("trending:categories.technology")}
          </Button>
          <Button
            variant={activeCategory === "travel" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleCategoryClick("travel")}
          >
            {t("trending:categories.travel")}
          </Button>
          <Button
            variant={activeCategory === "finance" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleCategoryClick("finance")}
          >
            {t("trending:categories.finance")}
          </Button>
          <Button
            variant={activeCategory === "education" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleCategoryClick("education")}
          >
            {t("trending:categories.education")}
          </Button>
          <Button
            variant={activeCategory === "health" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleCategoryClick("health")}
          >
            {t("trending:categories.health")}
          </Button>
          <Button
            variant={activeCategory === "productivity" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleCategoryClick("productivity")}
          >
            {t("trending:categories.productivity")}
          </Button>
        </div>
      </div>

      {activeTab === "trending" && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="text-indigo-600" size={18} />
              <h2 className="text-lg font-semibold text-slate-900">
                {t("trending:sections.trending_videos", {
                  time: timeRangeOptions
                    .find((opt) => opt.id === timeRange)
                    ?.label.toLowerCase(),
                })}
              </h2>
            </div>
          </div>

          {loading ? (
            <VideoSkeleton viewMode={viewMode} count={6} />
          ) : sortedVideos.length === 0 ? (
            <EmptyState
              title={t("trending:empty.trending_title")}
              description={t("trending:empty.trending_description")}
              icon={<TrendingUp className="text-gray-400" size={28} />}
            />
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {sortedVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  item={adaptVideoForComponent(video)}
                  viewMode={viewMode}
                  isSelected={selectedItems.includes(video.id)}
                  onSelect={() => toggleSelectItem(video.id)}
                  contentType="video"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "trending" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Clock className="text-indigo-600" size={18} />
              <h2 className="text-lg font-semibold text-slate-900">
                {t("trending:sections.rising")}
              </h2>
            </div>
          </div>

          {loading ? (
            <VideoSkeleton viewMode={viewMode} count={3} />
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {sortedVideos.slice(0, 3).map((video) => (
                <VideoCard
                  key={video.id}
                  item={adaptVideoForComponent(video)}
                  viewMode={viewMode}
                  isSelected={selectedItems.includes(video.id)}
                  onSelect={() => toggleSelectItem(video.id)}
                  contentType="video"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "popular" && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="text-indigo-600" size={18} />
              <h2 className="text-lg font-semibold text-slate-900">
                {t("trending:sections.popular_videos", {
                  time: timeRangeOptions
                    .find((opt) => opt.id === timeRange)
                    ?.label.toLowerCase(),
                })}
              </h2>
            </div>
          </div>

          {loading ? (
            <VideoSkeleton viewMode={viewMode} count={6} />
          ) : sortedVideos.length === 0 ? (
            <EmptyState
              title={t("trending:empty.popular_title")}
              description={t("trending:empty.popular_description")}
              icon={<Activity className="text-gray-400" size={28} />}
            />
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {sortedVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  item={adaptVideoForComponent(video)}
                  viewMode={viewMode}
                  isSelected={selectedItems.includes(video.id)}
                  onSelect={() => toggleSelectItem(video.id)}
                  contentType="video"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};
