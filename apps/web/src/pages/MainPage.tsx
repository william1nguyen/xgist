import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Plus, TrendingUp, FastForward, Search } from "lucide-react";
import { Button } from "../components/ui/Button";
import { SortingMenu, SortOption } from "../components/filter/SortingMenu";
import { ViewToggle } from "../components/filter/ViewToggle";
import { VideoSkeleton } from "../components/skeleton/VideoSkeleton";
import { Layout } from "../components/layout/Layout";
import { httpClient } from "../config/httpClient";
import { useAuth } from "react-oidc-context";
import { Media } from "../types/media";
import { MediaCard } from "../components/mediaCard/MediaCard";

interface User {
  access_token: string;
  id: string;
  username: string;
}

interface MediaExtended extends Media {
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

interface MediaResponse {
  data: Media[];
  metadata: {
    page: number;
    size: number;
    total: number;
    totalPage: number;
  };
}

export const MainPage: React.FC = () => {
  const { t } = useTranslation(["common", "explore"]);

  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const categoryParam = queryParams.get("category");
  const searchQuery = queryParams.get("q");

  const { user } = useAuth() as { user: User | null };
  const [activeCategory, setActiveCategory] = useState<string>(
    categoryParam || "all"
  );
  const [sortBy, setSortBy] = useState<string>("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState<boolean>(true);
  const [media, setMedia] = useState<Media[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [size, setSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [likedMedia, setLikedMedia] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState<string>(searchQuery || "");

  const env = import.meta.env;

  const fetchMedia = async (
    pageNum: number = 1,
    pageSize: number = 10,
    category?: string,
    keyword?: string
  ): Promise<void> => {
    setLoading(true);
    try {
      const response = await httpClient.get<MediaResponse>(
        `${env.VITE_BASE_URL}/v1/media`,
        {
          params: {
            page: pageNum,
            size: pageSize,
            category: category !== "all" ? category : undefined,
            keyword: keyword || undefined,
          },
          headers: {
            Authorization: `Bearer ${user?.access_token}`,
          },
        }
      );

      const mediaData = response.data.data;
      setMedia(mediaData);

      const likedStatus: Record<string, boolean> = {};
      mediaData.forEach((item) => {
        likedStatus[item.id] = item.isLiked?.state || false;
      });
      setLikedMedia(likedStatus);

      if (response.data.metadata) {
        setTotal(response.data.metadata.total);
        setPage(response.data.metadata.page);
        setSize(response.data.metadata.size);
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching media:", err);
      setError(t("explore:errors.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia(1, size, activeCategory, searchTerm);
  }, []);

  useEffect(() => {
    if (categoryParam || searchQuery) {
      setActiveCategory(categoryParam || "all");
      setSearchTerm(searchQuery || "");
      fetchMedia(1, size, categoryParam || "all", searchQuery || "");
    }
  }, [categoryParam, searchQuery]);

  const handleReload = (): void => {
    fetchMedia(1, size, activeCategory, searchTerm);
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

    const queryString = new URLSearchParams();
    if (category !== "all") {
      queryString.set("category", category);
    }
    if (searchTerm) {
      queryString.set("q", searchTerm);
    }

    fetchMedia(1, size, category, searchTerm);
    navigate(
      `/explore${queryString.toString() ? `?${queryString.toString()}` : ""}`
    );
  };

  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setPage(1);

    const queryString = new URLSearchParams();
    if (activeCategory !== "all") {
      queryString.set("category", activeCategory);
    }
    if (searchTerm) {
      queryString.set("q", searchTerm);
    }

    fetchMedia(1, size, activeCategory, searchTerm);
    navigate(
      `/explore${queryString.toString() ? `?${queryString.toString()}` : ""}`
    );
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value);
  };

  const handleClearSearch = (): void => {
    setSearchTerm("");

    const queryString = new URLSearchParams();
    if (activeCategory !== "all") {
      queryString.set("category", activeCategory);
    }

    fetchMedia(1, size, activeCategory, "");
    navigate(
      `/explore${queryString.toString() ? `?${queryString.toString()}` : ""}`
    );
  };

  const handleLikeMedia = async (id: string): Promise<void> => {
    if (!user?.access_token) {
      navigate("/login");
      return;
    }

    try {
      setLikedMedia((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));

      setMedia((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              likes: likedMedia[id] ? item.likes - 1 : item.likes + 1,
            };
          }
          return item;
        })
      );

      await httpClient.post(
        `${env.VITE_BASE_URL}/v1/media/${id}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user?.access_token}`,
          },
        }
      );
    } catch (error) {
      console.error("Error liking media:", error);

      setLikedMedia((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));

      setMedia((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              likes: likedMedia[id] ? item.likes + 1 : item.likes - 1,
            };
          }
          return item;
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
    { id: "academic", label: t("explore:categories.academic") },
  ];

  const sortOptions: SortOption[] = [
    { id: "recent", label: t("explore:sorting.recent") },
    { id: "popular", label: t("explore:sorting.popular") },
    { id: "trending", label: t("explore:sorting.trending") },
  ];

  const sortedMedia = [...media].sort((a, b) => {
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

  const loadMoreMedia = async (): Promise<void> => {
    if (page * size >= total) return;

    try {
      setLoading(true);
      const nextPage = page + 1;

      const response = await httpClient.get<MediaResponse>(
        `${env.VITE_BASE_URL}/v1/media`,
        {
          params: {
            page: nextPage,
            size: size,
            category: activeCategory !== "all" ? activeCategory : undefined,
            keyword: searchTerm || undefined,
          },
          headers: {
            Authorization: `Bearer ${user?.access_token}`,
          },
        }
      );

      if (response.data.data && response.data.data.length > 0) {
        const newMedia = response.data.data;
        setMedia([...media, ...newMedia]);

        const newLikedStatus = { ...likedMedia };
        newMedia.forEach((item) => {
          newLikedStatus[item.id] = item.isLiked?.state || false;
        });
        setLikedMedia(newLikedStatus);

        if (response.data.metadata) {
          setPage(response.data.metadata.page);
        }
      }
    } catch (err) {
      console.error("Error loading more media:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (durationInSeconds: number): string => {
    const minutes = Math.floor(durationInSeconds / 1000 / 60);
    return t("explore:minutes", { count: minutes });
  };

  const adaptMediaForComponent = (item: Media): MediaExtended => {
    return {
      ...item,
      formattedDuration: formatDuration(item.duration),
      formattedViews: "0",
      creatorName: item.creator.username,
      creatorAvatar: item.creator.username.substring(0, 2).toUpperCase(),
      summarized: item.isSummarized,
      isLiked: { state: likedMedia[item.id] || false },
      onLikeClick: () => handleLikeMedia(item.id),
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
                            <h3 className="font-semibold">MediaSum.AI</h3>
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
          {/* Search Form */}
          <div className="mb-6">
            <form onSubmit={handleSearchSubmit} className="flex">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder={
                    t("explore:search.placeholder") || "Search media..."
                  }
                  className="text-gray-800 block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <span className="text-gray-400 hover:text-gray-500">✕</span>
                  </button>
                )}
              </div>
              <Button type="submit" variant="primary" className="ml-2">
                {t("explore:search.button") || "Search"}
              </Button>
            </form>
          </div>

          {/* Search Results Information */}
          {searchTerm && (
            <div className="mb-4">
              <p className="text-gray-600">
                {loading
                  ? t("explore:search.searching")
                  : media.length > 0
                    ? t("explore:search.results", {
                        count: total,
                        query: searchTerm,
                      })
                    : t("explore:search.no_results", { query: searchTerm })}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
            {loading ? (
              <>
                <div className="md:hidden w-full">
                  <div className="w-full h-10 bg-gray-200 rounded-md animate-pulse"></div>
                </div>

                <div className="hidden md:flex items-center space-x-2 flex-wrap">
                  {Array(8)
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

          {loading && media.length === 0 ? (
            <VideoSkeleton viewMode={viewMode} count={8} />
          ) : (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {sortedMedia.map((item) => (
                    <MediaCard
                      key={item.id}
                      item={adaptMediaForComponent(item)}
                      viewMode="grid"
                      contentType="media"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedMedia.map((item) => (
                    <MediaCard
                      key={item.id}
                      item={adaptMediaForComponent(item)}
                      viewMode="list"
                      contentType="media"
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {sortedMedia.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? t("explore:search.try_different")
                  : t("explore:messages.no_media")}
              </p>
              {searchTerm ? (
                <Button
                  variant="outline"
                  onClick={handleClearSearch}
                  className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                >
                  {t("explore:search.clear")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => handleCategoryChange("all")}
                  className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                >
                  {t("explore:buttons.view_all")}
                </Button>
              )}
            </div>
          )}

          {page * size < total && (
            <div className="mt-8 text-center space-x-4">
              <Button
                variant="outline"
                onClick={loadMoreMedia}
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
                {t("explore:buttons.upload_media")}
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
