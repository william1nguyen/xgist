import React, { useState, useEffect } from "react";
import {
  FileText,
  Folder,
  Heart,
  Trash,
  TrendingUp,
  Clock,
  Video,
} from "lucide-react";

import {
  VideoItem,
  SummaryItem,
  Activity,
  CategoryData,
  TabItem,
  SortOption,
} from "../types";
import { TabNavigation } from "../components/navigation/TabNavigation";
import { Button } from "../components/ui/Button";
import { Layout } from "../components/layout/Layout";
import { SearchBar } from "../components/filter/SearchBar";
import { SortingMenu } from "../components/filter/SortingMenu";
import { ViewToggle } from "../components/filter/ViewToggle";
import { VideoSkeleton } from "../components/skeleton/VideoSkeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { VideoCard } from "../components/video/VideoCard";
import { StatCard } from "../components/stats/StatCard";
import { DeleteConfirmation } from "../components/ui/DeleteConfirmation";
import { CategoryChart } from "../components/stats/CategoryChart";
import { ActivityList } from "../components/stats/ActivityList";
import { StatisticsSkeleton } from "../components/skeleton/StatisticsSkeleton";

export const LibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("my-videos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const tabs: TabItem[] = [
    { id: "my-videos", label: "Video của tôi" },
    { id: "summaries", label: "Tóm tắt" },
    { id: "favorites", label: "Yêu thích" },
    { id: "statistics", label: "Thống kê" },
  ];

  const sortOptions: SortOption[] = [
    { id: "recent", label: "Mới nhất" },
    { id: "oldest", label: "Cũ nhất" },
    { id: "title", label: "Tiêu đề A-Z" },
  ];

  useEffect(() => {
    setLoading(true);
    setSelectedItems([]);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [activeTab]);

  const handleReload = () => {
    setLoading(true);
    window.scrollTo(0, 0);
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  };

  const toggleSelectItem = (id: number) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const selectAllItems = () => {
    if (selectedItems.length === videoData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(videoData.map((item) => item.id));
    }
  };

  const handleDeleteConfirm = () => {
    console.log("Deleting items:", selectedItems);
    setShowDeleteConfirmation(false);
    setSelectedItems([]);
  };

  const handleSearch = (query: string) => {
    console.log("Searching for:", query);
  };

  const videoData: VideoItem[] = [
    {
      id: 1,
      title: "Tổng quan về Machine Learning và ứng dụng",
      thumbnail: "https://via.placeholder.com/600x340",
      duration: "15:42",
      views: "24.5K",
      likes: 1840,
      category: "technology",
      creator: "Tech Insights",
      creatorAvatar: "TI",
      createdAt: "2024-02-15",
      summarized: true,
      size: "420 MB",
      format: "MP4",
      resolution: "1080p",
    },
    {
      id: 2,
      title: "Cách tối ưu hóa công việc với AI trong cuộc sống hàng ngày",
      thumbnail: "https://via.placeholder.com/600x340",
      duration: "23:15",
      views: "18.2K",
      likes: 1350,
      category: "productivity",
      creator: "Productivity Pro",
      creatorAvatar: "PP",
      createdAt: "2024-02-18",
      summarized: true,
      size: "650 MB",
      format: "MP4",
      resolution: "1080p",
    },
    {
      id: 3,
      title: "Review chi tiết MacBook Pro M3 sau 1 tháng sử dụng",
      thumbnail: "https://via.placeholder.com/600x340",
      duration: "18:30",
      views: "32K",
      likes: 2240,
      category: "technology",
      creator: "TechReviewer",
      creatorAvatar: "TR",
      createdAt: "2024-02-10",
      summarized: false,
      size: "520 MB",
      format: "MP4",
      resolution: "1080p",
    },
    {
      id: 4,
      title: "Bí quyết đầu tư chứng khoán thành công trong thời kỳ biến động",
      thumbnail: "https://via.placeholder.com/600x340",
      duration: "28:45",
      views: "15.8K",
      likes: 1120,
      category: "finance",
      creator: "Investment Master",
      creatorAvatar: "IM",
      createdAt: "2024-02-20",
      summarized: true,
      size: "780 MB",
      format: "MP4",
      resolution: "1080p",
    },
    {
      id: 5,
      title: "Khám phá Hồ Tràm - Điểm du lịch lý tưởng cho kỳ nghỉ cuối tuần",
      thumbnail: "https://via.placeholder.com/600x340",
      duration: "12:20",
      views: "8.7K",
      likes: 780,
      category: "travel",
      creator: "Travel Explorer",
      creatorAvatar: "TE",
      createdAt: "2024-02-14",
      summarized: true,
      size: "320 MB",
      format: "MP4",
      resolution: "1080p",
    },
    {
      id: 6,
      title: "Phương pháp học tiếng Anh hiệu quả không cần đến lớp",
      thumbnail: "https://via.placeholder.com/600x340",
      duration: "21:35",
      views: "45.3K",
      likes: 3240,
      category: "education",
      creator: "English Pro",
      creatorAvatar: "EP",
      createdAt: "2024-02-05",
      summarized: true,
      size: "580 MB",
      format: "MP4",
      resolution: "1080p",
    },
  ];

  const summaryData: SummaryItem[] = [
    {
      id: 101,
      title: "Tổng quan về Machine Learning và ứng dụng",
      thumbnail: "https://via.placeholder.com/600x340",
      originalDuration: "15:42",
      readingTime: "2 phút",
      category: "technology",
      createdAt: "2024-02-15",
      wordCount: "450 từ",
      format: "Văn bản & Điểm chính",
      originalVideoId: 1,
    },
    {
      id: 102,
      title: "Cách tối ưu hóa công việc với AI trong cuộc sống hàng ngày",
      thumbnail: "https://via.placeholder.com/600x340",
      originalDuration: "23:15",
      readingTime: "3 phút",
      category: "productivity",
      createdAt: "2024-02-18",
      wordCount: "620 từ",
      format: "Văn bản & Điểm chính",
      originalVideoId: 2,
    },
    {
      id: 104,
      title: "Bí quyết đầu tư chứng khoán thành công trong thời kỳ biến động",
      thumbnail: "https://via.placeholder.com/600x340",
      originalDuration: "28:45",
      readingTime: "4 phút",
      category: "finance",
      createdAt: "2024-02-20",
      wordCount: "780 từ",
      format: "Văn bản & Điểm chính",
      originalVideoId: 4,
    },
    {
      id: 105,
      title: "Khám phá Hồ Tràm - Điểm du lịch lý tưởng cho kỳ nghỉ cuối tuần",
      thumbnail: "https://via.placeholder.com/600x340",
      originalDuration: "12:20",
      readingTime: "1.5 phút",
      category: "travel",
      createdAt: "2024-02-14",
      wordCount: "320 từ",
      format: "Văn bản & Điểm chính",
      originalVideoId: 5,
    },
    {
      id: 106,
      title: "Phương pháp học tiếng Anh hiệu quả không cần đến lớp",
      thumbnail: "https://via.placeholder.com/600x340",
      originalDuration: "21:35",
      readingTime: "3.5 phút",
      category: "education",
      createdAt: "2024-02-05",
      wordCount: "680 từ",
      format: "Văn bản & Điểm chính",
      originalVideoId: 6,
    },
  ];

  const statsData = {
    totalVideos: 24,
    totalSummaries: 18,
    totalDuration: "8.5 giờ",
    totalSavedTime: "7.2 giờ",
    uploadedThisMonth: 6,
    summarizedThisMonth: 5,
  };

  const categoryData: CategoryData[] = [
    { name: "Công nghệ", count: 10, percentage: 42 },
    { name: "Giáo dục", count: 6, percentage: 25 },
    { name: "Năng suất", count: 4, percentage: 16 },
    { name: "Tài chính", count: 2, percentage: 8 },
    { name: "Du lịch", count: 2, percentage: 8 },
  ];

  const activities: Activity[] = [
    {
      id: 1,
      title: 'Tạo tóm tắt cho "Bí quyết đầu tư chứng khoán thành công"',
      timestamp: "Hôm nay, 10:25",
      icon: <FileText size={16} />,
      iconColor: "indigo",
    },
    {
      id: 2,
      title: 'Đăng video "Khám phá Hồ Tràm - Điểm du lịch lý tưởng"',
      timestamp: "Hôm nay, 08:14",
      icon: <Video size={16} />,
      iconColor: "purple",
    },
    {
      id: 3,
      title: 'Đánh dấu yêu thích "Cách tối ưu hóa công việc với AI"',
      timestamp: "Hôm qua, 15:30",
      icon: <Heart size={16} />,
      iconColor: "green",
    },
    {
      id: 4,
      title: 'Xóa video "Kỹ thuật chụp ảnh cơ bản"',
      timestamp: "2 ngày trước",
      icon: <Trash size={16} />,
      iconColor: "red",
    },
  ];

  const getActiveData = () => {
    if (activeTab === "my-videos") {
      return videoData;
    } else if (activeTab === "summaries") {
      return summaryData;
    } else if (activeTab === "favorites") {
      return videoData.filter((_, index) => index % 2 === 0); // Just for demo
    } else {
      return [];
    }
  };

  const getSortedData = () => {
    const activeData = getActiveData();

    if (sortBy === "recent") {
      return [...activeData].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sortBy === "oldest") {
      return [...activeData].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else if (sortBy === "title") {
      return [...activeData].sort((a, b) => a.title.localeCompare(b.title));
    } else {
      return activeData;
    }
  };

  const displayData = getSortedData();

  const headerContent = (
    <TabNavigation
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId)}
    />
  );

  const getContentType = () => {
    switch (activeTab) {
      case "summaries":
        return "summary";
      case "favorites":
        return "favorite";
      default:
        return "video";
    }
  };

  const renderEmptyStateButton = () => {
    if (activeTab === "my-videos") {
      return (
        <Button variant="primary" size="md" leftIcon={<Video size={18} />}>
          Đăng video
        </Button>
      );
    } else if (activeTab === "summaries") {
      return (
        <Button variant="primary" size="md" leftIcon={<FileText size={18} />}>
          Tạo tóm tắt
        </Button>
      );
    }
    return null;
  };

  return (
    <Layout activeItem="library" title="Thư viện" headerContent={headerContent}>
      {activeTab !== "statistics" && (
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="w-full md:w-auto">
            <SearchBar
              placeholder={`Tìm kiếm ${activeTab === "my-videos" ? "video" : activeTab === "summaries" ? "tóm tắt" : "mục yêu thích"}...`}
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

            <Button variant="outline" size="sm" onClick={handleReload}>
              Tải lại
            </Button>
          </div>
        </div>
      )}

      {activeTab !== "statistics" && activeTab !== "favorites" && (
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mr-2"
              checked={
                selectedItems.length === displayData.length &&
                displayData.length > 0
              }
              onChange={selectAllItems}
              disabled={loading || displayData.length === 0}
            />
            <span className="text-sm text-gray-500">
              {selectedItems.length > 0
                ? `${selectedItems.length} mục đã chọn`
                : "Chọn tất cả"}
            </span>
          </div>

          {selectedItems.length > 0 && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedItems([])}
              >
                Bỏ chọn
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash size={14} />}
                onClick={() => setShowDeleteConfirmation(true)}
              >
                Xóa
              </Button>
            </div>
          )}
        </div>
      )}

      {(activeTab === "my-videos" ||
        activeTab === "summaries" ||
        activeTab === "favorites") && (
        <>
          {loading ? (
            <VideoSkeleton viewMode={viewMode} count={6} />
          ) : displayData.length === 0 ? (
            <EmptyState
              title="Không có nội dung"
              description={
                activeTab === "my-videos"
                  ? "Bạn chưa có video nào"
                  : activeTab === "summaries"
                    ? "Bạn chưa có tóm tắt nào"
                    : "Bạn chưa yêu thích nội dung nào"
              }
              actionButton={renderEmptyStateButton()}
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
                  key={item.id}
                  item={item}
                  viewMode={viewMode}
                  isSelected={selectedItems.includes(item.id)}
                  onSelect={toggleSelectItem}
                  contentType={getContentType()}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "statistics" && !loading && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Tổng quan thư viện
            </h3>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard
                title="Tổng số video"
                value={statsData.totalVideos}
                icon={<Video size={24} />}
                color="indigo"
                subtext={`${statsData.uploadedThisMonth} video được tải lên trong tháng này`}
                subtextIcon={<TrendingUp size={14} />}
              />

              <StatCard
                title="Số lượng tóm tắt"
                value={statsData.totalSummaries}
                icon={<FileText size={24} />}
                color="purple"
                subtext={`${statsData.summarizedThisMonth} tóm tắt được tạo trong tháng này`}
                subtextIcon={<TrendingUp size={14} />}
              />

              <StatCard
                title="Thời gian tiết kiệm"
                value={statsData.totalSavedTime}
                icon={<Clock size={24} />}
                color="green"
                subtext={`Tổng thời lượng video: ${statsData.totalDuration}`}
                subtextIcon={<Clock size={14} />}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CategoryChart data={categoryData} title="Video theo danh mục" />

              <ActivityList activities={activities} title="Hoạt động gần đây" />
            </div>
          </div>
        </div>
      )}

      {activeTab === "statistics" && loading && <StatisticsSkeleton />}

      <DeleteConfirmation
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDeleteConfirm}
        itemCount={selectedItems.length}
        itemType={activeTab === "summaries" ? "tóm tắt" : "video"}
      />
    </Layout>
  );
};
