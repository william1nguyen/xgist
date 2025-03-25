import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Clock,
  Edit,
  Eye,
  ThumbsUp,
  Upload,
  Database,
  ArrowUp,
  ArrowDown,
  LogIn,
  Lock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  VideoItem,
  StatisticsData,
  CategoryData,
  Activity,
  ApiResponse,
  VideosResponse,
} from "../types";
import { Button } from "../components/ui/Button";
import { ViewToggle } from "../components/filter/ViewToggle";
import { VideoSkeleton } from "../components/skeleton/VideoSkeleton";
import { VideoCard } from "../components/video/VideoCard";
import { Layout } from "../components/layout/Layout";
import { DeleteConfirmation } from "../components/ui/DeleteConfirmation";
import { httpClient } from "../config/httpClient";
import { useKeycloakAuth } from "../hooks/useKeycloakAuth";

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation(["common", "settings"]);

  const [activeTab, setActiveTab] = useState<"uploads" | "statistics">(
    "uploads"
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"date" | "views" | "likes">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [statistics, setStatistics] = useState<StatisticsData>({
    totalVideos: 0,
    totalSummaries: 0,
    totalDuration: "0h 0m",
    totalSavedTime: "0h 0m",
    uploadedThisMonth: 0,
    summarizedThisMonth: 0,
  });
  const [categoryStats, setCategoryStats] = useState<CategoryData[]>([]);
  const [mostPopularVideo, setMostPopularVideo] = useState<VideoItem | null>(
    null
  );
  const [storageData, setStorageData] = useState({
    used: 0,
    total: 5,
    summarizedCount: 0,
    nonSummarizedCount: 0,
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const { isAuthenticated, login } = useKeycloakAuth();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "uploads") {
        const response =
          await httpClient.get<ApiResponse<VideosResponse>>("/v1/videos/me");
        setVideos(response.data.data.videos);
      } else {
        const [
          videosResponse,
          statsResponse,
          categoriesResponse,
          activitiesResponse,
        ] = await Promise.all([
          httpClient.get(`/v1/videos/me`),
          httpClient.get<ApiResponse<StatisticsData>>(
            "/v1/videos/me/statistics"
          ),
          httpClient.get<ApiResponse<{ categories: CategoryData[] }>>(
            "/v1/videos/categories/stats"
          ),
          httpClient.get<ApiResponse<{ activities: Activity[] }>>(
            "/v1/videos/user/activities"
          ),
        ]);

        setVideos(videosResponse.data.data.videos);
        setStatistics(statsResponse.data.data);
        setCategoryStats(categoriesResponse.data.data.categories);
        setRecentActivities(activitiesResponse.data.data.activities);

        if (videosResponse.data.data.videos.length > 0) {
          const popular = [...videosResponse.data.data.videos].sort(
            (a, b) => b.views - a.views
          )[0];
          setMostPopularVideo(popular);
        }

        const summarized = videosResponse.data.data.videos.filter(
          (v: VideoItem) => v.isSummarized
        ).length;
        const nonSummarized =
          videosResponse.data.data.videos.length - summarized;

        setStorageData({
          used: calculateStorageUsed(videosResponse.data.data.videos),
          total: 5,
          summarizedCount: summarized,
          nonSummarizedCount: nonSummarized,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStorageUsed = (videos: VideoItem[]): number => {
    const totalMinutes = videos.reduce((sum, video) => {
      return sum + video.duration / 60;
    }, 0);

    return parseFloat(((totalMinutes * 100) / 1024).toFixed(2));
  };

  const toggleSelectItem = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const handleDeleteVideo = (videoId: string) => {
    setVideoToDelete(videoId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteVideo = async () => {
    if (videoToDelete) {
      try {
        await httpClient.delete(`/v1/videos/${videoToDelete}`);
        setVideos(videos.filter((v) => v.id !== videoToDelete));
        setVideoToDelete(null);
      } catch (error) {
        console.error("Error deleting video:", error);
      }
    }
    setIsDeleteModalOpen(false);
  };

  const formatTimeDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  const formatViews = (viewCount: number): string => {
    if (viewCount >= 1000000) {
      return (viewCount / 1000000).toFixed(1) + "M";
    } else if (viewCount >= 1000) {
      return (viewCount / 1000).toFixed(1) + "K";
    }
    return viewCount.toString();
  };

  const getSortedVideos = (): VideoItem[] => {
    return [...videos].sort((a, b) => {
      let comparison = 0;

      if (sortBy === "views") {
        comparison = b.views - a.views;
      } else if (sortBy === "likes") {
        comparison = b.likes - a.likes;
      } else {
        comparison =
          new Date(b.createdTime || "").getTime() -
          new Date(a.createdTime || "").getTime();
      }

      return sortOrder === "asc" ? -comparison : comparison;
    });
  };

  const adaptVideoForComponent = (video: VideoItem) => {
    return {
      id: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      formattedDuration: formatTimeDuration(video.duration || 0),
      formattedViews: formatViews(video.views || 0),
      creatorName: video.creator?.username || "",
      creatorAvatar:
        video.creator?.username?.substring(0, 2).toUpperCase() || "",
      summarized: video.isSummarized,
      createdTime: video.createdTime || "",
      category: video.category,
      creator: video.creator,
      description: video.description,
      url: video.url,
      userId: video.userId,
      views: video.views,
      likes: video.likes,
      isLiked: video.isLiked,
      isBookmarked: video.isBookmarked,
      metadata: video.metadata,
      duration: video.duration,
      isSummarized: video.isSummarized,
      updatedTime: video.updatedTime,
      deletedTime: video.deletedTime,
    };
  };

  const getCategoryLabel = (category: string): string => {
    return t(`settings:categories.${category}`);
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case "technology":
        return "#4f46e5";
      case "education":
        return "#0ea5e9";
      case "productivity":
        return "#8b5cf6";
      case "finance":
        return "#10b981";
      case "travel":
        return "#f59e0b";
      case "health":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="p-16 text-center bg-white rounded-lg shadow-md">
          <div className="mb-4 bg-white border border-gray-200 h-16 w-16 rounded-full flex items-center justify-center mx-auto">
            <Lock size={32} className="text-black" />
          </div>
          <h3 className="text-xl font-bold text-black mb-2">
            {t("videoDetail:auth.locked_content")}
          </h3>
          <p className="text-gray-800 mb-6 max-w-md mx-auto">
            {t("videoDetail:auth.login_message")}
          </p>
          <Button
            variant="outline"
            onClick={() => login()}
            type="button"
            className="flex items-center mx-auto border border-black text-black hover:bg-gray-100"
          >
            <LogIn size={18} className="mr-2" />
            {t("videoDetail:buttons.login_now")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Layout activeItem="settings" title={t("settings:title")}>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-black mb-2">
            {t("settings:heading")}
          </h1>
          <p className="text-black">{t("settings:subtitle")}</p>
        </div>

        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "uploads"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-black hover:text-black"
            }`}
            onClick={() => setActiveTab("uploads")}
          >
            <Upload size={16} className="inline mr-2" />
            {t("settings:tabs.uploads")}
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "statistics"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-black hover:text-black"
            }`}
            onClick={() => setActiveTab("statistics")}
          >
            <BarChart3 size={16} className="inline mr-2" />
            {t("settings:tabs.statistics")}
          </button>
        </div>

        {activeTab === "uploads" ? (
          <>
            <div className="flex flex-wrap items-center justify-between mb-6">
              <div className="mb-4 sm:mb-0">
                <h2 className="text-lg font-medium text-black">
                  {t("settings:uploads.title", { count: videos.length })}
                </h2>
                <p className="text-sm text-black">
                  {t("settings:uploads.description")}
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
                    {t("settings:sorting.date")}
                  </button>
                  <button
                    className={`px-3 py-1.5 text-sm ${
                      sortBy === "views" ? "bg-gray-100" : "bg-white"
                    }`}
                    onClick={() => setSortBy("views")}
                  >
                    {t("settings:sorting.views")}
                  </button>
                  <button
                    className={`px-3 py-1.5 text-sm ${
                      sortBy === "likes" ? "bg-gray-100" : "bg-white"
                    }`}
                    onClick={() => setSortBy("likes")}
                  >
                    {t("settings:sorting.likes")}
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
                    {getSortedVideos().map((video) => (
                      <div key={video.id} className="relative group">
                        <VideoCard
                          item={adaptVideoForComponent(video)}
                          viewMode="grid"
                          isSelected={selectedItems.includes(video.id)}
                          onSelect={() => toggleSelectItem(video.id)}
                          contentType="video"
                          onDelete={() => handleDeleteVideo(video.id)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 mb-6">
                    {getSortedVideos().map((video) => (
                      <div key={video.id} className="relative group">
                        <VideoCard
                          item={adaptVideoForComponent(video)}
                          viewMode="list"
                          isSelected={selectedItems.includes(video.id)}
                          onSelect={() => toggleSelectItem(video.id)}
                          contentType="video"
                          onDelete={() => handleDeleteVideo(video.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="mt-4 flex justify-center">
              <Button
                variant="primary"
                leftIcon={<Upload size={16} />}
                onClick={() => (window.location.href = "/summarize")}
              >
                {t("settings:buttons.upload_new")}
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
                      <span className="text-black text-sm">
                        {t("settings:stats.total_views")}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-black">
                      {videos
                        .reduce((sum, video) => sum + video.views, 0)
                        .toLocaleString()}
                    </h3>
                    <p className="text-sm text-black">
                      {t("settings:stats.from_videos", {
                        count: videos.length,
                      })}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center mb-2">
                      <ThumbsUp className="text-indigo-500 mr-2" size={20} />
                      <span className="text-black text-sm">
                        {t("settings:stats.total_likes")}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-black">
                      {videos
                        .reduce((sum, video) => sum + video.likes, 0)
                        .toLocaleString()}
                    </h3>
                    <p className="text-sm text-black">
                      {t("settings:stats.average", {
                        count:
                          videos.length > 0
                            ? Math.round(
                                videos.reduce(
                                  (sum, video) => sum + video.likes,
                                  0
                                ) / videos.length
                              )
                            : 0,
                      })}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center mb-2">
                      <Clock className="text-indigo-500 mr-2" size={20} />
                      <span className="text-black text-sm">
                        {t("settings:stats.total_duration")}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-black">
                      {statistics.totalDuration}
                    </h3>
                    <p className="text-sm text-black">
                      {t("settings:stats.saved_time", {
                        time: statistics.totalSavedTime,
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-medium text-black mb-4">
                      {t("settings:stats.distribution")}
                    </h3>
                    <div className="h-64 flex items-end space-x-6">
                      {categoryStats.map((category) => (
                        <div
                          key={category.name}
                          className="flex flex-col items-center flex-1"
                        >
                          <div
                            className="w-full rounded-t-md"
                            style={{
                              height: `${Math.max(category.percentage * 2, 10)}px`,
                              background: getCategoryColor(category.name),
                            }}
                          ></div>
                          <div className="mt-2 text-xs text-center">
                            <div className="font-medium text-black">
                              {getCategoryLabel(category.name)}
                            </div>
                            <div className="text-black">
                              {t("settings:stats.video_count", {
                                count: category.count,
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-medium text-black mb-4">
                      {t("settings:stats.most_popular")}
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
                            {formatTimeDuration(mostPopularVideo.duration || 0)}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium line-clamp-2 text-black">
                            {mostPopularVideo.title}
                          </h4>
                          <div className="flex items-center text-sm text-black mt-1">
                            <Eye size={14} className="mr-1" />
                            {formatViews(mostPopularVideo.views)}{" "}
                            {t("settings:stats.views")}
                          </div>
                          <div className="flex items-center text-sm text-black mt-1">
                            <ThumbsUp size={14} className="mr-1" />
                            {mostPopularVideo.likes} {t("settings:stats.likes")}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            leftIcon={<Edit size={14} />}
                            onClick={() =>
                              (window.location.href = `/edit/${mostPopularVideo.id}`)
                            }
                          >
                            {t("settings:buttons.edit")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-medium text-black mb-4">
                      {t("settings:storage.title")}
                    </h3>
                    <div className="flex items-center mb-4">
                      <Database size={18} className="text-indigo-500 mr-2" />
                      <span className="text-black">
                        {t("settings:storage.used")}
                      </span>
                    </div>

                    <div className="mb-4">
                      <div className="h-3 bg-gray-200 rounded-full mb-2">
                        <div
                          className="h-3 bg-indigo-500 rounded-full"
                          style={{
                            width: `${(storageData.used / storageData.total) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-black">
                          {storageData.used.toFixed(2)} GB / {storageData.total}{" "}
                          GB
                        </span>
                        <span className="text-indigo-500">
                          {Math.round(
                            (storageData.used / storageData.total) * 100
                          )}
                          %
                        </span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-black">
                          {t("settings:storage.video_count")}
                        </span>
                        <span className="font-medium">{videos.length}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-black">
                          {t("settings:storage.summarized")}
                        </span>
                        <span className="font-medium">
                          {t("settings:storage.video_count_value", {
                            count: storageData.summarizedCount,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-black">
                          {t("settings:storage.not_summarized")}
                        </span>
                        <span className="font-medium">
                          {t("settings:storage.video_count_value", {
                            count: storageData.nonSummarizedCount,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-medium text-black mb-4">
                      {t("settings:activities.title")}
                    </h3>
                    <div className="space-y-4">
                      {recentActivities.slice(0, 3).map((activity, index) => (
                        <div key={index} className="flex items-start">
                          <div
                            className={`bg-${activity.iconColor}-100 p-2 rounded-full mr-3`}
                          >
                            {activity.icon}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-black">
                              {activity.title}
                            </p>
                            <p className="text-xs text-black">
                              {activity.timestamp}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <DeleteConfirmation
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteVideo}
        itemCount={1}
        itemType="video"
      />
    </Layout>
  );
};
