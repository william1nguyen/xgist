import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Plus, TrendingUp, FastForward } from "lucide-react";
import { VideoItem, SortOption, ApiResponse, VideosResponse } from "../types";
import { Button } from "../components/ui/Button";
import { SortingMenu } from "../components/filter/SortingMenu";
import { ViewToggle } from "../components/filter/ViewToggle";
import { VideoSkeleton } from "../components/skeleton/VideoSkeleton";
import { VideoCard } from "../components/video/VideoCard";
import { Layout } from "../components/layout/Layout";
import { httpClient } from "../config/httpClient";
import { useAuth } from "react-oidc-context";

interface User {
  access_token: string;
  id: string;
  username: string;
}

interface VideoItemExtended extends VideoItem {
  formattedDuration: string;
  formattedViews: string;
  creatorName: string;
  creatorAvatar: string;
  summarized: boolean;
  isLiked: { state: boolean };
  onLikeClick: () => void;
}

interface Category {
  id: string;
  label: string;
}

export const MainVideoPage: React.FC = () => {
  const { t } = useTranslation(["common", "explore"]);

  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const categoryParam = queryParams.get("category");

  const { user } = useAuth() as { user: User | null };
  const [activeCategory, setActiveCategory] = useState<string>(
    categoryParam || "all"
  );
  const [sortBy, setSortBy] = useState<string>("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState<boolean>(true);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [size, setSize] = useState<number>(8);
  const [total, setTotal] = useState<number>(0);
  const [likedVideos, setLikedVideos] = useState<Record<string, boolean>>({});

  const env = import.meta.env;

  const fetchVideos = async (
    pageNum: number = 1,
    pageSize: number = 20,
    category?: string
  ): Promise<void> => {
    setLoading(true);
    try {
      const response = await httpClient.get<ApiResponse<VideosResponse>>(
        `${env.VITE_BASE_URL}/v1/videos`,
        {
          params: {
            page: pageNum,
            size: pageSize,
            category: category !== "all" ? category : undefined,
          },
        }
      );

      const videosData = response.data.data.videos;
      setVideos(videosData);

      const likedStatus: Record<string, boolean> = {};
      videosData.forEach((video) => {
        likedStatus[video.id] = video.isLiked?.state || false;
      });
      setLikedVideos(likedStatus);

      if (response.data.metadata) {
        setTotal(response.data.metadata.total);
        setPage(response.data.metadata.page);
        setSize(response.data.metadata.size);
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching videos:", err);
      setError(t("explore:errors.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos(1, size, activeCategory);
  }, []);

  useEffect(() => {
    if (categoryParam) {
      setActiveCategory(categoryParam);
      fetchVideos(1, size, categoryParam);
    }
  }, [categoryParam]);

  const handleReload = (): void => {
    fetchVideos(1, size, activeCategory);
    window.scrollTo(0, 0);
  };

  const handleSummarizeClick = (): void => {
    navigate("/summarize");
  };

  const handleViewGuideClick = (): void => {
    navigate("/guide");
  };

  const handleUploadClick = (): void => {
    navigate("/upload");
  };

  const handleGetStartedClick = (): void => {
    navigate("/summarize");
  };

  const handleCategoryChange = (category: string): void => {
    setActiveCategory(category);
    setPage(1);
    fetchVideos(1, size, category);
    navigate(`/explore${category !== "all" ? `?category=${category}` : ""}`);
  };

  const handleLikeVideo = async (id: string): Promise<void> => {
    if (!user?.access_token) {
      navigate("/login");
      return;
    }

    try {
      setLikedVideos((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));

      setVideos((prev) =>
        prev.map((video) => {
          if (video.id === id) {
            return {
              ...video,
              likes: likedVideos[id] ? video.likes - 1 : video.likes + 1,
            };
          }
          return video;
        })
      );

      await httpClient.post(
        `${env.VITE_BASE_URL}/v1/videos/${id}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user?.access_token}`,
          },
        }
      );
    } catch (error) {
      console.error("Error liking video:", error);

      setLikedVideos((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));

      setVideos((prev) =>
        prev.map((video) => {
          if (video.id === id) {
            return {
              ...video,
              likes: likedVideos[id] ? video.likes + 1 : video.likes - 1,
            };
          }
          return video;
        })
      );
    }
  };

  const categories: Category[] = [
    { id: "all", label: t("explore:categories.all") },
    { id: "technology", label: t("explore:categories.technology") },
    { id: "education", label: t("explore:categories.education") },
    { id: "productivity", label: t("explore:categories.productivity") },
    { id: "finance", label: t("explore:categories.finance") },
    { id: "travel", label: t("explore:categories.travel") },
    { id: "health", label: t("explore:categories.health") },
  ];

  const sortOptions: SortOption[] = [
    { id: "recent", label: t("explore:sorting.recent") },
    { id: "popular", label: t("explore:sorting.popular") },
    { id: "trending", label: t("explore:sorting.trending") },
  ];

  const sortedVideos = [...videos].sort((a, b) => {
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

  const loadMoreVideos = async (): Promise<void> => {
    if (page * size >= total) return;

    try {
      setLoading(true);
      const nextPage = page + 1;

      const response = await httpClient.get<ApiResponse<VideosResponse>>(
        `${env.VITE_BASE_URL}/v1/videos`,
        {
          params: {
            page: nextPage,
            size: size,
            category: activeCategory !== "all" ? activeCategory : undefined,
          },
        }
      );

      if (response.data.data.videos && response.data.data.videos.length > 0) {
        const newVideos = response.data.data.videos;
        setVideos([...videos, ...newVideos]);

        const newLikedStatus = { ...likedVideos };
        newVideos.forEach((video) => {
          newLikedStatus[video.id] = video.isLiked?.state || false;
        });
        setLikedVideos(newLikedStatus);

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
    return t("explore:minutes", { count: minutes });
  };

  const formatViews = (viewCount: number): string => {
    if (viewCount >= 1000) {
      return (viewCount / 1000).toFixed(1) + "K";
    }
    return viewCount.toString();
  };

  const adaptVideoForComponent = (video: VideoItem): VideoItemExtended => {
    return {
      ...video,
      formattedDuration: formatDuration(video.duration),
      formattedViews: formatViews(video.views),
      creatorName: video.creator.username,
      creatorAvatar: video.creator.username.substring(0, 2).toUpperCase(),
      summarized: video.isSummarized,
      isLiked: { state: likedVideos[video.id] || false },
      onLikeClick: () => handleLikeVideo(video.id),
    };
  };

  return (
    <Layout
      activeItem="explore"
      title={t("explore:title")}
      sidebarProps={{
        categories: categories,
        onCategoryClick: handleCategoryChange,
      }}
    >
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
                      {t("explore:explore.title")}
                    </h1>
                    <p className="text-lg mb-6 text-indigo-100">
                      {t("explore:explore.description")}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="primary"
                        leftIcon={<FastForward size={18} />}
                        className="bg-indigo-500 hover:bg-indigo-600"
                        onClick={handleSummarizeClick}
                      >
                        {t("explore:buttons.summarize_now")}
                      </Button>
                      <Button
                        variant="outline"
                        leftIcon={<TrendingUp size={18} />}
                        className="bg-white text-indigo-900 hover:bg-gray-100"
                        onClick={handleViewGuideClick}
                      >
                        {t("explore:buttons.view_guide")}
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
                              {t("explore:messages.powered_by_ai")}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-indigo-700 bg-opacity-40 p-2 rounded">
                            <p className="text-sm">
                              {t("explore:demo.conversion")}
                            </p>
                          </div>
                          <div className="bg-indigo-700 bg-opacity-40 p-2 rounded">
                            <p className="text-sm">
                              {t("explore:demo.key_points")}
                            </p>
                          </div>
                          <div className="bg-indigo-700 bg-opacity-40 p-2 rounded">
                            <p className="text-sm">
                              {t("explore:demo.time_saving")}
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
                    onChange={(e) => handleCategoryChange(e.target.value)}
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
                      onClick={() => handleCategoryChange(category.id)}
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
                      {loading
                        ? t("explore:buttons.loading")
                        : t("explore:buttons.reload")}
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
                      contentType="video"
                      isSelected={false}
                      onSelect={() => {}}
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
                      contentType="video"
                      isSelected={false}
                      onSelect={() => {}}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {sortedVideos.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {t("explore:messages.no_videos")}
              </p>
              <Button
                variant="outline"
                onClick={() => handleCategoryChange("all")}
                className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              >
                {t("explore:buttons.view_all")}
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
                {loading
                  ? t("explore:buttons.loading")
                  : t("explore:buttons.load_more")}
              </Button>
              <Button
                variant="primary"
                leftIcon={<Plus size={16} />}
                onClick={handleUploadClick}
              >
                {t("explore:buttons.upload_video")}
              </Button>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white py-10 px-6 mt-8 -mx-8 -mb-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-3">
              {t("explore:messages.improve_productivity")}
            </h2>
            <p className="mb-6">{t("explore:messages.save_time")}</p>
            <Button
              variant="outline"
              className="bg-white text-indigo-900 hover:bg-gray-100"
              onClick={handleGetStartedClick}
            >
              {t("explore:buttons.get_started")}
            </Button>
          </div>
        </div>
      </>
    </Layout>
  );
};
