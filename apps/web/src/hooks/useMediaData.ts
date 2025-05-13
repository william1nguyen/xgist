import { useState, useEffect } from "react";
import { httpClient } from "../config/httpClient";
import { MediaData, MediaEditState } from "../types/media";

export const useMediaData = (mediaId: string | undefined) => {
  const [state, setState] = useState<MediaEditState>({
    mediaData: {
      id: "",
      title: "",
      description: "",
      thumbnail: "",
      url: "",
      keywords: [],
      keypoints: [],
      summary: "",
      duration: 0,
      category: "",
      transcript: null,
    },
    isLoading: true,
    isSaving: false,
    error: null,
    successMessage: null,
    isPlaying: false,
    isMuted: false,
    activeTab: "transcript",
    isEditingChunk: null,
    editedChunkText: "",
    isEditingFullTranscript: false,
    fullTranscriptText: "",
    keywordInput: "",
    keypointInput: "",
  });

  useEffect(() => {
    if (mediaId) {
      fetchMediaData(mediaId);
    }
  }, [mediaId]);

  const fetchMediaData = async (id: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await httpClient.get(`/v1/media/${id}`);
      const data = response.data.data;

      setState((prev) => ({
        ...prev,
        mediaData: {
          id: data.id || "",
          title: data.title || "",
          description: data.description || "",
          thumbnail: data.thumbnail || "",
          url: data.url || "",
          keywords: data.keywords || [],
          keypoints: data.keypoints || [],
          summary: data.summary || "",
          duration: data.duration || 0,
          category: data.category || "",
          transcript: data.transcript || null,
        },
        fullTranscriptText: data.transcript?.content || "",
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error fetching media data:", error);
      setState((prev) => ({
        ...prev,
        error: "Failed to fetch media data",
        isLoading: false,
      }));
    }
  };

  const updateState = (updates: Partial<MediaEditState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const updateMediaData = (updates: Partial<MediaData>) => {
    setState((prev) => ({
      ...prev,
      mediaData: { ...prev.mediaData, ...updates },
    }));
  };

  return {
    state,
    updateState,
    updateMediaData,
  };
};
