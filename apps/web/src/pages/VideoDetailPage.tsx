import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  ThumbsUp,
  Eye,
  Download,
  Bookmark,
  FastForward,
  ChevronLeft,
  Heart,
  Play,
  Link2,
  Loader2,
  FileText,
  Lock,
  LogIn,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { VideoCard } from "../components/video/VideoCard";
import { VideoItem, ApiResponse, VideosResponse } from "../types";

import { env } from "../config/env";
import { useKeycloakAuth } from "../hooks/useKeycloakAuth";
import { httpClient } from "../config/httpClient";

export interface Chunk {
  time: number;
  text: string;
}

export interface Transcript {
  text: string;
  chunks: Chunk[];
}

export const VideoDetailPage = () => {
  const { t } = useTranslation(["common", "videoDetail"]);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedVideos, setRelatedVideos] = useState<VideoItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"video" | "summary">("video");
  const [detailedSummary, setDetailedSummary] = useState<string>("");
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<Transcript>();
  const [displayedTranscripts, setDisplayedTranscripts] = useState<number>(20);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const { user, isAuthenticated, login } = useKeycloakAuth();

  const fetchVideoDetails = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get(`${env.VITE_BASE_URL}/v1/videos/${id}`);
      const data = res.data.data.video;
      setVideo(data);
      setIsLiked(data.isLiked?.state);
      setIsBookmarked(data.isBookmarked?.state);

      if (data.isSummarized && data.metadata) {
        setDetailedSummary(data.metadata.summary || "");
        setKeyPoints(data.metadata.keyPoints || []);
        setKeywords(data.metadata.keywords || []);
        setTranscript(data.metadata.transcripts);
      }

      try {
        const relatedResponse = await httpClient.get<
          ApiResponse<VideosResponse>
        >(
          `${env.VITE_BASE_URL}/v1/videos/${data.id}/related?category=${data.category}&page=1&size=8`
        );
        setRelatedVideos(relatedResponse.data.data.videos);
      } catch (error) {
        console.log(error);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching video details:", err);
      setError(t("videoDetail:errors.fetch_failed"));
      setLoading(false);
    }
  };

  const updateVideoViews = async () => {
    try {
      await httpClient.post(`${env.VITE_BASE_URL}/v1/videos/views`, {
        videoId: id,
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchVideoDetails();
      updateVideoViews();
    }
  }, [id]);

  const toggleSelectItem = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/videos/${id}`;
    navigator.clipboard.writeText(url);
    alert(t("videoDetail:alerts.link_copied"));
  };

  const handleLikeVideo = async () => {
    if (!video) return;

    try {
      await httpClient.post(
        `${env.VITE_BASE_URL}/v1/videos/${id}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user?.access_token}`,
          },
        }
      );
      setIsLiked(!isLiked);
    } catch (err) {
      console.error("Error liking video:", err);
    }
  };

  const handleBookmarkVideo = async () => {
    if (!video) return;

    try {
      await httpClient.post(
        `${env.VITE_BASE_URL}/v1/videos/${id}/bookmark`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user?.access_token}`,
          },
        }
      );
      setIsBookmarked(!isBookmarked);
    } catch (err) {
      console.error("Error bookmarking video:", err);
    }
  };

  const handleLoginRedirect = () => {
    login();
  };

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return "0:00";
    const seconds = Math.floor(timestamp);
    const minutes = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    return `${minutes}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-gray-200 rounded mb-6"></div>
          <div className="aspect-video w-full bg-gray-200 rounded-lg mb-6"></div>
          <div className="h-8 w-3/4 bg-gray-200 rounded mb-4"></div>
          <div className="flex justify-between mb-6">
            <div className="flex space-x-4">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div>
                <div className="h-5 w-32 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="flex space-x-2">
              <div className="h-10 w-24 bg-gray-200 rounded"></div>
              <div className="h-10 w-24 bg-gray-200 rounded"></div>
            </div>
          </div>
          <div className="h-32 bg-gray-200 rounded mb-8"></div>
          <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-60 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-semibold mb-4">
          {t("videoDetail:error_page.title")}
        </h2>
        <p className="mb-6">{error}</p>
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          onClick={handleGoBack}
        >
          {t("videoDetail:buttons.go_back")}
        </button>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-semibold mb-4">
          {t("videoDetail:not_found.title")}
        </h2>
        <p className="mb-6">{t("videoDetail:not_found.description")}</p>
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          onClick={handleGoBack}
        >
          {t("videoDetail:buttons.go_back")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <button
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        onClick={handleGoBack}
      >
        <ChevronLeft size={18} />
        <span className="ml-1">{t("videoDetail:buttons.go_back")}</span>
      </button>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "video"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("video")}
        >
          {t("videoDetail:tabs.original")}
        </button>
        {video.isSummarized && (
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "summary"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            } flex items-center`}
            onClick={() => setActiveTab("summary")}
          >
            {isAuthenticated ? (
              <FastForward size={14} className="mr-1" />
            ) : (
              <Lock size={14} className="mr-1" />
            )}
            {t("videoDetail:tabs.summary")}
            {!isAuthenticated && (
              <span className="text-xs ml-1 text-gray-400">
                ({t("videoDetail:auth.login_required")})
              </span>
            )}
          </button>
        )}
      </div>

      {activeTab === "video" ? (
        <>
          <div className="aspect-video w-full bg-gray-900 rounded-lg mb-6 flex items-center justify-center">
            <div className="text-center text-white w-full h-full">
              {video.url ? (
                <iframe
                  src={video.url}
                  title={video.title}
                  className="w-full h-full"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="max-h-full object-contain"
                  />
                  <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 mt-4 flex items-center mx-auto">
                    <Play size={18} className="mr-2" />
                    {t("videoDetail:buttons.watch_video")}
                  </button>
                </div>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-4">{video.title}</h1>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                {video.creator?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="ml-3">
                <h3 className="font-medium">
                  {video.creator?.username ||
                    t("videoDetail:default.unknown_creator")}
                </h3>
                <p className="text-sm text-gray-500">
                  {video.createdTime
                    ? new Date(video.createdTime).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : t("videoDetail:default.unknown_date")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center text-sm text-gray-500 mr-4">
                <Eye size={16} className="mr-1" />
                {video.views} {t("videoDetail:metrics.views")}
              </span>
              <span className="inline-flex items-center text-sm text-gray-500 mr-4">
                <ThumbsUp size={16} className="mr-1" />
                {video.likes || 0} {t("videoDetail:metrics.likes")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button
              className={`flex items-center gap-1 px-3 py-1.5 border rounded-md text-sm 
        ${
          isLiked
            ? "bg-red-50 border-red-300 text-red-600"
            : "border-gray-300 hover:bg-gray-50 text-white-700"
        }`}
              onClick={isAuthenticated ? handleLikeVideo : handleLoginRedirect}
            >
              <Heart
                size={16}
                className={isLiked ? "text-red-600" : "text-white-600"}
                fill={isLiked ? "#DC2626" : "none"}
              />
              <span>
                {isLiked
                  ? t("videoDetail:buttons.liked")
                  : t("videoDetail:buttons.like")}
              </span>
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
              <Download size={16} />
              <span>{t("videoDetail:buttons.download")}</span>
            </button>
            <button
              className={`flex items-center gap-1 px-3 py-1.5 border rounded-md text-sm 
    ${
      isBookmarked
        ? "bg-blue-50 border-blue-300 text-blue-600"
        : "border-gray-300 hover:bg-gray-50 text-white-700"
    }`}
              onClick={
                isAuthenticated ? handleBookmarkVideo : handleLoginRedirect
              }
            >
              <Bookmark
                size={16}
                className={isBookmarked ? "text-blue-600" : "text-white-600"}
                fill={isBookmarked ? "#2563EB" : "none"}
              />
              <span>
                {isBookmarked
                  ? t("videoDetail:buttons.bookmarked")
                  : t("videoDetail:buttons.bookmark")}
              </span>
            </button>
            <button
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              onClick={handleCopyLink}
            >
              <Link2 size={16} />
              <span>{t("videoDetail:buttons.copy_link")}</span>
            </button>
          </div>

          <div className="bg-white border border-indigo-100 rounded-lg shadow-sm mb-8 overflow-hidden">
            <div className="border-b border-indigo-100">
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/30 px-4 py-3 border-l-4 border-indigo-500">
                <h3 className="font-medium text-indigo-700 flex items-center">
                  <Clock size={16} className="mr-2" />
                  {t("videoDetail:sections.technical_info")}
                </h3>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-indigo-50/50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-indigo-600 mb-1">
                      {t("videoDetail:info.category")}
                    </p>
                    <p className="font-medium text-gray-800 capitalize">
                      {video.category}
                    </p>
                  </div>

                  <div className="bg-indigo-50/50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-indigo-600 mb-1">
                      {t("videoDetail:info.status")}
                    </p>
                    {video.isSummarized ? (
                      <p className="font-medium text-emerald-600 flex items-center">
                        <FastForward size={14} className="mr-1" />
                        {t("videoDetail:status.summarized")}
                      </p>
                    ) : (
                      <p className="font-medium text-amber-600 flex items-center">
                        <Loader2 size={14} className="mr-1 animate-spin" />
                        {t("videoDetail:status.processing")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/30 px-4 py-3 border-l-4 border-indigo-500">
                <h3 className="font-medium text-indigo-700 flex items-center">
                  <FileText size={16} className="mr-2" />
                  {t("videoDetail:sections.description")}
                </h3>
              </div>

              <div className="p-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed text-sm">
                    {video.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="relative">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-10 backdrop-blur-md bg-white/70 flex flex-col items-center justify-center rounded-lg p-8">
                <div className="text-center max-w-md">
                  <div className="mb-4 bg-indigo-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto">
                    <Lock size={32} className="text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold text-indigo-700 mb-2">
                    {t("videoDetail:auth.locked_content")}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {t("videoDetail:auth.login_message")}
                  </p>
                  <button
                    onClick={handleLoginRedirect}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center mx-auto"
                  >
                    <LogIn size={18} className="mr-2" />
                    {t("videoDetail:buttons.login_now")}
                  </button>
                </div>
              </div>
            )}

            {/* Summary content */}
            <div className={`${!isAuthenticated ? "filter blur-sm" : ""}`}>
              <div className="bg-white border border-indigo-100 rounded-lg shadow-sm mb-6 overflow-hidden">
                <div className="border-b border-indigo-100">
                  <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/30 px-4 py-3 border-l-4 border-indigo-500">
                    <h3 className="font-medium text-indigo-700 flex items-center">
                      <FastForward size={16} className="mr-2" />
                      {t("videoDetail:sections.summary")}
                    </h3>
                  </div>

                  <div className="p-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-700 leading-relaxed">
                        {detailedSummary}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {keyPoints && keyPoints.length > 0 && (
                <div className="bg-white border border-indigo-100 rounded-lg shadow-sm mb-6 overflow-hidden">
                  <div className="border-b border-indigo-100">
                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/30 px-4 py-3 border-l-4 border-indigo-500">
                      <h3 className="font-medium text-indigo-700 flex items-center">
                        <FileText size={16} className="mr-2" />
                        {t("videoDetail:sections.key_points")}
                      </h3>
                    </div>

                    <div className="p-4">
                      <ul className="list-disc pl-5 space-y-2">
                        {keyPoints.map((point, index) => (
                          <li key={index} className="text-gray-700">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {keywords && keywords.length > 0 && (
                <div className="bg-white border border-indigo-100 rounded-lg shadow-sm mb-6 overflow-hidden">
                  <div className="border-b border-indigo-100">
                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/30 px-4 py-3 border-l-4 border-indigo-500">
                      <h3 className="font-medium text-indigo-700 flex items-center">
                        <FileText size={16} className="mr-2" />
                        {t("videoDetail:sections.keywords")}
                      </h3>
                    </div>

                    <div className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {transcript?.chunks && transcript.chunks.length > 0 && (
                <div className="bg-white border border-indigo-100 rounded-lg shadow-sm mb-8 overflow-hidden">
                  <div className="border-b border-indigo-100">
                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/30 px-4 py-3 border-l-4 border-indigo-500">
                      <h3 className="font-medium text-indigo-700 flex items-center">
                        <FileText size={16} className="mr-2" />
                        {t("videoDetail:sections.transcript")}
                      </h3>
                    </div>

                    <div className="p-4">
                      <div className="space-y-3">
                        {transcript.chunks
                          .slice(0, displayedTranscripts)
                          .map((chunk, index) => (
                            <div
                              key={index}
                              className="flex border-b border-gray-100 pb-2 last:border-0"
                            >
                              <div className="w-16 text-xs font-medium text-gray-500 pt-1">
                                {formatTimestamp(chunk.time)}
                              </div>
                              <div className="flex-1 text-gray-700">
                                {chunk.text}
                              </div>
                            </div>
                          ))}
                        {transcript.chunks.length > displayedTranscripts &&
                          isAuthenticated && (
                            <div className="text-center pt-2">
                              <button
                                className="text-indigo-600 text-sm hover:underline"
                                onClick={() =>
                                  setDisplayedTranscripts((prev) => prev + 20)
                                }
                              >
                                {t("videoDetail:buttons.view_more")}
                              </button>
                            </div>
                          )}
                        {displayedTranscripts > 20 &&
                          transcript.chunks.length > 20 &&
                          isAuthenticated && (
                            <div className="text-center pt-2">
                              <button
                                className="text-gray-500 text-sm hover:underline"
                                onClick={() => setDisplayedTranscripts(20)}
                              >
                                {t("videoDetail:buttons.collapse")}
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 mb-6 flex items-center bg-white p-4 border border-gray-200 rounded-lg">
                <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                  {video.creator?.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="ml-3">
                  <h3 className="font-medium">
                    {video.creator?.username ||
                      t("videoDetail:default.unknown_creator")}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {t("videoDetail:original_date")}{" "}
                    {video.createdTime
                      ? new Date(video.createdTime).toLocaleDateString(
                          "vi-VN",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )
                      : t("videoDetail:default.unknown_date")}
                  </p>
                </div>
                <button
                  className="ml-auto bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 text-sm flex items-center"
                  onClick={() => setActiveTab("video")}
                >
                  <Play size={16} className="mr-1" />{" "}
                  {t("videoDetail:buttons.watch_original")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4">
          {t("videoDetail:sections.related_videos")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedVideos.map((relatedVideo) => (
            <VideoCard
              key={relatedVideo.id}
              item={relatedVideo}
              viewMode="grid"
              isSelected={selectedItems.includes(relatedVideo.id)}
              onSelect={toggleSelectItem}
              contentType="video"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
