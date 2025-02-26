import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Clock,
  Edit,
  Eye,
  ThumbsUp,
  Trash2,
  Upload,
  Database,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { VideoItem } from "../types";
import { Button } from "../components/ui/Button";
import { ViewToggle } from "../components/filter/ViewToggle";
import { VideoSkeleton } from "../components/skeleton/VideoSkeleton";
import { VideoCard } from "../components/video/VideoCard";
import { Layout } from "../components/layout/Layout";

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"uploads" | "statistics">(
    "uploads"
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<"date" | "views" | "likes">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [activeTab]);

  const toggleSelectItem = (id: number) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const videos: VideoItem[] = [
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
  ];

  const totalViews = videos.reduce((sum, video) => {
    return sum + parseInt(video.views?.replace(/[^\d]/g, "") || "0");
  }, 0);

  const totalLikes = videos.reduce((sum, video) => {
    return sum + (video.likes || 0);
  }, 0);

  const totalDuration = videos.reduce((sum, video) => {
    const [mins, secs] = video.duration
      ? video.duration.split(":").map(Number)
      : [0, 0];
    return sum + mins * 60 + secs;
  }, 0);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const sortedVideos = [...videos].sort((a, b) => {
    let comparison = 0;

    if (sortBy === "views") {
      comparison =
        parseInt(b.views?.replace(/[^\d]/g, "") || "0") -
        parseInt(a.views?.replace(/[^\d]/g, "") || "0");
    } else if (sortBy === "likes") {
      comparison = (b.likes || 0) - (a.likes || 0);
    } else {
      comparison =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    return sortOrder === "asc" ? -comparison : comparison;
  });

  const categoryStats = videos.reduce(
    (acc, video) => {
      acc[video.category] = (acc[video.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const mostPopularVideo = [...videos].sort((a, b) => {
    return (
      parseInt(b.views?.replace(/[^\d]/g, "") || "0") -
      parseInt(a.views?.replace(/[^\d]/g, "") || "0")
    );
  })[0];

  return (
    <Layout activeItem="settings" title="Cài đặt">
      <div className="max-w-7xl mx-auto">
        {/* Settings header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Quản lý video của bạn
          </h1>
          <p className="text-gray-600">
            Xem và quản lý các video bạn đã đăng, kiểm tra số liệu thống kê và
            hiệu suất
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "uploads"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
            onClick={() => setActiveTab("uploads")}
          >
            <Upload size={16} className="inline mr-2" />
            Video đã đăng
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "statistics"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
            onClick={() => setActiveTab("statistics")}
          >
            <BarChart3 size={16} className="inline mr-2" />
            Thống kê
          </button>
        </div>

        {activeTab === "uploads" ? (
          <>
            {/* Video uploads tab */}
            <div className="flex flex-wrap items-center justify-between mb-6">
              <div className="mb-4 sm:mb-0">
                <h2 className="text-lg font-medium text-gray-800">
                  Video của bạn ({videos.length})
                </h2>
                <p className="text-sm text-gray-500">
                  Quản lý các video bạn đã đăng lên hệ thống
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center border rounded-md overflow-hidden">
                  <button
                    className={`px-3 py-1.5 text-sm ${
                      sortBy === "date" ? "bg-gray-100" : "bg-white"
                    }`}
                    onClick={() => setSortBy("date")}
                  >
                    Ngày
                  </button>
                  <button
                    className={`px-3 py-1.5 text-sm ${
                      sortBy === "views" ? "bg-gray-100" : "bg-white"
                    }`}
                    onClick={() => setSortBy("views")}
                  >
                    Lượt xem
                  </button>
                  <button
                    className={`px-3 py-1.5 text-sm ${
                      sortBy === "likes" ? "bg-gray-100" : "bg-white"
                    }`}
                    onClick={() => setSortBy("likes")}
                  >
                    Lượt thích
                  </button>
                </div>

                <button
                  className="p-2 border rounded-md"
                  onClick={toggleSortOrder}
                >
                  {sortOrder === "desc" ? (
                    <ArrowDown size={16} />
                  ) : (
                    <ArrowUp size={16} />
                  )}
                </button>

                <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
              </div>
            </div>

            {loading ? (
              <VideoSkeleton viewMode={viewMode} count={4} />
            ) : (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
                    {sortedVideos.map((video) => (
                      <div key={video.id} className="relative group">
                        <VideoCard
                          item={video}
                          viewMode="grid"
                          isSelected={selectedItems.includes(video.id)}
                          onSelect={toggleSelectItem}
                          contentType="video"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex space-x-2">
                            <button className="p-2 bg-white rounded-full hover:bg-gray-100">
                              <Edit size={16} className="text-gray-600" />
                            </button>
                            <button className="p-2 bg-white rounded-full hover:bg-gray-100">
                              <Trash2 size={16} className="text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 mb-6">
                    {sortedVideos.map((video) => (
                      <div key={video.id} className="relative group">
                        <VideoCard
                          item={video}
                          viewMode="list"
                          isSelected={selectedItems.includes(video.id)}
                          onSelect={toggleSelectItem}
                          contentType="video"
                        />
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 bg-white rounded-full shadow hover:bg-gray-100">
                            <Edit size={16} className="text-gray-600" />
                          </button>
                          <button className="p-2 bg-white rounded-full shadow hover:bg-gray-100">
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="mt-4 flex justify-center">
              <Button variant="primary" leftIcon={<Upload size={16} />}>
                Đăng video mới
              </Button>
            </div>
          </>
        ) : (
          <>
            {loading ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {[1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg shadow-sm p-6 animate-pulse"
                    >
                      <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
                      <div className="h-8 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-40 bg-gray-200 rounded mb-4"></div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="flex items-center space-x-4">
                      <div className="h-24 w-24 bg-gray-200 rounded"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center mb-2">
                      <Eye className="text-indigo-500 mr-2" size={20} />
                      <span className="text-gray-500 text-sm">
                        Tổng lượt xem
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      {totalViews.toLocaleString()}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Từ {videos.length} video đã đăng
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center mb-2">
                      <ThumbsUp className="text-indigo-500 mr-2" size={20} />
                      <span className="text-gray-500 text-sm">
                        Tổng lượt thích
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      {totalLikes.toLocaleString()}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Trung bình{" "}
                      {Math.round(totalLikes / videos.length).toLocaleString()}{" "}
                      mỗi video
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center mb-2">
                      <Clock className="text-indigo-500 mr-2" size={20} />
                      <span className="text-gray-500 text-sm">
                        Tổng thời lượng
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      {formatDuration(totalDuration)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Trung bình{" "}
                      {formatDuration(
                        Math.round(totalDuration / videos.length)
                      )}{" "}
                      mỗi video
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">
                      Phân bổ theo danh mục
                    </h3>
                    <div className="h-64 flex items-end space-x-6">
                      {Object.entries(categoryStats).map(
                        ([category, count]) => (
                          <div
                            key={category}
                            className="flex flex-col items-center flex-1"
                          >
                            <div
                              className="w-full bg-indigo-500 rounded-t-md"
                              style={{
                                height: `${(count / videos.length) * 200}px`,
                                background:
                                  category === "technology"
                                    ? "#4f46e5"
                                    : category === "productivity"
                                      ? "#8b5cf6"
                                      : category === "finance"
                                        ? "#10b981"
                                        : "#f59e0b",
                              }}
                            ></div>
                            <div className="mt-2 text-xs text-center">
                              <div className="font-medium">
                                {category === "technology"
                                  ? "Công nghệ"
                                  : category === "productivity"
                                    ? "Năng suất"
                                    : category === "finance"
                                      ? "Tài chính"
                                      : category === "travel"
                                        ? "Du lịch"
                                        : category}
                              </div>
                              <div className="text-gray-500">{count} video</div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">
                      Video phổ biến nhất
                    </h3>
                    {mostPopularVideo && (
                      <div className="flex items-start space-x-4">
                        <div className="relative flex-shrink-0">
                          <img
                            src={mostPopularVideo.thumbnail}
                            alt={mostPopularVideo.title}
                            className="w-24 h-24 object-cover rounded-md"
                          />
                          <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                            {mostPopularVideo.duration}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium line-clamp-2">
                            {mostPopularVideo.title}
                          </h4>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Eye size={14} className="mr-1" />
                            {mostPopularVideo.views} lượt xem
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <ThumbsUp size={14} className="mr-1" />
                            {mostPopularVideo.likes} lượt thích
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            leftIcon={<Edit size={14} />}
                          >
                            Chỉnh sửa
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">
                      Thông tin kho lưu trữ
                    </h3>
                    <div className="flex items-center mb-4">
                      <Database size={18} className="text-indigo-500 mr-2" />
                      <span className="text-gray-600">
                        Dung lượng đã sử dụng
                      </span>
                    </div>

                    <div className="mb-4">
                      <div className="h-3 bg-gray-200 rounded-full mb-2">
                        <div
                          className="h-3 bg-indigo-500 rounded-full"
                          style={{ width: "65%" }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">2.37 GB / 5 GB</span>
                        <span className="text-indigo-500">65%</span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Số lượng video</span>
                        <span className="font-medium">{videos.length}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Đã tóm tắt</span>
                        <span className="font-medium">
                          {videos.filter((v) => v.summarized).length} video
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Chưa tóm tắt</span>
                        <span className="font-medium">
                          {videos.filter((v) => !v.summarized).length} video
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">
                      Hoạt động gần đây
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="bg-green-100 p-2 rounded-full mr-3">
                          <Upload size={16} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            Đã đăng video mới
                          </p>
                          <p className="text-xs text-gray-500">
                            Cách đây 2 ngày
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Bí quyết đầu tư chứng khoán thành công...
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="bg-indigo-100 p-2 rounded-full mr-3">
                          <Edit size={16} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            Đã chỉnh sửa video
                          </p>
                          <p className="text-xs text-gray-500">
                            Cách đây 4 ngày
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Cách tối ưu hóa công việc với AI...
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="bg-orange-100 p-2 rounded-full mr-3">
                          <Eye size={16} className="text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            Đạt 1000 lượt xem
                          </p>
                          <p className="text-xs text-gray-500">
                            Cách đây 1 tuần
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Tổng quan về Machine Learning và ứng dụng
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};
