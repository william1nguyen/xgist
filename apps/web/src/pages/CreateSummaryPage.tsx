import React, { useState, useRef } from "react";
import {
  Clock,
  X,
  Check,
  AlertTriangle,
  Info,
  Youtube,
  Upload,
  Link,
  File,
  FileText,
  List,
  Music,
  ChevronDown,
} from "lucide-react";
import { TabItem } from "../types";
import { TabNavigation } from "../components/navigation/TabNavigation";
import { Layout } from "../components/layout/Layout";
import { Button } from "../components/ui/Button";
import { ProgressBar } from "../components/ui/ProgressBar";

export const CreateSummaryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("summarize");
  const [url, setUrl] = useState<string>("");
  const [summaryType, setSummaryType] = useState<string>("text");
  const [summaryLength, setSummaryLength] = useState<string>("medium");
  const [showAdvancedOptions, setShowAdvancedOptions] =
    useState<boolean>(false);
  const [advancedOptions, setAdvancedOptions] = useState({
    keywords: true,
    chapters: true,
    sentiment: false,
    actionItems: false,
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [uploadMethod, setUploadMethod] = useState<string>("url");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadComplete, setUploadComplete] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [videoDescription, setVideoDescription] = useState<string>("");
  const [videoCategory, setVideoCategory] = useState<string>("technology");
  const [videoTags, setVideoTags] = useState<string>("");
  const [videoVisibility, setVideoVisibility] = useState<string>("public");
  const [previewMode, setPreviewMode] = useState<string>("summary");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: TabItem[] = [
    { id: "summarize", label: "Tóm tắt Video" },
    { id: "upload", label: "Đăng Video" },
  ];

  const handleAdvancedOptionChange = (option: string) => {
    setAdvancedOptions({
      ...advancedOptions,
      [option]: !advancedOptions[option as keyof typeof advancedOptions],
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      simulateUpload();
    }
  };

  const simulateUpload = () => {
    setUploadProgress(0);
    setUploadComplete(false);
    setUploadError(false);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadComplete(true);
          return 100;
        }
        return prev + 5;
      });
    }, 200);
  };

  const simulateProcessing = () => {
    setIsProcessing(true);
    setProgress(0);
    setIsComplete(false);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsComplete(true);
          return 100;
        }
        return prev + 2;
      });
    }, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    simulateProcessing();
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const resetForm = () => {
    setUrl("");
    setIsProcessing(false);
    setIsComplete(false);
    setProgress(0);
    setUploadedFile(null);
    setUploadProgress(0);
    setUploadComplete(false);
    setUploadError(false);
  };

  const previewTabs: TabItem[] = [
    { id: "summary", label: "Tóm tắt" },
    { id: "key-points", label: "Điểm chính" },
  ];

  if (advancedOptions.keywords) {
    previewTabs.push({ id: "keywords", label: "Từ khóa" });
  }

  if (advancedOptions.actionItems) {
    previewTabs.push({ id: "actions", label: "Hành động" });
  }

  previewTabs.push({ id: "transcript", label: "Phiên bản gốc" });

  const headerContent = (
    <TabNavigation
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId)}
    />
  );

  return (
    <Layout
      activeItem="summarize"
      title={activeTab === "summarize" ? "Tạo tóm tắt video" : "Đăng video mới"}
      headerContent={headerContent}
    >
      {activeTab === "summarize" ? (
        <div className="max-w-4xl mx-auto px-4 py-8">
          {!isComplete ? (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6">
                  Tóm tắt video thông minh bằng AI
                </h2>

                <form onSubmit={handleSubmit}>
                  <div className="mb-6">
                    <label
                      htmlFor="url"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      URL Video
                    </label>
                    <input
                      type="text"
                      id="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Dán URL video từ YouTube, Vimeo, hoặc các nền tảng khác"
                      className="w-full px-4 py-3 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={isProcessing}
                      required
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Loại tóm tắt
                    </label>
                    <div className="flex space-x-4">
                      <Button
                        variant={summaryType === "text" ? "primary" : "outline"}
                        onClick={() => setSummaryType("text")}
                        disabled={isProcessing}
                        leftIcon={<FileText size={18} />}
                        fullWidth
                      >
                        Văn bản
                      </Button>
                      <Button
                        variant={
                          summaryType === "bullet" ? "primary" : "outline"
                        }
                        onClick={() => setSummaryType("bullet")}
                        disabled={isProcessing}
                        leftIcon={<List size={18} />}
                        fullWidth
                      >
                        Điểm chính
                      </Button>
                      <Button
                        variant={
                          summaryType === "audio" ? "primary" : "outline"
                        }
                        onClick={() => setSummaryType("audio")}
                        disabled={isProcessing}
                        leftIcon={<Music size={18} />}
                        fullWidth
                      >
                        Âm thanh
                      </Button>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Độ dài tóm tắt
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setShowAdvancedOptions(!showAdvancedOptions)
                        }
                        className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                        disabled={isProcessing}
                      >
                        Tùy chọn nâng cao{" "}
                        <ChevronDown size={16} className="ml-1" />
                      </button>
                    </div>

                    <div className="flex space-x-4">
                      <Button
                        variant={
                          summaryLength === "short" ? "primary" : "outline"
                        }
                        onClick={() => setSummaryLength("short")}
                        disabled={isProcessing}
                        fullWidth
                      >
                        Ngắn
                      </Button>
                      <Button
                        variant={
                          summaryLength === "medium" ? "primary" : "outline"
                        }
                        onClick={() => setSummaryLength("medium")}
                        disabled={isProcessing}
                        fullWidth
                      >
                        Vừa
                      </Button>
                      <Button
                        variant={
                          summaryLength === "long" ? "primary" : "outline"
                        }
                        onClick={() => setSummaryLength("long")}
                        disabled={isProcessing}
                        fullWidth
                      >
                        Dài
                      </Button>
                    </div>
                  </div>

                  {showAdvancedOptions && (
                    <div className="mb-6 p-4 bg-slate-50 rounded-md border border-slate-200">
                      <h3 className="text-sm font-medium text-slate-700 mb-3">
                        Tùy chọn nâng cao
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={advancedOptions.keywords}
                              onChange={() =>
                                handleAdvancedOptionChange("keywords")
                              }
                              className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                              disabled={isProcessing}
                            />
                            <span className="ml-2 text-sm text-slate-700">
                              Trích xuất từ khóa
                            </span>
                          </label>
                        </div>

                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={advancedOptions.chapters}
                              onChange={() =>
                                handleAdvancedOptionChange("chapters")
                              }
                              className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                              disabled={isProcessing}
                            />
                            <span className="ml-2 text-sm text-slate-700">
                              Chia chương mục
                            </span>
                          </label>
                        </div>

                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={advancedOptions.sentiment}
                              onChange={() =>
                                handleAdvancedOptionChange("sentiment")
                              }
                              className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                              disabled={isProcessing}
                            />
                            <span className="ml-2 text-sm text-slate-700">
                              Phân tích cảm xúc
                            </span>
                          </label>
                        </div>

                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={advancedOptions.actionItems}
                              onChange={() =>
                                handleAdvancedOptionChange("actionItems")
                              }
                              className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                              disabled={isProcessing}
                            />
                            <span className="ml-2 text-sm text-slate-700">
                              Tạo mục hành động
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center">
                        {progress < 100 ? (
                          <>Đang xử lý video của bạn</>
                        ) : (
                          <>Xử lý hoàn tất</>
                        )}
                      </h3>
                      <ProgressBar
                        progress={progress}
                        height="md"
                        color="indigo"
                        animate={true}
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>
                          {progress < 30 && "Đang tải video..."}
                          {progress >= 30 &&
                            progress < 60 &&
                            "Đang phân tích nội dung..."}
                          {progress >= 60 &&
                            progress < 90 &&
                            "Đang tạo tóm tắt..."}
                          {progress >= 90 && "Đang hoàn thiện..."}
                        </span>
                        <span>{progress}%</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    {isProcessing ? (
                      <Button variant="outline" onClick={resetForm}>
                        Hủy
                      </Button>
                    ) : (
                      <Button variant="primary" type="submit" disabled={!url}>
                        Tạo tóm tắt
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Kết quả tóm tắt
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Video gốc:{" "}
                      {url || "https://www.youtube.com/watch?v=example"}
                    </p>
                  </div>
                  <div>
                    <Button variant="secondary" size="sm" onClick={resetForm}>
                      Tạo tóm tắt mới
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex border-b border-slate-200">
                <TabNavigation
                  tabs={previewTabs}
                  activeTab={previewMode}
                  onTabChange={(tabId) => setPreviewMode(tabId)}
                />
              </div>

              <div className="p-6">
                {previewMode === "summary" && (
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Clock size={16} className="text-slate-400" />
                      <span className="text-sm text-slate-500">
                        Video gốc: 15:32 | Tóm tắt: 2 phút đọc
                      </span>
                    </div>

                    <div className="prose max-w-none">
                      <p>
                        Trong video này, chuyên gia công nghệ Nguyễn Văn A trình
                        bày về cách trí tuệ nhân tạo đang thay đổi ngành công
                        nghiệp video. Ông tập trung vào ba ứng dụng chính của AI
                        trong lĩnh vực video: tự động tạo phụ đề, tóm tắt nội
                        dung, và cải thiện chất lượng video.
                      </p>

                      <p>
                        Đầu tiên, công nghệ nhận dạng giọng nói đã tiến bộ đáng
                        kể, cho phép tạo phụ đề tự động chính xác cho video với
                        nhiều ngôn ngữ khác nhau. Điều này không chỉ tiết kiệm
                        thời gian mà còn giúp video tiếp cận được nhiều đối
                        tượng hơn, bao gồm cả người khiếm thính và người học
                        ngôn ngữ.
                      </p>

                      <p>
                        Thứ hai, các thuật toán AI có thể phân tích nội dung
                        video và tạo ra các bản tóm tắt ngắn gọn, giúp người xem
                        nhanh chóng nắm bắt thông tin quan trọng mà không cần
                        xem toàn bộ video. Điều này đặc biệt hữu ích trong thời
                        đại thông tin quá tải hiện nay.
                      </p>

                      <p>
                        Cuối cùng, AI cũng đang được sử dụng để cải thiện chất
                        lượng video, từ việc tăng độ phân giải của video cũ đến
                        việc ổn định hình ảnh và cải thiện ánh sáng trong các
                        điều kiện quay khó khăn.
                      </p>

                      <p>
                        Ông Nguyễn kết luận rằng những công nghệ này sẽ tiếp tục
                        phát triển và trở nên phổ biến hơn trong những năm tới,
                        và các công ty nên bắt đầu tích hợp các giải pháp AI vào
                        chiến lược video của họ để duy trì tính cạnh tranh.
                      </p>
                    </div>

                    <div className="mt-6 flex space-x-3">
                      <Button variant="outline" leftIcon={<File size={16} />}>
                        Tải xuống PDF
                      </Button>
                      <Button variant="primary">Chia sẻ</Button>
                    </div>
                  </div>
                )}

                {previewMode === "key-points" && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-3">
                      Điểm chính
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-medium text-xs">
                          1
                        </div>
                        <span className="ml-3 text-slate-700">
                          AI đang thay đổi ngành công nghiệp video qua 3 ứng
                          dụng chính
                        </span>
                      </li>
                      <li className="flex items-start">
                        <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-medium text-xs">
                          2
                        </div>
                        <span className="ml-3 text-slate-700">
                          Công nghệ nhận dạng giọng nói cho phép tạo phụ đề tự
                          động chính xác
                        </span>
                      </li>
                      <li className="flex items-start">
                        <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-medium text-xs">
                          3
                        </div>
                        <span className="ml-3 text-slate-700">
                          Thuật toán AI có thể tạo bản tóm tắt ngắn gọn từ nội
                          dung video dài
                        </span>
                      </li>
                      <li className="flex items-start">
                        <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-medium text-xs">
                          4
                        </div>
                        <span className="ml-3 text-slate-700">
                          AI giúp cải thiện chất lượng video: tăng độ phân giải,
                          ổn định hình ảnh, cải thiện ánh sáng
                        </span>
                      </li>
                      <li className="flex items-start">
                        <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-medium text-xs">
                          5
                        </div>
                        <span className="ml-3 text-slate-700">
                          Các công ty nên tích hợp giải pháp AI vào chiến lược
                          video để duy trì tính cạnh tranh
                        </span>
                      </li>
                    </ul>
                  </div>
                )}

                {previewMode === "keywords" && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-3">
                      Từ khóa chính
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium">
                        Trí tuệ nhân tạo
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium">
                        Nhận dạng giọng nói
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium">
                        Phụ đề tự động
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium">
                        Tóm tắt nội dung
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium">
                        Cải thiện chất lượng video
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium">
                        Nguyễn Văn A
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium">
                        Chiến lược video
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium">
                        Tiếp cận người dùng
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium">
                        Thông tin quá tải
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium">
                        Tăng độ phân giải
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium">
                        Ổn định hình ảnh
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium">
                        Cải thiện ánh sáng
                      </span>
                    </div>
                  </div>
                )}

                {previewMode === "actions" && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-3">
                      Hành động đề xuất
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 font-medium text-xs">
                          <Check size={14} />
                        </div>
                        <span className="ml-3 text-slate-700">
                          Tìm hiểu thêm về các giải pháp AI cho video hiện có
                          trên thị trường
                        </span>
                      </li>
                      <li className="flex items-start">
                        <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 font-medium text-xs">
                          <Check size={14} />
                        </div>
                        <span className="ml-3 text-slate-700">
                          Xem xét tích hợp công nghệ nhận dạng giọng nói để tạo
                          phụ đề tự động
                        </span>
                      </li>
                      <li className="flex items-start">
                        <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 font-medium text-xs">
                          <Check size={14} />
                        </div>
                        <span className="ml-3 text-slate-700">
                          Đánh giá nhu cầu tóm tắt nội dung cho các video dài
                        </span>
                      </li>
                      <li className="flex items-start">
                        <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 font-medium text-xs">
                          <Check size={14} />
                        </div>
                        <span className="ml-3 text-slate-700">
                          Xem xét cách AI có thể cải thiện chất lượng video hiện
                          có
                        </span>
                      </li>
                      <li className="flex items-start">
                        <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 font-medium text-xs">
                          <Check size={14} />
                        </div>
                        <span className="ml-3 text-slate-700">
                          Phát triển chiến lược tích hợp AI vào quy trình sản
                          xuất video
                        </span>
                      </li>
                    </ul>
                  </div>
                )}

                {previewMode === "transcript" && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-slate-700">
                        Phiên bản gốc
                      </h3>
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-slate-700">
                            Hiển thị dấu thời gian
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      <div className="flex">
                        <span className="text-xs text-slate-400 w-16 flex-shrink-0">
                          00:00
                        </span>
                        <p className="text-sm text-slate-700">
                          Xin chào các bạn, tôi là Nguyễn Văn A, và hôm nay tôi
                          sẽ nói về cách mà trí tuệ nhân tạo đang thay đổi ngành
                          công nghiệp video.
                        </p>
                      </div>

                      <div className="flex">
                        <span className="text-xs text-slate-400 w-16 flex-shrink-0">
                          00:18
                        </span>
                        <p className="text-sm text-slate-700">
                          Chúng ta đều biết rằng video đã trở thành một phần
                          không thể thiếu trong cuộc sống hàng ngày của chúng
                          ta, từ giải trí đến giáo dục và kinh doanh.
                        </p>
                      </div>

                      <div className="flex">
                        <span className="text-xs text-slate-400 w-16 flex-shrink-0">
                          00:35
                        </span>
                        <p className="text-sm text-slate-700">
                          Nhưng với lượng nội dung video khổng lồ được tạo ra
                          mỗi ngày, chúng ta đang phải đối mặt với thách thức về
                          thời gian và hiệu quả.
                        </p>
                      </div>

                      <div className="flex">
                        <span className="text-xs text-slate-400 w-16 flex-shrink-0">
                          00:52
                        </span>
                        <p className="text-sm text-slate-700">
                          May mắn thay, AI đang cung cấp giải pháp cho những
                          thách thức này thông qua ba ứng dụng chính mà tôi sẽ
                          thảo luận hôm nay.
                        </p>
                      </div>

                      <div className="flex">
                        <span className="text-xs text-slate-400 w-16 flex-shrink-0">
                          01:10
                        </span>
                        <p className="text-sm text-slate-700">
                          Ứng dụng đầu tiên là khả năng tạo phụ đề tự động. Công
                          nghệ nhận dạng giọng nói đã tiến bộ đáng kể trong
                          những năm gần đây.
                        </p>
                      </div>

                      <div className="flex">
                        <span className="text-xs text-slate-400 w-16 flex-shrink-0">
                          01:28
                        </span>
                        <p className="text-sm text-slate-700">
                          Các thuật toán hiện đại có thể chuyển đổi giọng nói
                          thành văn bản với độ chính xác đáng kinh ngạc, ngay cả
                          trong môi trường ồn ào hoặc với các giọng khó.
                        </p>
                      </div>

                      <div className="flex">
                        <span className="text-xs text-slate-400 w-16 flex-shrink-0">
                          01:45
                        </span>
                        <p className="text-sm text-slate-700">
                          Điều này cho phép tự động tạo phụ đề cho video, tiết
                          kiệm rất nhiều thời gian và công sức so với phương
                          pháp thủ công truyền thống.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                Đăng video mới
              </h2>

              <div className="mb-6">
                <div className="flex space-x-4 mb-4">
                  <Button
                    variant={uploadMethod === "url" ? "primary" : "outline"}
                    onClick={() => setUploadMethod("url")}
                    leftIcon={<Link size={18} />}
                    fullWidth
                  >
                    URL Video
                  </Button>
                  <Button
                    variant={uploadMethod === "file" ? "primary" : "outline"}
                    onClick={() => setUploadMethod("file")}
                    leftIcon={<Upload size={18} />}
                    fullWidth
                  >
                    Tải lên tệp
                  </Button>
                  <Button
                    variant={uploadMethod === "youtube" ? "primary" : "outline"}
                    onClick={() => setUploadMethod("youtube")}
                    leftIcon={<Youtube size={18} />}
                    fullWidth
                  >
                    YouTube
                  </Button>
                </div>

                {uploadMethod === "url" && (
                  <div>
                    <label
                      htmlFor="videoUrl"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Nhập URL video từ bất kỳ nguồn nào
                    </label>
                    <input
                      type="text"
                      id="videoUrl"
                      placeholder="https://example.com/video.mp4"
                      className="w-full px-4 py-3 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}

                {uploadMethod === "file" && (
                  <div>
                    {!uploadedFile ? (
                      <div
                        className="border-2 border-dashed border-slate-300 rounded-md p-6 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                        onClick={triggerFileInput}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={handleFileUpload}
                          accept="video/*"
                        />
                        <Upload
                          size={32}
                          className="mx-auto text-slate-400 mb-2"
                        />
                        <p className="text-sm text-slate-700 mb-1">
                          Kéo thả video vào đây hoặc nhấp để chọn
                        </p>
                        <p className="text-xs text-slate-500">
                          Hỗ trợ MP4, MOV, AVI - Tối đa 2GB
                        </p>
                      </div>
                    ) : (
                      <div className="border border-slate-300 rounded-md p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <File size={20} className="text-slate-400 mr-2" />
                            <span className="text-sm font-medium">
                              {uploadedFile.name}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setUploadedFile(null);
                              setUploadProgress(0);
                              setUploadComplete(false);
                            }}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <ProgressBar
                          progress={uploadProgress}
                          height="sm"
                          color={uploadError ? "red" : "indigo"}
                          animate={true}
                        />

                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span>
                            {uploadError ? (
                              <span className="text-red-500 flex items-center">
                                <AlertTriangle size={12} className="mr-1" /> Lỗi
                                tải lên
                              </span>
                            ) : uploadComplete ? (
                              <span className="text-green-500 flex items-center">
                                <Check size={12} className="mr-1" /> Tải lên
                                hoàn tất
                              </span>
                            ) : (
                              `Đang tải lên... ${uploadProgress}%`
                            )}
                          </span>
                          <span>
                            {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {uploadMethod === "youtube" && (
                  <div>
                    <label
                      htmlFor="youtubeUrl"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Nhập URL video YouTube
                    </label>
                    <input
                      type="text"
                      id="youtubeUrl"
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-4 py-3 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="mt-1 text-xs text-slate-500 flex items-center">
                      <Info size={12} className="mr-1" /> Chỉ có thể nhúng các
                      video YouTube công khai hoặc không liệt kê
                    </p>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label
                  htmlFor="videoTitle"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Tiêu đề video <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="videoTitle"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Nhập tiêu đề video"
                  className="w-full px-4 py-3 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label
                  htmlFor="videoDescription"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Mô tả
                </label>
                <textarea
                  id="videoDescription"
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Mô tả nội dung video của bạn"
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label
                    htmlFor="videoCategory"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Danh mục
                  </label>
                  <select
                    id="videoCategory"
                    value={videoCategory}
                    onChange={(e) => setVideoCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="technology">Công nghệ</option>
                    <option value="education">Giáo dục</option>
                    <option value="productivity">Năng suất</option>
                    <option value="finance">Tài chính</option>
                    <option value="travel">Du lịch</option>
                    <option value="health">Sức khỏe</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="videoVisibility"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Quyền riêng tư
                  </label>
                  <select
                    id="videoVisibility"
                    value={videoVisibility}
                    onChange={(e) => setVideoVisibility(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="public">Công khai</option>
                    <option value="unlisted">Không công khai</option>
                    <option value="private">Riêng tư</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label
                  htmlFor="videoTags"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Thẻ (phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  id="videoTags"
                  value={videoTags}
                  onChange={(e) => setVideoTags(e.target.value)}
                  placeholder="video, tutorial, ai, technology"
                  className="w-full px-4 py-3 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">
                    Tự động tạo tóm tắt cho video này
                  </span>
                </label>
                <p className="mt-1 text-xs text-slate-500 ml-6">
                  AI sẽ tự động tạo tóm tắt và trích xuất điểm chính từ video
                  của bạn
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="secondary" size="sm">
                  Lưu bản nháp
                </Button>

                <div className="flex space-x-3">
                  <Button variant="outline">Xem trước</Button>
                  <Button variant="primary">Đăng video</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
