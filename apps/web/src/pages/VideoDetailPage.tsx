import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  ThumbsUp,
  Eye,
  Download,
  Share,
  Bookmark,
  FastForward,
  ChevronLeft,
  Heart,
  Play,
  Link2,
  MoreHorizontal,
  Loader2,
  FileText,
} from "lucide-react";
import { VideoCard } from "../components/video/VideoCard";
import { VideoSummary } from "../components/video/VideoSummary";
import { VideoItem, ApiResponse, VideosResponse } from "../types";

import { env } from "../config/env";
import { useKeycloakAuth } from "../hooks/useKeycloakAuth";
import { httpClient } from "../config/httpClient";

interface VideoDetailProps {}

export const VideoDetailPage: React.FC<VideoDetailProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedVideos, setRelatedVideos] = useState<VideoItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"video" | "summary">("video");
  const [detailedSummary, setDetailedSummary] = useState<string>("");
  const [keyPoints, setKeyPoints] = useState<any[]>([]);
  const [mainIdeas, setMainIdeas] = useState<string[]>([]);
  const [mainKeys, setMainKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const { user } = useKeycloakAuth();

  useEffect(() => {
    const fetchVideoDetails = async () => {
      setLoading(true);
      try {
        const res = await httpClient.get(
          `${env.VITE_BASE_URL}/v1/videos/${id}`
        );
        const data = res.data.data.video;
        setVideo(data);
        setIsLiked(data.isLiked?.state);
        setIsBookmarked(data.isBookmarked?.state);

        if (data.isSummarized && data.metadata) {
          setDetailedSummary(data.metadata.summary || "");
          setKeyPoints(data.metadata.transcripts || []);
          setMainIdeas(data.metadata.mainIdeas || []);
          setMainKeys(data.metadata.mainKeys || []);
        }

        const relatedResponse = await httpClient.get<
          ApiResponse<VideosResponse>
        >(
          `${env.VITE_BASE_URL}/v1/videos?category=${data.category}&limit=4&exclude=${data.id}`
        );
        setRelatedVideos(relatedResponse.data.data.videos);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching video details:", err);
        setError("Failed to load video details. Please try again later.");
        setLoading(false);
      }
    };

    if (id) {
      fetchVideoDetails();
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
    const url = `${window.location.origin}/video/${id}`;
    navigator.clipboard.writeText(url);
    alert("Đã sao chép liên kết vào clipboard!");
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

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
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
        <h2 className="text-2xl font-semibold mb-4">Lỗi</h2>
        <p className="mb-6">{error}</p>
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          onClick={handleGoBack}
        >
          Quay lại
        </button>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-semibold mb-4">Không tìm thấy video</h2>
        <p className="mb-6">
          Video bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
        </p>
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          onClick={handleGoBack}
        >
          Quay lại
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
        <span className="ml-1">Quay lại</span>
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
          Video gốc
        </button>
        {video.isSummarized && (
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "summary"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("summary")}
          >
            <div className="flex items-center">
              <FastForward size={14} className="mr-1" />
              Tóm tắt
            </div>
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
                    Xem video
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
                  {video.creator?.username || "Unknown Creator"}
                </h3>
                <p className="text-sm text-gray-500">
                  {video.createdTime
                    ? new Date(video.createdTime).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Unknown date"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center text-sm text-gray-500 mr-4">
                <Eye size={16} className="mr-1" />
                {video.views} lượt xem
              </span>
              <span className="inline-flex items-center text-sm text-gray-500 mr-4">
                <ThumbsUp size={16} className="mr-1" />
                {video.likes} lượt thích
              </span>
              <span className="inline-flex items-center text-sm text-gray-500 mr-4">
                <Clock size={16} className="mr-1" />
                {formatDuration(video.duration)}
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
              onClick={handleLikeVideo}
            >
              <Heart
                size={16}
                className={isLiked ? "text-red-600" : "text-white-600"}
                fill={isLiked ? "#DC2626" : "none"}
              />
              <span>{isLiked ? "Đã thích" : "Thích"}</span>
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
              <Download size={16} />
              <span>Tải xuống</span>
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
              <Share size={16} />
              <span>Chia sẻ</span>
            </button>
            <button
              className={`flex items-center gap-1 px-3 py-1.5 border rounded-md text-sm 
    ${
      isBookmarked
        ? "bg-blue-50 border-blue-300 text-blue-600"
        : "border-gray-300 hover:bg-gray-50 text-white-700"
    }`}
              onClick={handleBookmarkVideo}
            >
              <Bookmark
                size={16}
                className={isBookmarked ? "text-blue-600" : "text-white-600"}
                fill={isBookmarked ? "#2563EB" : "none"}
              />
              <span>{isBookmarked ? "Đã lưu" : "Lưu"}</span>
            </button>
            <button
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              onClick={handleCopyLink}
            >
              <Link2 size={16} />
              <span>Sao chép liên kết</span>
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
              <MoreHorizontal size={16} />
            </button>
          </div>

          <div className="bg-white border border-indigo-100 rounded-lg shadow-sm mb-8 overflow-hidden">
            <div className="border-b border-indigo-100">
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/30 px-4 py-3 border-l-4 border-indigo-500">
                <h3 className="font-medium text-indigo-700 flex items-center">
                  <Clock size={16} className="mr-2" />
                  Thông tin kỹ thuật
                </h3>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-indigo-50/50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-indigo-600 mb-1">
                      Thời lượng
                    </p>
                    <p className="font-medium text-gray-800">
                      {formatDuration(video.duration)}
                    </p>
                  </div>

                  <div className="bg-indigo-50/50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-indigo-600 mb-1">
                      Thể loại
                    </p>
                    <p className="font-medium text-gray-800 capitalize">
                      {video.category}
                    </p>
                  </div>

                  <div className="bg-indigo-50/50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-indigo-600 mb-1">
                      ID Video
                    </p>
                    <p className="font-medium text-xs text-gray-600 truncate">
                      {video.id}
                    </p>
                  </div>

                  <div className="bg-indigo-50/50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-indigo-600 mb-1">
                      Trạng thái
                    </p>
                    {video.isSummarized ? (
                      <p className="font-medium text-emerald-600 flex items-center">
                        <FastForward size={14} className="mr-1" />
                        Đã tóm tắt
                      </p>
                    ) : (
                      <p className="font-medium text-amber-600 flex items-center">
                        <Loader2 size={14} className="mr-1 animate-spin" />
                        Đang xử lý tóm tắt
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
                  Mô tả video
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
          <VideoSummary
            videoId={video.id}
            videoTitle={video.title}
            originalDuration={formatDuration(video.duration)}
            readingTime="3 phút"
            summaryDate={
              video.updatedTime
                ? new Date(video.updatedTime).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Unknown date"
            }
            summaryText={detailedSummary}
            keyPoints={keyPoints.map((point, index) => ({
              timestamp: formatDuration(
                index * Math.floor(video.duration / keyPoints.length)
              ),
              title: `Điểm chính ${index + 1}`,
              content: point,
            }))}
            mainIdeas={mainIdeas}
            mainKeys={mainKeys}
            wordCount={`~${detailedSummary.split(" ").length} từ`}
          />

          <div className="mt-6 mb-6 flex items-center bg-white p-4 border border-gray-200 rounded-lg">
            <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white">
              {video.creator?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="ml-3">
              <h3 className="font-medium">
                {video.creator?.username || "Unknown Creator"}
              </h3>
              <p className="text-xs text-gray-500">
                Video gốc đăng ngày{" "}
                {video.createdTime
                  ? new Date(video.createdTime).toLocaleDateString("vi-VN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Unknown date"}
              </p>
            </div>
            <button
              className="ml-auto bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 text-sm flex items-center"
              onClick={() => setActiveTab("video")}
            >
              <Play size={16} className="mr-1" /> Xem video gốc
            </button>
          </div>
        </>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4">Video liên quan</h3>
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

      {activeTab === "summary" && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FastForward size={16} className="mr-2 text-indigo-600" />
            Tóm tắt liên quan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedVideos
              .filter((v) => v.isSummarized)
              .map((relatedVideo) => (
                <VideoCard
                  key={relatedVideo.id}
                  item={{
                    ...relatedVideo,
                    originalDuration: formatDuration(relatedVideo.duration),
                    readingTime: "2-3 phút",
                    wordCount: "~500 từ",
                  }}
                  viewMode="grid"
                  isSelected={selectedItems.includes(relatedVideo.id)}
                  onSelect={toggleSelectItem}
                  contentType="summary"
                />
              ))}
          </div>
        </div>
      )}

      {video.isSummarized && (
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white py-8 px-6 mt-12 rounded-lg">
          <div className="md:flex items-center justify-between">
            <div className="mb-6 md:mb-0">
              <h3 className="text-xl font-bold mb-2">
                VideoSum.AI - Tiết kiệm thời gian xem video
              </h3>
              <p className="text-indigo-100">
                Tất cả video đều được tự động tóm tắt với công nghệ AI tiên
                tiến, giúp bạn nắm bắt thông tin nhanh hơn đến 90%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
