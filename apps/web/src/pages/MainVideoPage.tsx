import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Plus, TrendingUp, FastForward } from "lucide-react";
import { VideoItem, SortOption, ApiResponse, VideosResponse } from "../types";
import { Button } from "../components/ui/Button";
import { SortingMenu } from "../components/filter/SortingMenu";
import { ViewToggle } from "../components/filter/ViewToggle";
import { VideoSkeleton } from "../components/skeleton/VideoSkeleton";
import { VideoCard } from "../components/video/VideoCard";
import { Layout } from "../components/layout/Layout";
import { httpClient } from "../config/httpClient";

export const MainVideoPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [size, setSize] = useState<number>(8);
  const [total, setTotal] = useState<number>(0);

  const BASE_URL = import.meta.env.VITE_BASE_URL;

  const fetchVideos = async (pageNum = 1, pageSize = 20, query?: string) => {
    setLoading(true);
    try {
      const response = await httpClient.get<ApiResponse<VideosResponse>>(
        `${BASE_URL}/v1/videos`,
        {
          params: {
            page: pageNum,
            size: pageSize,
            q: query || undefined,
          },
        }
      );

      setVideos(response.data.data.videos);

      if (response.data.metadata) {
        setTotal(response.data.metadata.total);
        setPage(response.data.metadata.page);
        setSize(response.data.metadata.size);
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching videos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleReload = () => {
    fetchVideos(1, size);
    window.scrollTo(0, 0);
  };

  const toggleSelectItem = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleSummarizeClick = () => {
    navigate("/summarize");
  };

  const handleViewGuideClick = () => {
    navigate("/guide");
  };

  const handleUploadClick = () => {
    navigate("/upload");
  };

  const handleGetStartedClick = () => {
    navigate("/summarize");
  };

  const categories = [
    { id: "all", label: "Tất cả" },
    { id: "technology", label: "Công nghệ" },
    { id: "education", label: "Giáo dục" },
    { id: "productivity", label: "Năng suất" },
    { id: "finance", label: "Tài chính" },
    { id: "travel", label: "Du lịch" },
    { id: "health", label: "Sức khỏe" },
  ];

  const filteredVideos =
    activeCategory === "all"
      ? videos
      : videos.filter((video) => video.category === activeCategory);

  const sortOptions: SortOption[] = [
    { id: "recent", label: "Mới nhất" },
    { id: "popular", label: "Phổ biến nhất" },
    { id: "trending", label: "Xu hướng" },
  ];

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    if (sortBy === "popular") {
      return b.views - a.views;
    } else if (sortBy === "trending") {
      return b.likes - a.likes;
    }
    return (
      new Date(b.createdTime || 0).getTime() -
      new Date(a.createdTime || 0).getTime()
    );
  });

  const loadMoreVideos = async () => {
    if (page * size >= total) return;

    try {
      setLoading(true);
      const nextPage = page + 1;

      const response = await httpClient.get(`${BASE_URL}/v1/videos`, {
        params: {
          page: nextPage,
          size: size,
        },
      });

      if (response.data.data.videos && response.data.data.videos.length > 0) {
        setVideos([...videos, ...response.data.data.videos]);

        if (response.data.metadata) {
          setPage(response.data.metadata.page);
        }
      }
    } catch (err) {
      console.error("Error loading more videos:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (durationInSeconds: number): string => {
    const minutes = Math.floor(durationInSeconds / 1000 / 60);
    return `${minutes}m`;
  };

  const formatViews = (viewCount: number): string => {
    if (viewCount >= 1000) {
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
    };
  };

  return (
    <Layout activeItem="explore" title="Khám phá">
      <>
        {error && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
            <p>{error}</p>
          </div>
        )}

        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white py-12 px-6 -mx-8 -mt-8 mb-8">
          <div className="max-w-7xl mx-auto">
            <div className="md:flex items-center justify-between">
              {loading ? (
                <>
                  <div className="md:w-1/2 mb-8 md:mb-0">
                    <div className="h-10 bg-indigo-800 bg-opacity-40 rounded-md w-3/4 mb-4 animate-pulse"></div>
                    <div className="h-6 bg-indigo-800 bg-opacity-40 rounded w-full mb-3 animate-pulse"></div>
                    <div className="h-6 bg-indigo-800 bg-opacity-40 rounded w-5/6 mb-6 animate-pulse"></div>
                    <div className="flex flex-wrap gap-3">
                      <div className="h-10 bg-indigo-800 bg-opacity-40 rounded-full w-40 animate-pulse"></div>
                      <div className="h-10 bg-indigo-800 bg-opacity-40 rounded-full w-40 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="md:w-1/2 flex justify-end">
                    <div className="bg-indigo-800 bg-opacity-50 rounded-lg p-6 max-w-md w-full animate-pulse">
                      <div className="flex items-center mb-4">
                        <div className="bg-indigo-700 h-10 w-10 rounded-full"></div>
                        <div className="ml-3 w-full">
                          <div className="h-4 bg-indigo-700 rounded mb-2"></div>
                          <div className="h-3 bg-indigo-700 rounded w-1/2"></div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-indigo-700 p-3 rounded"></div>
                        <div className="bg-indigo-700 p-3 rounded"></div>
                        <div className="bg-indigo-700 p-3 rounded"></div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="md:w-1/2 mb-8 md:mb-0">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">
                      Khám phá nội dung video đã được tóm tắt
                    </h1>
                    <p className="text-lg mb-6 text-indigo-100">
                      Tiết kiệm thời gian với VideoSum.AI - Nền tảng tóm tắt
                      video thông minh bằng AI
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="primary"
                        leftIcon={<FastForward size={18} />}
                        className="bg-indigo-500 hover:bg-indigo-600"
                        onClick={handleSummarizeClick}
                      >
                        Tóm tắt video ngay
                      </Button>
                      <Button
                        variant="outline"
                        leftIcon={<TrendingUp size={18} />}
                        className="bg-white text-indigo-900 hover:bg-gray-100"
                        onClick={handleViewGuideClick}
                      >
                        Xem hướng dẫn
                      </Button>
                    </div>
                  </div>
                  <div className="md:w-1/2 flex justify-end">
                    <div className="relative">
                      <div className="bg-indigo-800 bg-opacity-50 rounded-lg p-6 max-w-md">
                        <div className="flex items-center mb-4">
                          <div className="bg-indigo-600 h-10 w-10 rounded-full flex items-center justify-center">
                            <FastForward size={20} />
                          </div>
                          <div className="ml-3">
                            <h3 className="font-semibold">VideoSum.AI</h3>
                            <p className="text-xs text-indigo-200">
                              Powered by AI
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-indigo-700 bg-opacity-40 p-2 rounded">
                            <p className="text-sm">
                              Video 30 phút → Tóm tắt 3 phút
                            </p>
                          </div>
                          <div className="bg-indigo-700 bg-opacity-40 p-2 rounded">
                            <p className="text-sm">
                              Trích xuất điểm chính tự động
                            </p>
                          </div>
                          <div className="bg-indigo-700 bg-opacity-40 p-2 rounded">
                            <p className="text-sm">
                              Tiết kiệm 90% thời gian xem video
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
            {loading ? (
              <>
                <div className="md:hidden w-full">
                  <div className="w-full h-10 bg-gray-200 rounded-md animate-pulse"></div>
                </div>

                <div className="hidden md:flex items-center space-x-2 flex-wrap">
                  {Array(7)
                    .fill(0)
                    .map((_, index) => (
                      <div
                        key={index}
                        className="h-8 w-20 bg-gray-200 rounded-full animate-pulse"
                      ></div>
                    ))}
                </div>
              </>
            ) : (
              <>
                <div className="md:hidden w-full">
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={activeCategory}
                    onChange={(e) => setActiveCategory(e.target.value)}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hidden md:flex items-center space-x-2 flex-wrap">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                        category.id === activeCategory
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="flex items-center ml-auto">
              {loading ? (
                <>
                  <div className="h-9 w-32 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="ml-3 h-9 w-28 bg-gray-200 rounded-md animate-pulse"></div>
                </>
              ) : (
                <>
                  <SortingMenu
                    options={sortOptions}
                    selectedOption={sortBy}
                    onSelect={setSortBy}
                  />

                  <div className="ml-3">
                    <ViewToggle
                      viewMode={viewMode}
                      onViewChange={setViewMode}
                    />
                  </div>

                  <div className="ml-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReload}
                      disabled={loading}
                    >
                      {loading ? "Đang tải..." : "Tải lại"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {loading && videos.length === 0 ? (
            <VideoSkeleton viewMode={viewMode} count={8} />
          ) : (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {sortedVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      item={adaptVideoForComponent(video)}
                      viewMode="grid"
                      isSelected={selectedItems.includes(video.id)}
                      onSelect={toggleSelectItem}
                      contentType="video"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      item={adaptVideoForComponent(video)}
                      viewMode="list"
                      isSelected={selectedItems.includes(video.id)}
                      onSelect={toggleSelectItem}
                      contentType="video"
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {sortedVideos.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                Không tìm thấy video nào phù hợp
              </p>
              <Button
                variant="outline"
                onClick={() => setActiveCategory("all")}
                className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              >
                Xem tất cả video
              </Button>
            </div>
          )}

          {page * size < total && (
            <div className="mt-8 text-center space-x-4">
              <Button
                variant="outline"
                onClick={loadMoreVideos}
                disabled={loading}
                className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              >
                {loading ? "Đang tải..." : "Tải thêm video"}
              </Button>
              <Button
                variant="primary"
                leftIcon={<Plus size={16} />}
                onClick={handleUploadClick}
              >
                Đăng video
              </Button>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white py-10 px-6 mt-8 -mx-8 -mb-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-3">
              Nâng cao hiệu suất học tập và làm việc
            </h2>
            <p className="mb-6">
              Tiết kiệm thời gian với VideoSum.AI - Tóm tắt bất kỳ video nào
              trong vài giây
            </p>
            <Button
              variant="outline"
              className="bg-white text-indigo-900 hover:bg-gray-100"
              onClick={handleGetStartedClick}
            >
              Bắt đầu sử dụng
            </Button>
          </div>
        </div>
      </>
    </Layout>
  );
};
