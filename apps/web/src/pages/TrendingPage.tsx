import React, { useState, useEffect } from "react";
import { TrendingUp, Clock, Activity } from "lucide-react";
import { VideoItem, SortOption } from "../types";
import { Layout } from "../components/layout/Layout";
import { SearchBar } from "../components/filter/SearchBar";
import { SortingMenu } from "../components/filter/SortingMenu";
import { ViewToggle } from "../components/filter/ViewToggle";
import { Button } from "../components/ui/Button";
import { VideoSkeleton } from "../components/skeleton/VideoSkeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { VideoCard } from "../components/video/VideoCard";

type ViewModeType = "grid" | "list";
type SortByType = "popular" | "newest" | "most-liked" | "most-viewed";
type TimeRangeType = "today" | "week" | "month" | "year";

export const TrendingPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewModeType>("grid");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<SortByType>("popular");
  const [timeRange, setTimeRange] = useState<TimeRangeType>("week");
  const [activeCategory, setActiveCategory] = useState<string>("technology");
  const [activeTab, setActiveTab] = useState<string>("trending");

  const trendingVideos: VideoItem[] = [
    {
      id: 1,
      title: "Giải pháp AI giúp tăng năng suất làm việc gấp 3 lần",
      thumbnail: "https://via.placeholder.com/600x340",
      duration: "15:42",
      views: "184.2K",
      likes: 14200,
      category: "technology",
      creator: "Tech Insights",
      creatorAvatar: "TI",
      createdAt: "2024-02-22",
      summarized: true,
      size: "420 MB",
      format: "MP4",
      resolution: "1080p",
    },
    {
      id: 2,
      title: "Top 10 điểm đến du lịch hấp dẫn nhất Việt Nam năm 2024",
      thumbnail: "https://via.placeholder.com/600x340",
      duration: "18:30",
      views: "142.8K",
      likes: 9850,
      category: "travel",
      creator: "Travel Explorer",
      creatorAvatar: "TE",
      createdAt: "2024-02-20",
      summarized: true,
      size: "520 MB",
      format: "MP4",
      resolution: "1080p",
    },
    {
      id: 3,
      title: "Bí quyết đầu tư thông minh cho người mới bắt đầu",
      thumbnail: "https://via.placeholder.com/600x340",
      duration: "22:15",
      views: "98.6K",
      likes: 7600,
      category: "finance",
      creator: "Finance Master",
      creatorAvatar: "FM",
      createdAt: "2024-02-19",
      summarized: false,
      size: "580 MB",
      format: "MP4",
      resolution: "1080p",
    },
    {
      id: 4,
      title: "Cách xây dựng thói quen học tập hiệu quả trong 21 ngày",
      thumbnail: "https://via.placeholder.com/600x340",
      duration: "12:48",
      views: "76.5K",
      likes: 5400,
      category: "education",
      creator: "Learning Pro",
      creatorAvatar: "LP",
      createdAt: "2024-02-21",
      summarized: true,
      size: "340 MB",
      format: "MP4",
      resolution: "1080p",
    },
    {
      id: 5,
      title: "Hướng dẫn sử dụng ChatGPT hiệu quả cho công việc",
      thumbnail: "https://via.placeholder.com/600x340",
      duration: "16:30",
      views: "112.3K",
      likes: 8900,
      category: "technology",
      creator: "AI Enthusiast",
      creatorAvatar: "AE",
      createdAt: "2024-02-18",
      summarized: false,
      size: "470 MB",
      format: "MP4",
      resolution: "1080p",
    },
    {
      id: 6,
      title: "Chế độ ăn uống và tập luyện tối ưu cho người bận rộn",
      thumbnail: "https://via.placeholder.com/600x340",
      duration: "20:10",
      views: "65.7K",
      likes: 4800,
      category: "health",
      creator: "Health Coach",
      creatorAvatar: "HC",
      createdAt: "2024-02-23",
      summarized: true,
      size: "550 MB",
      format: "MP4",
      resolution: "1080p",
    },
  ];

  const sortOptions: SortOption[] = [
    { id: "popular", label: "Phổ biến nhất" },
    { id: "newest", label: "Mới nhất" },
    { id: "most-liked", label: "Nhiều lượt thích" },
    { id: "most-viewed", label: "Nhiều lượt xem" },
  ];

  const timeRangeOptions: SortOption[] = [
    { id: "today", label: "Hôm nay" },
    { id: "week", label: "Tuần này" },
    { id: "month", label: "Tháng này" },
    { id: "year", label: "Năm nay" },
  ];

  const handleCategoryClick = (category: string): void => {
    setActiveCategory(category);
    console.log(`Category selected: ${category}`);
  };

  const handleTabClick = (tab: string): void => {
    setActiveTab(tab);
    console.log(`Tab selected: ${tab}`);
  };

  const handleReload = (): void => {
    setLoading(true);
    window.scrollTo(0, 0);
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  };

  const toggleSelectItem = (id: number): void => {
    setSelectedItems((prevSelectedItems) => {
      if (prevSelectedItems.includes(id)) {
        return prevSelectedItems.filter((itemId) => itemId !== id);
      } else {
        return [...prevSelectedItems, id];
      }
    });
  };

  const getSortedVideos = (): VideoItem[] => {
    let sorted = [...trendingVideos];

    // Lọc theo danh mục đang hoạt động
    if (activeCategory) {
      sorted = sorted.filter((video) => video.category === activeCategory);
    }

    // Sắp xếp theo tiêu chí đã chọn
    switch (sortBy) {
      case "popular":
        return sorted.sort(
          (a, b) =>
            parseInt(b.views?.replace(/[^\d]/g, "") || "0") -
            parseInt(a.views?.replace(/[^\d]/g, "") || "0")
        );
      case "newest":
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "most-liked":
        return sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      case "most-viewed":
        return sorted.sort(
          (a, b) =>
            parseInt(b.views?.replace(/[^\d]/g, "") || "0") -
            parseInt(a.views?.replace(/[^\d]/g, "") || "0")
        );
      default:
        return sorted;
    }
  };

  const handleSearch = (query: string): void => {
    console.log("Searching for:", query);
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const sortedVideos = getSortedVideos();

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
        Xu hướng
      </button>
      <button
        className={`px-4 py-2 text-sm font-medium ${
          activeTab === "popular"
            ? "text-indigo-600 border-b-2 border-indigo-600"
            : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
        }`}
        onClick={() => handleTabClick("popular")}
      >
        Đang thịnh hành
      </button>
    </div>
  );

  return (
    <Layout
      activeItem="trending"
      title="Xu hướng"
      headerContent={headerContent}
    >
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="w-full md:w-auto">
          <SearchBar
            placeholder="Tìm kiếm xu hướng..."
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

          <Button onClick={handleReload} variant="outline" size="sm">
            Tải lại
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="text-indigo-600" size={18} />
          <h2 className="text-lg font-semibold text-slate-900">
            Danh mục thịnh hành
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeCategory === "technology" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleCategoryClick("technology")}
          >
            Công nghệ
          </Button>
          <Button
            variant={activeCategory === "travel" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleCategoryClick("travel")}
          >
            Du lịch
          </Button>
          <Button
            variant={activeCategory === "finance" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleCategoryClick("finance")}
          >
            Tài chính
          </Button>
          <Button
            variant={activeCategory === "education" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleCategoryClick("education")}
          >
            Giáo dục
          </Button>
          <Button
            variant={activeCategory === "health" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleCategoryClick("health")}
          >
            Sức khỏe
          </Button>
        </div>
      </div>

      {activeTab === "trending" && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="text-indigo-600" size={18} />
              <h2 className="text-lg font-semibold text-slate-900">
                Video thịnh hành{" "}
                {timeRangeOptions
                  .find((opt) => opt.id === timeRange)
                  ?.label.toLowerCase()}
              </h2>
            </div>
          </div>

          {loading ? (
            <VideoSkeleton viewMode={viewMode} count={6} />
          ) : sortedVideos.length === 0 ? (
            <EmptyState
              title="Không tìm thấy nội dung xu hướng"
              description="Hiện không có nội dung xu hướng nào trong thời gian đã chọn."
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
                  item={video}
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
                Đang lên xu hướng
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
                  item={video}
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
                Đang thịnh hành{" "}
                {timeRangeOptions
                  .find((opt) => opt.id === timeRange)
                  ?.label.toLowerCase()}
              </h2>
            </div>
          </div>

          {loading ? (
            <VideoSkeleton viewMode={viewMode} count={6} />
          ) : sortedVideos.length === 0 ? (
            <EmptyState
              title="Không tìm thấy nội dung thịnh hành"
              description="Hiện không có nội dung thịnh hành nào trong thời gian đã chọn."
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
                  item={video}
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
