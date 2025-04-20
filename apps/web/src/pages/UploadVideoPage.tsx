import React, { useState, ChangeEvent, useEffect } from "react";
import { Layout } from "../components/layout/Layout";
import { ProgressBar } from "../components/ui/ProgressBar";
import { httpClient } from "../config/httpClient";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { EnhancedUploadForm } from "../components/form/EnhancedUploadForm";
import { AuthGate } from "../components/AuthGate";

interface AdvancedOptions {
  keywords: boolean;
  keyPoints: boolean;
  [key: string]: boolean;
}

interface Category {
  id: string;
  name: string;
}

export const UploadVideoPage: React.FC = () => {
  const { t } = useTranslation(["common", "summary", "videos"]);

  const [showAdvancedOptions, setShowAdvancedOptions] =
    useState<boolean>(false);
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptions>({
    keywords: true,
    keyPoints: true,
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [videoDescription, setVideoDescription] = useState<string>("");
  const [videoCategory, setVideoCategory] = useState<string>("technology");
  const [categories, setCategories] = useState<Category[]>([]);

  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await httpClient.get("/v1/categories");
        setCategories(response.data || []);
      } catch (error) {
        setCategories([
          { id: "technology", name: "Technology" },
          { id: "education", name: "Education" },
          { id: "entertainment", name: "Entertainment" },
          { id: "business", name: "Business" },
          { id: "science", name: "Science" },
        ]);
      }
    };

    fetchCategories();
  }, []);

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
    } else {
      setVideoFile(null);

      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
        setVideoPreviewUrl(null);
      }
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
        toast.error(t("summary:errors.invalid_image"));
      }
    } else {
      setThumbnailFile(null);
      setThumbnailPreview(null);
    }
  };

  const handlePublishVideo = async (): Promise<void> => {
    if (!videoFile) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      const { keywords, keyPoints } = advancedOptions;
      formData.append("videoFile", videoFile);
      if (thumbnailFile) {
        formData.append("thumbnailFile", thumbnailFile);
      }
      formData.append("title", videoTitle);
      formData.append("description", videoDescription);
      formData.append("category", videoCategory);
      formData.append("keywords", keywords.toString());
      formData.append("keyPoints", keyPoints.toString());

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

      await httpClient.post("/v1/videos", formData, config);
      toast.success(t("summary:messages.upload_success"));
      resetForm();
      setIsProcessing(false);
    } catch (error) {
      setIsProcessing(false);
      toast.error(t("summary:errors.upload_failed"));
    }
  };

  const resetForm = (): void => {
    setIsProcessing(false);
    setProgress(0);
    setVideoFile(null);
    setVideoTitle("");
    setVideoDescription("");
    setVideoCategory("technology");
    setThumbnailFile(null);
    setThumbnailPreview(null);

    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
  };

  const renderLoadingIndicator = () => (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
        <h3 className="text-lg font-semibold text-black mb-4">
          {t("summary:loading.title")}
        </h3>
        <ProgressBar
          progress={progress}
          height="md"
          color="blue"
          animate={true}
        />
        <div className="mt-3 text-sm text-gray-700">
          <p className="mb-1 font-medium">
            {progress < 50 && t("summary:progress.uploading")}
            {progress >= 50 &&
              progress < 95 &&
              t("summary:progress.processing")}
            {progress >= 95 && t("summary:progress.finishing")}
          </p>
          <p>{t("summary:loading.please_wait")}</p>
        </div>
      </div>
    </div>
  );

  return (
    <AuthGate>
      <Layout activeItem="upload" title={t("summary:page_title.upload")}>
        {isProcessing && renderLoadingIndicator()}

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-black mb-6 border-b pb-3">
                {t("summary:upload.title")}
              </h2>

              <EnhancedUploadForm
                videoFile={videoFile}
                videoPreviewUrl={videoPreviewUrl}
                thumbnailFile={thumbnailFile}
                thumbnailPreview={thumbnailPreview}
                videoTitle={videoTitle}
                videoDescription={videoDescription}
                videoCategory={videoCategory}
                isProcessing={isProcessing}
                progress={progress}
                advancedOptions={advancedOptions}
                showAdvancedOptions={showAdvancedOptions}
                categories={categories}
                onVideoSelect={handleFileSelect}
                onThumbnailSelect={handleThumbnailSelect}
                onTitleChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setVideoTitle(e.target.value)
                }
                onDescriptionChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setVideoDescription(e.target.value)
                }
                onCategoryChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setVideoCategory(e.target.value)
                }
                onAdvancedOptionChange={handleAdvancedOptionChange}
                onToggleAdvancedOptions={() =>
                  setShowAdvancedOptions(!showAdvancedOptions)
                }
                onSubmit={handlePublishVideo}
                onCancel={resetForm}
              />
            </div>
          </div>
        </div>
      </Layout>
    </AuthGate>
  );
};
