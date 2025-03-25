import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  Eye,
  Download,
  Bookmark,
  FastForward,
  ChevronLeft,
  Heart,
  Play,
  Pause,
  Link2,
  Lock,
  LogIn,
  Volume2,
  VolumeX,
  Tag,
  Share,
  File,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { VideoCard } from "../components/video/VideoCard";
import { VideoItem, ApiResponse, VideosResponse } from "../types";
import { TabNavigation } from "../components/navigation/TabNavigation";
import { Button } from "../components/ui/Button";
import { toast } from "react-toastify";

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
  const { t } = useTranslation(["common", "videoDetail", "summary"]);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [relatedVideos, setRelatedVideos] = useState<VideoItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"video" | "summary">("video");
  const [detailedSummary, setDetailedSummary] = useState<string>("");
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<Transcript | undefined>(
    undefined
  );
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const { user, isAuthenticated, login } = useKeycloakAuth();

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const [summaryContentTab, setSummaryContentTab] = useState<string>("summary");

  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  const fetchVideoDetails = async (): Promise<void> => {
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
        console.error(error);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching video details:", err);
      setError(t("videoDetail:errors.fetch_failed"));
      setLoading(false);
    }
  };

  const updateVideoViews = async (): Promise<void> => {
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

  const toggleSelectItem = (id: string): void => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleGoBack = (): void => {
    navigate(-1);
  };

  const handleCopyLink = (): void => {
    const url = `${window.location.origin}/videos/${id}`;
    navigator.clipboard.writeText(url);
    toast.success(t("videoDetail:alerts.link_copied"));
  };

  const handleLikeVideo = async (): Promise<void> => {
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

  const handleBookmarkVideo = async (): Promise<void> => {
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

  const handleLoginRedirect = (): void => {
    login();
  };

  const togglePlayPause = (): void => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (): void => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = (): void => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      highlightCurrentTranscript(videoRef.current.currentTime);
    }
  };

  const jumpToTime = (time: number): void => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
      highlightCurrentTranscript(time);
    }
  };

  const highlightCurrentTranscript = (currentTime: number): void => {
    if (
      summaryContentTab === "transcript" &&
      transcriptContainerRef.current &&
      transcript?.chunks
    ) {
      const transcriptItems =
        transcriptContainerRef.current.querySelectorAll(".transcript-item");
      let activeIndex = -1;

      for (let i = 0; i < transcript.chunks.length; i++) {
        const nextIndex = i + 1;
        const currentChunkTime = transcript.chunks[i].time;
        const nextChunkTime =
          nextIndex < transcript.chunks.length
            ? transcript.chunks[nextIndex].time
            : Infinity;

        if (currentTime >= currentChunkTime && currentTime < nextChunkTime) {
          activeIndex = i;
          break;
        }
      }

      transcriptItems.forEach((item, index) => {
        if (index === activeIndex) {
          item.classList.add("bg-indigo-50", "border-l-4", "border-indigo-500");

          const itemRect = item.getBoundingClientRect();
          const containerRect =
            transcriptContainerRef.current?.getBoundingClientRect();

          if (
            containerRect &&
            (itemRect.top < containerRect.top ||
              itemRect.bottom > containerRect.bottom)
          ) {
            item.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        } else {
          item.classList.remove(
            "bg-indigo-50",
            "border-l-4",
            "border-indigo-500"
          );
        }
      });
    }
  };

  const handleLoadedMetadata = (): void => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const summaryTabs = [
    { id: "summary", label: t("summary:preview.summary") },
    { id: "key-points", label: t("summary:preview.key_points") },
  ];

  if (keywords && keywords.length > 0) {
    summaryTabs.push({ id: "keywords", label: t("summary:preview.keywords") });
  }

  if (transcript) {
    summaryTabs.push({
      id: "transcript",
      label: t("summary:preview.transcript"),
    });
  }

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
        <div>
          <div className="relative aspect-video w-full mb-6">
            <video
              ref={videoRef}
              src={video.url}
              className="w-full h-full object-cover rounded-lg"
              poster={video.thumbnail}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            ></video>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <div className="flex items-center justify-between text-white mb-2">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={togglePlayPause}
                    className="hover:text-indigo-300"
                  >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                  </button>
                  <button
                    onClick={toggleMute}
                    className="hover:text-indigo-300"
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <span className="text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex space-x-2">
                  {isAuthenticated ? (
                    <>
                      <button
                        onClick={handleLikeVideo}
                        className={`p-1 rounded-full ${
                          isLiked
                            ? "bg-indigo-600"
                            : "bg-black/30 hover:bg-black/50"
                        }`}
                      >
                        <Heart
                          size={18}
                          className={isLiked ? "fill-white" : ""}
                        />
                      </button>
                      <button
                        onClick={handleBookmarkVideo}
                        className={`p-1 rounded-full ${
                          isBookmarked
                            ? "bg-indigo-600"
                            : "bg-black/30 hover:bg-black/50"
                        }`}
                      >
                        <Bookmark
                          size={18}
                          className={isBookmarked ? "fill-white" : ""}
                        />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleLoginRedirect}
                      className="flex items-center px-2 py-1 bg-indigo-600 rounded text-xs"
                    >
                      <LogIn size={14} className="mr-1" />
                      {t("videoDetail:auth.login")}
                    </button>
                  )}
                  <button
                    onClick={handleCopyLink}
                    className="p-1 rounded-full bg-black/30 hover:bg-black/50"
                  >
                    <Link2 size={18} />
                  </button>
                </div>
              </div>

              <div
                className="w-full bg-gray-600 rounded-full h-1 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickPos = e.clientX - rect.left;
                  const percent = clickPos / rect.width;
                  if (videoRef.current) {
                    videoRef.current.currentTime = percent * duration;
                  }
                }}
              >
                <div
                  className="bg-indigo-600 h-1 rounded-full"
                  style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-semibold mb-4">{video.title}</h1>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-indigo-600 rounded-full overflow-hidden mr-3 flex items-center justify-center text-white">
                {video.creator?.username?.substring(0, 2).toUpperCase() || "U"}
              </div>
              <div>
                <h3 className="font-medium">{video.creator?.username}</h3>
                <div className="text-sm text-gray-500 flex items-center">
                  <Eye size={14} className="mr-1" />
                  {video.views} {t("videoDetail:labels.views")}
                  <span className="mx-2">•</span>
                  <Clock size={14} className="mr-1" />
                  {video.duration}
                </div>
              </div>
            </div>

            <div className="text-black flex space-x-2">
              <a
                href={video.url}
                className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm transition-colors"
              >
                <Download size={16} className="mr-1" />
                {t("videoDetail:buttons.download")}
              </a>
              <div className="text-black flex items-center px-3 py-2 bg-gray-100 rounded-md text-sm">
                <Tag size={16} className="mr-1" />
                {video.category}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-8">
            <p className="whitespace-pre-line text-black">
              {video.description}
            </p>
          </div>

          {relatedVideos.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-4">
                {t("videoDetail:related_videos.title")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedVideos.map((relatedVideo) => (
                  <VideoCard
                    key={relatedVideo.id}
                    item={relatedVideo}
                    viewMode="grid"
                    isSelected={selectedItems.includes(relatedVideo.id)}
                    onSelect={() => toggleSelectItem(relatedVideo.id)}
                    contentType="video"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-black">
                  {t("summary:results.title")}
                </h2>
                <p className="text-sm text-gray-700 mt-1">{video.title}</p>
              </div>
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveTab("video")}
                  type="button"
                >
                  {t("videoDetail:buttons.view_original")}
                </Button>
              </div>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="p-16 text-center">
              <div className="mb-4 bg-indigo-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto">
                <Lock size={32} className="text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-indigo-700 mb-2">
                {t("videoDetail:auth.locked_content")}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {t("videoDetail:auth.login_message")}
              </p>
              <Button
                variant="primary"
                onClick={handleLoginRedirect}
                type="button"
                className="flex items-center mx-auto"
              >
                <LogIn size={18} className="mr-2" />
                {t("videoDetail:buttons.login_now")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row">
              {/* Left panel - Video */}
              <div className="w-full md:w-1/2 p-4">
                <div className="relative rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                  <video
                    ref={videoRef}
                    src={video.url}
                    className="w-full h-auto max-h-96 object-contain bg-black"
                    poster={video.thumbnail}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    muted={isMuted}
                    controls={false}
                  />

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    {/* Video progress bar */}
                    <div
                      className="w-full h-2 bg-gray-700 rounded-full mb-2 cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickPos = e.clientX - rect.left;
                        const percent = clickPos / rect.width;
                        if (videoRef.current) {
                          videoRef.current.currentTime = percent * duration;
                        }
                      }}
                    >
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{
                          width: `${(currentTime / (duration || 1)) * 100}%`,
                        }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={togglePlayPause}
                          className="text-white hover:text-indigo-300 p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
                          type="button"
                        >
                          {isPlaying ? <Pause size={22} /> : <Play size={22} />}
                        </button>

                        <button
                          onClick={toggleMute}
                          className="text-white hover:text-indigo-300 p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
                          type="button"
                        >
                          {isMuted ? (
                            <VolumeX size={22} />
                          ) : (
                            <Volume2 size={22} />
                          )}
                        </button>

                        <span className="text-white text-sm">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <button
                      className={`flex text-black items-center gap-1 px-3 py-1.5 border rounded-md text-sm 
                ${
                  isLiked
                    ? "bg-red-50 border-red-300 text-red-600"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
                      onClick={handleLikeVideo}
                    >
                      <Heart
                        size={16}
                        className={isLiked ? "text-red-600" : ""}
                        fill={isLiked ? "#DC2626" : "none"}
                      />
                      <span>
                        {isLiked
                          ? t("videoDetail:buttons.liked")
                          : t("videoDetail:buttons.like")}
                      </span>
                    </button>
                    <button
                      className={`flex text-black items-center gap-1 px-3 py-1.5 border rounded-md text-sm 
                ${
                  isBookmarked
                    ? "bg-blue-50 border-blue-300 text-blue-600"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
                      onClick={handleBookmarkVideo}
                    >
                      <Bookmark
                        size={16}
                        className={isBookmarked ? "text-blue-600" : ""}
                        fill={isBookmarked ? "#2563EB" : "none"}
                      />
                      <span>
                        {isBookmarked
                          ? t("videoDetail:buttons.bookmarked")
                          : t("videoDetail:buttons.bookmark")}
                      </span>
                    </button>
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-black hover:bg-gray-50"
                      onClick={handleCopyLink}
                    >
                      <Link2 size={16} />
                      <span>{t("videoDetail:buttons.copy_link")}</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock size={18} className="text-gray-600" />
                    <span className="text-sm text-gray-700 font-medium">
                      {t("summary:results.original")}: {video.duration || "N/A"}{" "}
                      |{t("summary:results.summary")}:{" "}
                      {video.metadata?.readingTime || "3-5 min"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right panel - Summary content */}
              <div className="w-full md:w-1/2 p-4 border-l border-gray-200">
                <div className="flex border-b border-gray-200 mb-4">
                  <TabNavigation
                    tabs={summaryTabs}
                    activeTab={summaryContentTab}
                    onTabChange={(tabId) => setSummaryContentTab(tabId)}
                  />
                </div>

                <div
                  className="h-96 overflow-y-auto pr-2 custom-scrollbar"
                  ref={transcriptContainerRef}
                >
                  {summaryContentTab === "summary" && detailedSummary && (
                    <div>
                      <div className="prose max-w-none text-black">
                        {detailedSummary.split("\n").map((paragraph, index) => (
                          <p key={index} className="mb-4 leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {summaryContentTab === "key-points" &&
                    keyPoints &&
                    keyPoints.length > 0 && (
                      <div>
                        <ul className="space-y-4">
                          {keyPoints.map((point, index) => (
                            <li key={index} className="flex items-start">
                              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 font-bold text-sm shadow-sm">
                                {index + 1}
                              </div>
                              <span className="ml-4 text-black">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {summaryContentTab === "keywords" &&
                    keywords &&
                    keywords.length > 0 && (
                      <div>
                        <div className="flex flex-wrap gap-3">
                          {keywords.map((keyword, index) => (
                            <span
                              key={index}
                              className="px-4 py-2 rounded-full bg-gray-100 text-black text-sm font-medium hover:bg-indigo-100 transition-colors shadow-sm"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {summaryContentTab === "transcript" && transcript && (
                    <div>
                      <div className="space-y-1">
                        {transcript.chunks.map((entry, index) => (
                          <div
                            key={index}
                            className="transcript-item flex p-2 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => jumpToTime(entry.time)}
                          >
                            <span className="text-sm text-gray-500 w-16 flex-shrink-0 font-mono">
                              {formatTime(entry.time)}
                            </span>
                            <p className="text-base text-black">{entry.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex space-x-4">
                    <Button
                      variant="outline"
                      leftIcon={<File size={16} />}
                      onClick={() =>
                        window.open(
                          `/v1/videos/summary/${video.id}/download/pdf`,
                          "_blank"
                        )
                      }
                      type="button"
                    >
                      {t("summary:buttons.download_pdf")}
                    </Button>
                    <Button
                      variant="primary"
                      leftIcon={<Share size={16} />}
                      onClick={handleCopyLink}
                      type="button"
                    >
                      {t("summary:buttons.share")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-10">
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
              onSelect={() => toggleSelectItem(relatedVideo.id)}
              contentType="video"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
