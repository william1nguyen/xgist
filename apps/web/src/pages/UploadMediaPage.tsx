import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MediaUploadState } from "../types/media";
import { toast } from "react-toastify";
import { MediaUploadForm } from "../components/media/MediaUploadForm";
import { categories } from "../types/const";
import { Layout } from "../components/layout/Layout";
import { useTranslation } from "react-i18next";
import { httpClient } from "../config/httpClient";

const defaultState: MediaUploadState = {
  mediaUrl: "",
  thumbnailUrl: "",
  mediaPreviewUrl: null,
  thumbnailPreview: null,
  title: "",
  description: "",
  category: "entertainment",
  advancedOptions: { keywords: false, keyPoints: false },
  isProcessing: false,
  isUploadingMedia: false,
  isUploadingThumbnail: false,
  showAdvancedOptions: false,
  categories: categories,
  transcript: {
    text: "",
    chunks: [],
  },
};

export const UploadMediaPage: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<MediaUploadState>(defaultState);

  const { t } = useTranslation(["common", "summary", "media"]);

  const uploadFile = async (file: File, type: string): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", type);
    const { data } = await httpClient.post("/v1/upload", formData);
    console.log(data);
    return data;
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setState((s) => ({
      ...s,
      mediaPreviewUrl: previewUrl,
      isUploadingMedia: true,
    }));

    try {
      const { url, transcript } = await uploadFile(
        file,
        file.type.includes("video") ? "video" : "audio"
      );
      setState((s) => ({
        ...s,
        mediaUrl: url,
        transcript,
        isUploadingMedia: false,
      }));
      toast.success("Media uploaded");
    } catch (error) {
      toast.error("Upload failed");
      setState((s) => ({
        ...s,
        mediaPreviewUrl: null,
        isUploadingMedia: false,
      }));
    }
  };

  const handleThumbnailSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setState((s) => ({
      ...s,
      thumbnailPreview: previewUrl,
      isUploadingThumbnail: true,
    }));

    try {
      const { url } = await uploadFile(file, "image");
      setState((s) => ({
        ...s,
        thumbnailUrl: url,
        isUploadingThumbnail: false,
      }));
      toast.success("Thumbnail uploaded");
    } catch (error) {
      toast.error("Upload failed");
      setState((s) => ({
        ...s,
        thumbnailPreview: null,
        isUploadingThumbnail: false,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!state.mediaUrl || !state.title) {
      toast.error("Please upload media and enter title");
      return;
    }

    setState((s) => ({ ...s, isProcessing: true }));

    try {
      await httpClient.post("/v1/media", {
        title: state.title,
        mediaType: state.mediaUrl.includes("video") ? "video" : "audio",
        mediaUrl: state.mediaUrl,
        thumbnailUrl: state.thumbnailUrl || "",
        category: state.category,
        description: state.description,
        transcript: state.transcript,
        ...state.advancedOptions,
      });
      toast.success("Media created");
      navigate("/library");
    } catch (error) {
      toast.error("Failed to create media");
      setState((s) => ({ ...s, isProcessing: false }));
    }
  };

  return (
    <Layout activeItem="upload" title={t("summary:page_title.upload")}>
      <div className="container mx-auto px-4 py-8 text-black">
        <h1 className="text-2xl font-bold mb-6">Upload Media</h1>
        <MediaUploadForm
          {...state}
          onMediaSelect={handleMediaSelect}
          onThumbnailSelect={handleThumbnailSelect}
          onRemoveMedia={() =>
            setState((s) => ({ ...s, mediaUrl: "", mediaPreviewUrl: null }))
          }
          onRemoveThumbnail={() =>
            setState((s) => ({
              ...s,
              thumbnailUrl: "",
              thumbnailPreview: null,
            }))
          }
          onFieldChange={(field, value) =>
            setState((s) => ({ ...s, [field]: value }))
          }
          onOptionChange={(option) =>
            setState((s) => ({
              ...s,
              advancedOptions: {
                ...s.advancedOptions,
                [option]: !s.advancedOptions?.[option],
              },
            }))
          }
          onToggleOptions={() =>
            setState((s) => ({
              ...s,
              showAdvancedOptions: !s.showAdvancedOptions,
            }))
          }
          onSubmit={handleSubmit}
          onCancel={() => navigate("/explore")}
        />
      </div>
    </Layout>
  );
};
