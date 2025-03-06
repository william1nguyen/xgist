import React, { useState, useRef, ChangeEvent, FormEvent } from "react";
import {
  Clock,
  X,
  Upload,
  File,
  ChevronDown,
  Image as ImageIcon,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { TabItem } from "../types";
import { TabNavigation } from "../components/navigation/TabNavigation";
import { Layout } from "../components/layout/Layout";
import { Button } from "../components/ui/Button";
import { ProgressBar } from "../components/ui/ProgressBar";
import { httpClient } from "../config/httpClient";
import { toast } from "react-toastify";

interface AdvancedOptions {
  keywords: boolean;
  mainIdeas: boolean;
  [key: string]: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface TranscriptEntry {
  timestamp: {
    start: number;
    end: number;
  };
  transcript: string;
}

interface SummaryData {
  id: string;
  summary: string;
  keyPoints: string[];
  keywords?: string[];
  transcripts: TranscriptEntry[];
  originalDuration: string;
  readingTime: string;
}

export const CreateSummaryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("summarize");
  const [showAdvancedOptions, setShowAdvancedOptions] =
    useState<boolean>(false);
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptions>({
    keywords: true,
    mainIdeas: true,
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [videoDescription, setVideoDescription] = useState<string>("");
  const [videoCategory, setVideoCategory] = useState<string>("technology");
  const [previewMode, setPreviewMode] = useState<string>("summary");
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [categories] = useState<Category[]>([]);

  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const tabs: TabItem[] = [
    { id: "summarize", label: "Tóm tắt Video" },
    { id: "upload", label: "Đăng Video" },
  ];

  const handleAdvancedOptionChange = (option: string): void => {
    setAdvancedOptions({
      ...advancedOptions,
      [option]: !advancedOptions[option],
    });
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);

      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      const previewUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(previewUrl);
    }
  };

  const handleThumbnailSelect = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.match("image.*")) {
        setThumbnailFile(file);

        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          setThumbnailPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        toast.error("Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WebP)");
      }
    }
  };

  const togglePlayPause = (): void => {
    if (videoPreviewRef.current) {
      if (isPlaying) {
        videoPreviewRef.current.pause();
      } else {
        videoPreviewRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (): void => {
    if (videoPreviewRef.current) {
      videoPreviewRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSummarizeSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    if (!videoFile) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("videoFile", videoFile);
      if (thumbnailFile) {
        formData.append("thumbnailFile", thumbnailFile);
      }
      formData.append("options", JSON.stringify(advancedOptions));

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent: any) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        },
      };

      const response = await httpClient.post(
        "/v1/videos/summarize",
        formData,
        config
      );

      setIsComplete(true);
      setSummaryData(response.data);
      setIsProcessing(false);
    } catch (error) {
      console.error("Summarize failed:", error);
      setIsProcessing(false);
      toast.error("Tóm tắt video thất bại. Vui lòng thử lại.");
    }
  };

  const uploadVideo = async (): Promise<void> => {
    if (!videoFile) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("videoFile", videoFile);
      if (thumbnailFile) {
        formData.append("thumbnailFile", thumbnailFile);
      }
      formData.append("title", videoTitle);
      formData.append("description", videoDescription);
      formData.append("category", videoCategory);
      formData.append("options", JSON.stringify(advancedOptions));

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent: any) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        },
      };

      const response = await httpClient.post("/v1/videos", formData, config);

      if (activeTab === "summarize") {
        setIsComplete(true);
        setSummaryData(response.data.result);
      } else {
        toast.success("Video đã được đăng thành công!");
        resetForm();
      }

      setIsProcessing(false);
    } catch (error) {
      console.error("Upload failed:", error);
      setIsProcessing(false);
      toast.error("Tải lên video thất bại. Vui lòng thử lại.");
    }
  };

  const handlePublishVideo = (): void => {
    uploadVideo();
  };

  const triggerFileInput = (): void => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const triggerThumbnailInput = (): void => {
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.click();
    }
  };

  const resetForm = (): void => {
    setIsProcessing(false);
    setIsComplete(false);
    setProgress(0);
    setVideoFile(null);
    setVideoTitle("");
    setVideoDescription("");
    setVideoCategory("technology");
    setSummaryData(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);

    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    setIsPlaying(false);
    setIsMuted(false);
  };

  const generatePreviewTabs = (): TabItem[] => {
    const tabs: TabItem[] = [
      { id: "summary", label: "Tóm tắt" },
      { id: "key-points", label: "Điểm chính" },
    ];

    if (advancedOptions.keywords && summaryData?.keywords) {
      tabs.push({ id: "keywords", label: "Từ khóa" });
    }

    tabs.push({ id: "transcript", label: "Phiên bản gốc" });
    return tabs;
  };

  const previewTabs: TabItem[] = generatePreviewTabs();

  const headerContent = (
    <TabNavigation
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId: string) => setActiveTab(tabId)}
    />
  );

  const renderVideoPlayer = () => (
    <div className="relative mb-4 rounded-lg overflow-hidden border border-gray-300 shadow-sm">
      <video
        ref={videoPreviewRef}
        className="w-full h-auto max-h-96 object-contain bg-black"
        src={videoPreviewUrl || undefined}
        poster={thumbnailPreview || undefined}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        muted={isMuted}
        controls={false}
      />

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 flex items-center justify-between">
        <button
          onClick={togglePlayPause}
          className="text-white hover:text-blue-300 p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
          type="button"
        >
          {isPlaying ? <Pause size={22} /> : <Play size={22} />}
        </button>

        <button
          onClick={toggleMute}
          className="text-white hover:text-blue-300 p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
          type="button"
        >
          {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
        </button>
      </div>
    </div>
  );

  const renderFilePreview = () => (
    <>
      {videoPreviewUrl && renderVideoPlayer()}

      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <File size={20} className="text-gray-600 mr-2" />
            <span className="text-sm font-medium text-black">
              {videoFile!.name}
            </span>
          </div>
          <button
            onClick={() => {
              setVideoFile(null);
              if (videoPreviewUrl) {
                URL.revokeObjectURL(videoPreviewUrl);
                setVideoPreviewUrl(null);
              }
            }}
            className="text-gray-600 hover:text-red-600 p-1 rounded-full hover:bg-gray-200"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {isProcessing && (
          <>
            <ProgressBar
              progress={progress}
              height="sm"
              color="blue"
              animate={true}
            />
            <div className="flex justify-between text-xs text-gray-700 mt-2">
              <span className="font-medium">
                {progress < 50 && "Đang tải lên video..."}
                {progress >= 50 && progress < 95 && "Đang xử lý video..."}
                {progress >= 95 && "Hoàn tất"}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
          </>
        )}

        <div className="flex justify-between text-xs text-gray-700 mt-2">
          <span>Đã chọn video</span>
          <span className="font-medium">
            {(videoFile!.size / (1024 * 1024)).toFixed(2)} MB
          </span>
        </div>
      </div>
    </>
  );

  const renderLoadingIndicator = () => (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
        <h3 className="text-lg font-semibold text-black mb-4">
          Đang xử lý video
        </h3>
        <ProgressBar
          progress={progress}
          height="md"
          color="blue"
          animate={true}
        />
        <div className="mt-3 text-sm text-gray-700">
          <p className="mb-1 font-medium">
            {progress < 50 && "Đang tải lên video..."}
            {progress >= 50 && progress < 95 && "Đang xử lý video..."}
            {progress >= 95 && "Đang hoàn tất..."}
          </p>
          <p>Vui lòng đợi trong giây lát.</p>
        </div>
      </div>
    </div>
  );

  return (
    <Layout
      activeItem="summarize"
      title={activeTab === "summarize" ? "Tạo tóm tắt video" : "Đăng video mới"}
      headerContent={headerContent}
    >
      {isProcessing && renderLoadingIndicator()}

      {activeTab === "summarize" ? (
        <div className="max-w-5xl mx-auto px-4 py-6">
          {!isComplete ? (
            <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-black mb-6 border-b pb-3">
                  Tóm tắt video thông minh bằng AI
                </h2>

                <form onSubmit={handleSummarizeSubmit} className="space-y-6">
                  <div>
                    {!videoFile ? (
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors bg-gray-50"
                        onClick={triggerFileInput}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={handleFileSelect}
                          accept="video/*"
                        />
                        <Upload
                          size={48}
                          className="mx-auto text-blue-500 mb-4"
                        />
                        <p className="text-base text-black font-medium mb-2">
                          Kéo thả video vào đây hoặc nhấp để chọn
                        </p>
                        <p className="text-sm text-gray-700">
                          Hỗ trợ MP4, MOV, AVI - Tối đa 50MB
                        </p>
                      </div>
                    ) : (
                      renderFilePreview()
                    )}
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-base font-semibold text-black">
                        Tùy chọn nâng cao
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setShowAdvancedOptions(!showAdvancedOptions)
                        }
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium"
                        disabled={isProcessing}
                      >
                        {showAdvancedOptions
                          ? "Ẩn tùy chọn"
                          : "Hiển thị tùy chọn"}{" "}
                        <ChevronDown size={16} className="ml-1" />
                      </button>
                    </div>

                    {showAdvancedOptions && (
                      <div className="p-5 bg-gray-50 rounded-lg border border-gray-200 mt-2 shadow-inner">
                        <div className="space-y-5">
                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={advancedOptions.keywords}
                                onChange={() =>
                                  handleAdvancedOptionChange("keywords")
                                }
                                className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                disabled={isProcessing}
                              />
                              <span className="ml-3 text-black">
                                Trích xuất từ khóa
                              </span>
                            </label>
                          </div>

                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={advancedOptions.mainIdeas}
                                onChange={() =>
                                  handleAdvancedOptionChange("mainIdeas")
                                }
                                className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                disabled={isProcessing}
                              />
                              <span className="ml-3 text-black">
                                Trích xuất ý chính
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                    {isProcessing ? (
                      <Button
                        variant="outline"
                        onClick={resetForm}
                        type="button"
                      >
                        Hủy
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={!videoFile}
                      >
                        Tạo tóm tắt
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-black">
                      Kết quả tóm tắt
                    </h2>
                    <p className="text-sm text-gray-700 mt-1">
                      {videoFile?.name || "Video của bạn"}
                    </p>
                  </div>
                  <div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={resetForm}
                      type="button"
                    >
                      Tạo tóm tắt mới
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex border-b border-gray-200 bg-gray-50">
                <TabNavigation
                  tabs={previewTabs}
                  activeTab={previewMode}
                  onTabChange={(tabId: string) => setPreviewMode(tabId)}
                />
              </div>

              <div className="p-6">
                {previewMode === "summary" && summaryData?.summary && (
                  <div>
                    <div className="flex items-center space-x-2 mb-5 pb-3 border-b border-gray-100">
                      <Clock size={18} className="text-gray-600" />
                      <span className="text-sm text-gray-700 font-medium">
                        Video gốc: {summaryData.originalDuration || "N/A"} | Tóm
                        tắt: {summaryData.readingTime || "N/A"}
                      </span>
                    </div>

                    <div className="prose max-w-none text-black">
                      {summaryData.summary
                        .split("\n")
                        .map((paragraph: string, index: number) => (
                          <p key={index} className="mb-4 leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                    </div>

                    <div className="mt-8 flex space-x-4 pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        leftIcon={<File size={16} />}
                        onClick={() =>
                          window.open(
                            `/v1/videos/summary/${summaryData.id}/download/pdf`,
                            "_blank"
                          )
                        }
                        type="button"
                      >
                        Tải xuống PDF
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            window.location.origin +
                              `/summary/${summaryData.id}`
                          );
                          toast.success(
                            "Đã sao chép đường dẫn tóm tắt vào clipboard"
                          );
                        }}
                        type="button"
                      >
                        Chia sẻ
                      </Button>
                    </div>
                  </div>
                )}

                {previewMode === "key-points" && summaryData?.keyPoints && (
                  <div>
                    <h3 className="text-lg font-semibold text-black mb-4 pb-2 border-b border-gray-100">
                      Điểm chính
                    </h3>
                    <ul className="space-y-4">
                      {summaryData.keyPoints.map(
                        (point: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-sm shadow-sm">
                              {index + 1}
                            </div>
                            <span className="ml-4 text-black">{point}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {previewMode === "keywords" && summaryData?.keywords && (
                  <div>
                    <h3 className="text-lg font-semibold text-black mb-4 pb-2 border-b border-gray-100">
                      Từ khóa chính
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {summaryData.keywords.map(
                        (keyword: string, index: number) => (
                          <span
                            key={index}
                            className="px-4 py-2 rounded-full bg-gray-100 text-black text-sm font-medium hover:bg-blue-100 transition-colors shadow-sm"
                          >
                            {keyword}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {previewMode === "transcript" && summaryData?.transcripts && (
                  <div>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                      <h3 className="text-lg font-semibold text-black">
                        Phiên bản gốc
                      </h3>
                      <div className="flex items-center space-x-2"></div>
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto pr-3 pb-2 custom-scrollbar">
                      {summaryData.transcripts.map(
                        (entry: TranscriptEntry, index: number) => (
                          <div key={index} className="flex">
                            <span className="text-sm text-gray-500 w-16 flex-shrink-0 font-mono">
                              {entry.timestamp.start.toFixed(2)}
                            </span>
                            <p className="text-base text-black">
                              {entry.transcript}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-black mb-6 border-b pb-3">
                Đăng video mới
              </h2>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  {!videoFile ? (
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors bg-gray-50"
                      onClick={triggerFileInput}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                        accept="video/*"
                      />
                      <Upload
                        size={48}
                        className="mx-auto text-blue-500 mb-4"
                      />
                      <p className="text-base text-black font-medium mb-2">
                        Kéo thả video vào đây hoặc nhấp để chọn
                      </p>
                      <p className="text-sm text-gray-700">
                        Hỗ trợ MP4, MOV, AVI - Tối đa 50MB
                      </p>
                    </div>
                  ) : (
                    renderFilePreview()
                  )}
                </div>

                <div className="mt-2">
                  <label className="block text-base font-semibold text-black mb-3">
                    Ảnh thumbnail
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors h-48 flex flex-col items-center justify-center bg-gray-50"
                        onClick={triggerThumbnailInput}
                      >
                        <input
                          type="file"
                          ref={thumbnailInputRef}
                          className="hidden"
                          onChange={handleThumbnailSelect}
                          accept="image/*"
                        />
                        <ImageIcon size={36} className="text-blue-500 mb-3" />
                        <p className="text-sm text-black font-medium mb-1">
                          Kéo thả ảnh thumbnail hoặc nhấp để chọn
                        </p>
                        <p className="text-xs text-gray-700">
                          Khuyến nghị: JPG, PNG - Tỷ lệ 16:9
                        </p>
                      </div>
                    </div>

                    {thumbnailPreview && (
                      <div className="relative h-48 rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            setThumbnailFile(null);
                            setThumbnailPreview(null);
                          }}
                          className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 text-white p-1.5 rounded-full hover:bg-opacity-90"
                          type="button"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {!thumbnailPreview && (
                    <p className="text-xs text-gray-700 mt-2">
                      Nếu không tải lên thumbnail, hệ thống sẽ tự động tạo
                      thumbnail từ video của bạn
                    </p>
                  )}
                </div>

                <div className="space-y-5 mt-4">
                  <div>
                    <label
                      htmlFor="videoTitle"
                      className="block text-base font-semibold text-black mb-2"
                    >
                      Tiêu đề video <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="videoTitle"
                      value={videoTitle}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setVideoTitle(e.target.value)
                      }
                      placeholder="Nhập tiêu đề video"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      required
                      disabled={isProcessing}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="videoDescription"
                      className="block text-base font-semibold text-black mb-2"
                    >
                      Mô tả
                    </label>
                    <textarea
                      id="videoDescription"
                      value={videoDescription}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                        setVideoDescription(e.target.value)
                      }
                      placeholder="Mô tả nội dung video của bạn"
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      disabled={isProcessing}
                    ></textarea>
                  </div>

                  <div>
                    <label
                      htmlFor="videoCategory"
                      className="block text-base font-semibold text-black mb-2"
                    >
                      Danh mục
                    </label>
                    <select
                      id="videoCategory"
                      value={videoCategory}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setVideoCategory(e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      disabled={isProcessing}
                    >
                      {categories.length > 0 ? (
                        categories.map((category: Category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="technology">Công nghệ</option>
                          <option value="education">Giáo dục</option>
                          <option value="productivity">Năng suất</option>
                          <option value="finance">Tài chính</option>
                          <option value="travel">Du lịch</option>
                          <option value="health">Sức khỏe</option>
                          <option value="other">Khác</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="mt-4 p-5 bg-gray-50 rounded-lg border border-gray-200 shadow-inner">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-black">
                      Tùy chọn tóm tắt
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setShowAdvancedOptions(!showAdvancedOptions)
                      }
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium"
                      disabled={isProcessing}
                    >
                      {showAdvancedOptions
                        ? "Ẩn tùy chọn"
                        : "Hiển thị tùy chọn"}{" "}
                      <ChevronDown size={16} className="ml-1" />
                    </button>
                  </div>

                  {showAdvancedOptions && (
                    <div className="space-y-5 mb-3">
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={advancedOptions.keywords}
                            onChange={() =>
                              handleAdvancedOptionChange("keywords")
                            }
                            className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            disabled={isProcessing}
                          />
                          <span className="ml-3 text-black">
                            Trích xuất từ khóa
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={advancedOptions.mainIdeas}
                            onChange={() =>
                              handleAdvancedOptionChange("mainIdeas")
                            }
                            className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            disabled={isProcessing}
                          />
                          <span className="ml-3 text-black">
                            Trích xuất ý chính
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-gray-700 mt-2">
                    Video của bạn sẽ được tự động tóm tắt bằng AI khi đăng lên
                  </p>
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                  {isProcessing ? (
                    <Button variant="outline" onClick={resetForm} type="button">
                      Hủy
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={handlePublishVideo}
                      disabled={!videoFile || !videoTitle}
                      type="button"
                    >
                      Đăng video
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
