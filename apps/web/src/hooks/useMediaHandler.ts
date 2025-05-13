import { useNavigate } from "react-router-dom";
import { httpClient } from "../config/httpClient";
import { MediaData, MediaEditState } from "../types/media";

export const useMediaHandlers = (
  mediaId: string | undefined,
  state: MediaEditState,
  updateState: (updates: Partial<MediaEditState>) => void,
  updateMediaData: (updates: Partial<MediaData>) => void
) => {
  const navigate = useNavigate();

  const startEditingChunk = (index: number, text: string) => {
    updateState({ isEditingChunk: index, editedChunkText: text });
  };

  const saveChunkEdit = (index: number) => {
    if (!state.mediaData.transcript || !state.mediaData.transcript.chunks)
      return;

    const updatedChunks = [...state.mediaData.transcript.chunks];
    updatedChunks[index] = {
      ...updatedChunks[index],
      content: state.editedChunkText.trim(),
    };

    const newTranscript = {
      ...state.mediaData.transcript,
      chunks: updatedChunks,
      text: updatedChunks.map((chunk) => chunk.content).join(" "),
    };

    updateMediaData({ transcript: newTranscript });
    updateState({
      fullTranscriptText: newTranscript.text,
      isEditingChunk: null,
      editedChunkText: "",
    });
  };

  const cancelChunkEdit = () => {
    updateState({ isEditingChunk: null, editedChunkText: "" });
  };

  const toggleFullTranscriptEdit = () => {
    if (state.isEditingFullTranscript && state.mediaData.transcript) {
      const updatedTranscript = {
        ...state.mediaData.transcript,
        text: state.fullTranscriptText.trim(),
      };
      updateMediaData({ transcript: updatedTranscript });
    }
    updateState({ isEditingFullTranscript: !state.isEditingFullTranscript });
  };

  const handleFullTranscriptChange = (value: string) => {
    updateState({ fullTranscriptText: value });
  };

  const handleSave = async () => {
    updateState({ isSaving: true, error: null, successMessage: null });

    try {
      const transcriptData = state.mediaData.transcript
        ? {
            transcript: state.mediaData.transcript,
            chunks: state.mediaData.transcript.chunks,
          }
        : null;

      await httpClient.put(`/v1/media`, {
        mediaId,
        ...transcriptData,
      });

      updateState({ successMessage: "Changes saved successfully" });

      setTimeout(() => {
        navigate(-1);
      }, 1500);
    } catch (error) {
      console.error("Error saving media data:", error);
      updateState({ error: "Failed to save changes" });
    } finally {
      updateState({ isSaving: false });
    }
  };

  const handleDelete = async () => {
    updateState({ isSaving: true, error: null });

    try {
      await httpClient.delete(`/v1/media/${mediaId}`);
      updateState({ successMessage: "Media deleted successfully" });
      navigate("/library");
    } catch (error) {
      console.error("Error deleting media:", error);
      updateState({ error: "Failed to delete media" });
    } finally {
      updateState({ isSaving: false });
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return {
    startEditingChunk,
    saveChunkEdit,
    cancelChunkEdit,
    toggleFullTranscriptEdit,
    handleFullTranscriptChange,
    handleSave,
    handleDelete,
    handleCancel,
  };
};
