import React, { useState, useRef, ChangeEvent } from "react";
import {
  X,
  Upload,
  File,
  ChevronDown,
  Image as ImageIcon,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Info,
  HelpCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProgressBar } from "../ui/ProgressBar";
import { Button } from "../ui/Button";

interface VideoUploadProps {
  videoFile: File | null;
  videoPreviewUrl: string | null;
  thumbnailFile: File | null;
  thumbnailPreview: string | null;
  videoTitle: string;
  videoDescription: string;
  videoCategory: string;
  isProcessing: boolean;
  progress: number;
  advancedOptions: {
    keywords: boolean;
    keyPoints: boolean;
    [key: string]: boolean;
  };
  showAdvancedOptions: boolean;
  categories: Array<{ id: string; name: string }>;
  onVideoSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onThumbnailSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onTitleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onCategoryChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  onAdvancedOptionChange: (option: string) => void;
  onToggleAdvancedOptions: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const EnhancedUploadForm: React.FC<VideoUploadProps> = ({
  videoFile,
  videoPreviewUrl,
  thumbnailPreview,
  videoTitle,
  videoDescription,
  videoCategory,
  isProcessing,
  progress,
  advancedOptions,
  showAdvancedOptions,
  categories,
  onVideoSelect,
  onThumbnailSelect,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onAdvancedOptionChange,
  onToggleAdvancedOptions,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation(["common", "summary", "videos"]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const [showKeywordsTooltip, setShowKeywordsTooltip] =
    useState<boolean>(false);
  const [showKeyPointsTooltip, setShowKeyPointsTooltip] =
    useState<boolean>(false);

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
              const input = fileInputRef.current;
              if (input) input.value = "";
              onVideoSelect({ target: { files: null } } as any);
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
                {progress < 50 && t("summary:progress.uploading")}
                {progress >= 50 &&
                  progress < 95 &&
                  t("summary:progress.processing")}
                {progress >= 95 && t("summary:progress.finishing")}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
          </>
        )}

        <div className="flex justify-between text-xs text-gray-700 mt-2">
          <span>{t("summary:file.selected")}</span>
          <span className="font-medium">
            {(videoFile!.size / (1024 * 1024)).toFixed(2)} MB
          </span>
        </div>
      </div>
    </>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-black mb-4">
            {t("summary:upload.video_section")}
          </h3>

          {!videoFile ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors bg-gray-50"
              onClick={triggerFileInput}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={onVideoSelect}
                accept="video/*"
              />
              <Upload size={48} className="mx-auto text-blue-500 mb-4" />
              <p className="text-base text-black font-medium mb-2">
                {t("summary:dropzone.text")}
              </p>
              <p className="text-sm text-gray-700">
                {t("summary:dropzone.formats")}
              </p>
            </div>
          ) : (
            renderFilePreview()
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-black mb-4">
            {t("summary:upload.thumbnail")}
          </h3>

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
                  onChange={onThumbnailSelect}
                  accept="image/*"
                />
                <ImageIcon size={36} className="text-blue-500 mb-3" />
                <p className="text-sm text-black font-medium mb-1">
                  {t("summary:upload.thumbnail_dropzone")}
                </p>
                <p className="text-xs text-gray-700">
                  {t("summary:upload.thumbnail_formats")}
                </p>
              </div>
            </div>

            {thumbnailPreview ? (
              <div className="relative h-48 rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    const input = thumbnailInputRef.current;
                    if (input) input.value = "";
                    onThumbnailSelect({ target: { files: null } } as any);
                  }}
                  className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 text-white p-1.5 rounded-full hover:bg-opacity-90"
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg border border-gray-300">
                <div className="text-center px-4">
                  <Info size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    {t("summary:upload.preview_here")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {!thumbnailPreview && (
            <p className="text-xs text-gray-700 mt-2">
              {t("summary:upload.auto_thumbnail")}
            </p>
          )}
        </div>
      </div>

      <div className="lg:col-span-5">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-4">
          <h3 className="text-lg font-semibold text-black mb-4">
            {t("summary:upload.video_details")}
          </h3>

          <div className="space-y-5">
            <div>
              <label
                htmlFor="videoTitle"
                className="block text-base font-semibold text-black mb-2"
              >
                {t("summary:upload.video_title")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="videoTitle"
                value={videoTitle}
                onChange={onTitleChange}
                placeholder={t("summary:upload.title_placeholder")}
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
                {t("summary:upload.description")}
              </label>
              <textarea
                id="videoDescription"
                value={videoDescription}
                onChange={onDescriptionChange}
                placeholder={t("summary:upload.description_placeholder")}
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
                {t("summary:upload.category")}
              </label>
              <select
                id="videoCategory"
                value={videoCategory}
                onChange={onCategoryChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                disabled={isProcessing}
              >
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="technology">
                      {t("summary:categories.technology")}
                    </option>
                    <option value="education">
                      {t("summary:categories.education")}
                    </option>
                    <option value="productivity">
                      {t("summary:categories.productivity")}
                    </option>
                    <option value="finance">
                      {t("summary:categories.finance")}
                    </option>
                    <option value="travel">
                      {t("summary:categories.travel")}
                    </option>
                    <option value="health">
                      {t("summary:categories.health")}
                    </option>
                    <option value="other">
                      {t("summary:categories.other")}
                    </option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="mt-6 p-5 bg-gray-50 rounded-lg border border-gray-200 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-black">
                {t("summary:summary_options.title")}
              </h3>
              <button
                type="button"
                onClick={onToggleAdvancedOptions}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium"
                disabled={isProcessing}
              >
                {showAdvancedOptions
                  ? t("summary:advanced_options.hide")
                  : t("summary:advanced_options.show")}{" "}
                <ChevronDown size={16} className="ml-1" />
              </button>
            </div>

            {showAdvancedOptions && (
              <div className="space-y-5 mb-3">
                <div className="relative">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={advancedOptions.keywords}
                      onChange={() => onAdvancedOptionChange("keywords")}
                      className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      disabled={isProcessing}
                    />
                    <span className="ml-3 text-black">
                      {t("summary:advanced_options.extract_keywords")}
                    </span>
                    <button
                      type="button"
                      className="ml-2 text-gray-400 hover:text-gray-600"
                      onMouseEnter={() => setShowKeywordsTooltip(true)}
                      onMouseLeave={() => setShowKeywordsTooltip(false)}
                    >
                      <HelpCircle size={16} />
                    </button>
                  </label>
                  {showKeywordsTooltip && (
                    <div className="absolute left-0 top-8 z-10 p-3 bg-gray-800 text-white text-sm rounded shadow-lg max-w-xs">
                      {t("summary:tooltips.keywords")}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={advancedOptions.keyPoints}
                      onChange={() => onAdvancedOptionChange("keyPoints")}
                      className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      disabled={isProcessing}
                    />
                    <span className="ml-3 text-black">
                      {t("summary:advanced_options.extract_key_points")}
                    </span>
                    <button
                      type="button"
                      className="ml-2 text-gray-400 hover:text-gray-600"
                      onMouseEnter={() => setShowKeyPointsTooltip(true)}
                      onMouseLeave={() => setShowKeyPointsTooltip(false)}
                    >
                      <HelpCircle size={16} />
                    </button>
                  </label>
                  {showKeyPointsTooltip && (
                    <div className="absolute left-0 top-8 z-10 p-3 bg-gray-800 text-white text-sm rounded shadow-lg max-w-xs">
                      {t("summary:tooltips.key_points")}
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-sm text-gray-700 mt-2">
              {t("summary:summary_options.auto_summary")}
            </p>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
            {isProcessing ? (
              <Button variant="outline" onClick={onCancel} type="button">
                {t("summary:buttons.cancel")}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={onSubmit}
                disabled={!videoFile || !videoTitle}
                type="button"
              >
                {t("summary:buttons.publish")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
