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
  MessageSquare,
  Play,
  Link2,
  MoreHorizontal,
} from "lucide-react";
import { VideoCard, VideoItem } from "../components/video/VideoCard";
import { VideoSummary } from "../components/video/VideoSummary";

interface VideoDetailProps {}

export const VideoDetailPage: React.FC<VideoDetailProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedVideos, setRelatedVideos] = useState<VideoItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<"video" | "summary">("video");

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
    {
      id: 7,
      title: "Cách xây dựng thói quen tập thể dục đều đặn",
      thumbnail: "https://via.placeholder.com/600x340",
      duration: "16:50",
      views: "12.1K",
      likes: 950,
      category: "health",
      creator: "Fitness Coach",
      creatorAvatar: "FC",
      createdAt: "2024-02-21",
      summarized: false,
      size: "480 MB",
      format: "MP4",
      resolution: "1080p",
    },
    {
      id: 8,
      title: "TOP 10 công cụ AI miễn phí giúp tăng năng suất làm việc",
      thumbnail: "https://via.placeholder.com/600x340",
      duration: "14:25",
      views: "36.9K",
      likes: 2780,
      category: "technology",
      creator: "AI Enthusiast",
      creatorAvatar: "AE",
      createdAt: "2024-02-19",
      summarized: true,
      size: "380 MB",
      format: "MP4",
      resolution: "1080p",
    },
  ];

  const videoDescription = {
    full: "Trong video này, chúng ta sẽ khám phá những khái niệm cơ bản về Machine Learning và cách áp dụng vào thực tế. Bạn sẽ hiểu được sự khác biệt giữa Supervised Learning, Unsupervised Learning và Reinforcement Learning. Chúng ta cũng sẽ thảo luận về các ứng dụng phổ biến của Machine Learning trong các lĩnh vực như y tế, tài chính, marketing và nhiều lĩnh vực khác. Video này phù hợp cho người mới bắt đầu tìm hiểu về Machine Learning.",
    summarized:
      "Tổng quan về Machine Learning, giải thích các loại học máy chính (Supervised, Unsupervised, Reinforcement Learning) và ứng dụng thực tế trong các ngành y tế, tài chính, marketing. Video này dành cho người mới bắt đầu tìm hiểu về Machine Learning.",
  };

  const detailedSummary = `Machine Learning là một nhánh của trí tuệ nhân tạo (AI) cho phép máy tính học hỏi từ dữ liệu và đưa ra dự đoán hoặc quyết định mà không cần được lập trình cụ thể. Video này trình bày tổng quan về các phương pháp Machine Learning cơ bản và ứng dụng của chúng.

Supervised Learning (Học có giám sát): 
- Phương pháp này sử dụng dữ liệu đã được gán nhãn để huấn luyện mô hình.
- Mô hình học cách ánh xạ đầu vào với đầu ra mong muốn.
- Ví dụ: phân loại email spam, nhận dạng hình ảnh, dự đoán giá nhà.

Unsupervised Learning (Học không giám sát):
- Phương pháp này sử dụng dữ liệu không được gán nhãn.
- Mô hình tự tìm ra cấu trúc hoặc mẫu (pattern) trong dữ liệu.
- Ví dụ: phân cụm khách hàng, phát hiện bất thường, giảm chiều dữ liệu.

Reinforcement Learning (Học tăng cường):
- Phương pháp này dựa trên tương tác với môi trường và nhận phần thưởng.
- Mô hình học cách thực hiện các hành động để tối đa hóa phần thưởng.
- Ví dụ: AI chơi game, robot tự động, xe tự lái.

Ứng dụng thực tế của Machine Learning:
1. Y tế: chẩn đoán bệnh, dự đoán kết quả điều trị, phát hiện dấu hiệu bất thường từ hình ảnh y tế.
2. Tài chính: phát hiện gian lận, đánh giá rủi ro tín dụng, dự đoán thị trường chứng khoán.
3. Marketing: phân khúc khách hàng, hệ thống đề xuất sản phẩm, tối ưu hóa chiến dịch.
4. Giao thông: xe tự lái, tối ưu hóa luồng giao thông, dự đoán tắc nghẽn.

Để bắt đầu với Machine Learning, cần có kiến thức cơ bản về thống kê, đại số tuyến tính và kỹ năng lập trình (Python được khuyến nghị). Các thư viện phổ biến bao gồm TensorFlow, PyTorch và scikit-learn.`;

  const keyPoints = [
    {
      timestamp: "01:20",
      title: "Giới thiệu về Machine Learning",
      content:
        "Machine Learning là một nhánh của AI cho phép máy tính học từ dữ liệu và đưa ra dự đoán hoặc quyết định mà không cần lập trình rõ ràng. Điểm khác biệt so với lập trình truyền thống là máy tính tự học từ dữ liệu thay vì được chỉ dẫn cụ thể cách giải quyết vấn đề.",
    },
    {
      timestamp: "04:35",
      title: "Supervised Learning",
      content:
        "Học có giám sát là phương pháp huấn luyện mô hình dựa trên dữ liệu đã được gán nhãn, giúp mô hình học cách ánh xạ đầu vào với đầu ra mong muốn. Ví dụ phổ biến bao gồm phân loại (phân loại email thành spam hoặc không spam) và hồi quy (dự đoán giá nhà dựa trên các đặc điểm).",
    },
    {
      timestamp: "07:50",
      title: "Unsupervised Learning",
      content:
        "Học không giám sát là phương pháp huấn luyện mô hình trên dữ liệu không được gán nhãn, giúp mô hình tìm ra cấu trúc hay pattern trong dữ liệu. Các kỹ thuật phổ biến bao gồm phân cụm (clustering), giảm chiều dữ liệu và phát hiện bất thường.",
    },
    {
      timestamp: "10:20",
      title: "Reinforcement Learning",
      content:
        "Học tăng cường là phương pháp huấn luyện mô hình thông qua tương tác với môi trường và nhận phần thưởng, giúp mô hình học cách tối ưu hóa hành động. Phương pháp này thường được áp dụng trong AI chơi game, robot tự động và các hệ thống ra quyết định phức tạp.",
    },
    {
      timestamp: "12:45",
      title: "Ứng dụng trong y tế",
      content:
        "Machine Learning giúp chẩn đoán bệnh, dự đoán kết quả điều trị và phát hiện các dấu hiệu bất thường từ hình ảnh y tế. Các mô hình có thể phân tích hình ảnh X-quang, CT scan để phát hiện ung thư, dự đoán nguy cơ mắc bệnh, và hỗ trợ bác sĩ trong việc đưa ra quyết định điều trị.",
    },
    {
      timestamp: "15:10",
      title: "Ứng dụng trong tài chính",
      content:
        "Machine Learning được sử dụng để phát hiện giao dịch gian lận, đánh giá rủi ro tín dụng, tối ưu hóa danh mục đầu tư và dự đoán xu hướng thị trường. Các thuật toán có thể xử lý lượng lớn dữ liệu tài chính và phát hiện các mẫu mà con người khó nhận ra.",
    },
    {
      timestamp: "18:25",
      title: "Công cụ và ngôn ngữ lập trình phổ biến",
      content:
        "Python là ngôn ngữ lập trình phổ biến nhất cho Machine Learning với các thư viện như TensorFlow, PyTorch, scikit-learn. R cũng là một lựa chọn tốt cho phân tích thống kê. Các công cụ như Jupyter Notebook, Google Colab giúp phát triển và thử nghiệm mô hình dễ dàng hơn.",
    },
  ];

  useEffect(() => {
    setLoading(true);

    setTimeout(() => {
      if (id) {
        const videoId = parseInt(id);
        const foundVideo = videos.find((v) => v.id === videoId);

        if (foundVideo) {
          setVideo(foundVideo);

          // Set related videos (same category or random if not enough)
          const sameCategory = videos.filter(
            (v) => v.id !== videoId && v.category === foundVideo.category
          );

          const otherVideos = videos.filter(
            (v) => v.id !== videoId && v.category !== foundVideo.category
          );

          const related = [...sameCategory];

          // Add random videos if needed to get 4 related videos
          while (related.length < 4 && otherVideos.length > 0) {
            const randomIndex = Math.floor(Math.random() * otherVideos.length);
            related.push(otherVideos[randomIndex]);
            otherVideos.splice(randomIndex, 1);
          }

          setRelatedVideos(related.slice(0, 4));
        } else {
          navigate("/not-found");
        }
      }

      setLoading(false);
    }, 1500);
  }, [id, navigate]);

  const toggleSelectItem = (id: number) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleSummarizeVideo = () => {
    if (video?.summarized) {
      setActiveTab("summary");
    } else {
      setLoading(true);
      setTimeout(() => {
        if (video) {
          setVideo({
            ...video,
            summarized: true,
          });
          setActiveTab("summary");
        }
        setLoading(false);
      }, 2000);
    }
  };

  const handleSummarizeNewVideo = () => {
    navigate("/summarize");
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/video/${id}`;
    navigator.clipboard.writeText(url);
    alert("Đã sao chép liên kết vào clipboard!");
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

      {/* Tabs */}
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
        {video.summarized && (
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
            <div className="text-center text-white">
              <div className="mb-4">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center mx-auto">
                <Play size={18} className="mr-2" />
                Xem video
              </button>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-4">{video.title}</h1>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                {video.creatorAvatar}
              </div>
              <div className="ml-3">
                <h3 className="font-medium">{video.creator}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(video.createdAt).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
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
                {video.duration}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
              <Heart size={16} />
              <span>Thích</span>
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
              <Download size={16} />
              <span>Tải xuống</span>
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
              <Share size={16} />
              <span>Chia sẻ</span>
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
              <Bookmark size={16} />
              <span>Lưu</span>
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

          {/* Video information */}
          <div className="bg-gray-50 p-4 rounded-lg mb-8">
            <div className="mb-4">
              <h3 className="font-medium mb-2">Thông tin kỹ thuật</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Kích thước</p>
                  <p className="font-medium">{video.size}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Định dạng</p>
                  <p className="font-medium">{video.format}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Độ phân giải</p>
                  <p className="font-medium">{video.resolution}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Trạng thái</p>
                  <p className="font-medium">
                    {video.summarized ? (
                      <span className="flex items-center text-indigo-600">
                        <FastForward size={14} className="mr-1" />
                        Đã tóm tắt
                      </span>
                    ) : (
                      "Chưa tóm tắt"
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Mô tả video</h3>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm">{videoDescription.full}</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <MessageSquare size={16} className="mr-2" />
              Bình luận
            </h3>
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <p className="text-gray-500 mb-4">
                Chức năng bình luận đang được phát triển
              </p>
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                Đăng nhập để bình luận
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <VideoSummary
            videoId={video.id}
            videoTitle={video.title}
            originalDuration={video.duration || "15:00"}
            readingTime="3 phút"
            summaryDate={new Date(
              new Date(video.createdAt).getTime() + 86400000
            ).toLocaleDateString("vi-VN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            summaryText={detailedSummary}
            keyPoints={keyPoints}
            wordCount="~600 từ"
          />

          <div className="mt-6 mb-6 flex items-center bg-white p-4 border border-gray-200 rounded-lg">
            <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white">
              {video.creatorAvatar}
            </div>
            <div className="ml-3">
              <h3 className="font-medium">{video.creator}</h3>
              <p className="text-xs text-gray-500">
                Video gốc đăng ngày{" "}
                {new Date(video.createdAt).toLocaleDateString("vi-VN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
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
              .filter((v) => v.summarized)
              .map((relatedVideo) => (
                <VideoCard
                  key={relatedVideo.id}
                  item={{
                    ...relatedVideo,
                    originalDuration: relatedVideo.duration,
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

      {!video.summarized && (
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white py-8 px-6 mt-12 rounded-lg">
          <div className="md:flex items-center justify-between">
            <div className="mb-6 md:mb-0">
              <h3 className="text-xl font-bold mb-2">
                Muốn tiết kiệm thời gian?
              </h3>
              <p className="text-indigo-100">
                Tóm tắt video này và tiết kiệm đến 90% thời gian xem với công
                nghệ AI
              </p>
            </div>
            <button
              className="bg-white text-indigo-700 px-4 py-2 rounded-md hover:bg-gray-100 flex items-center"
              onClick={handleSummarizeVideo}
            >
              <FastForward size={18} className="mr-2" />
              Tóm tắt video này
            </button>
          </div>
        </div>
      )}

      {video.summarized && (
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white py-8 px-6 mt-12 rounded-lg">
          <div className="md:flex items-center justify-between">
            <div className="mb-6 md:mb-0">
              <h3 className="text-xl font-bold mb-2">
                Tóm tắt video của riêng bạn
              </h3>
              <p className="text-indigo-100">
                Tiết kiệm thời gian xem video với VideoSum.AI - Nền tảng tóm tắt
                video bằng AI
              </p>
            </div>
            <button
              className="bg-white text-indigo-700 px-4 py-2 rounded-md hover:bg-gray-100 flex items-center"
              onClick={handleSummarizeNewVideo}
            >
              <FastForward size={18} className="mr-2" />
              Tóm tắt video khác
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
