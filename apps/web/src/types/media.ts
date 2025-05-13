import { ChangeEvent } from "react";
import { User } from "./user";

export interface Media {
  id: string;
  userId: string;
  url: string;
  thumbnail: string;
  title: string;
  description: string;
  category: string;
  duration: number;
  views: number;
  likes: number;
  isSummarized: boolean;
  isLiked: { state: boolean };
  isBookmarked: { state: boolean };
  creator: User;
  metadata?: any;
  createdTime: string | null;
  updatedTime: string | null;
  deletedTime: string | null;
}

export interface MediaUploadData {
  mediaUrl: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  category: string;
  advancedOptions: Record<string, boolean>;
}

export interface MediaUploadState extends Partial<MediaUploadData> {
  isProcessing: boolean;
  isUploadingMedia: boolean;
  isUploadingThumbnail: boolean;
  mediaPreviewUrl: string | null;
  thumbnailPreview: string | null;
  showAdvancedOptions: boolean;
  categories: Array<{ id: string; name: string }>;
  transcript: {
    text: string;
    chunks: Array<{
      time: number;
      text: string;
    }>;
  } | null;
}

export interface MediaUploadHandlers {
  onMediaSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onThumbnailSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveMedia: () => void;
  onRemoveThumbnail: () => void;
  onFieldChange: (field: string, value: string) => void;
  onOptionChange: (option: string) => void;
  onToggleOptions: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export interface MediaPreviewProps {
  url: string | null;
  previewUrl: string | null;
  isUploading: boolean;
  onSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

export interface ThumbnailUploadProps extends MediaPreviewProps {}

export interface DetailsFormProps {
  title: string;
  description: string;
  category: string;
  categories: Array<{ id: string; name: string }>;
  disabled: boolean;
  onChange: (field: string, value: string) => void;
}

export interface AdvancedOptionsProps {
  options: Record<string, boolean>;
  show: boolean;
  disabled: boolean;
  onChange: (option: string) => void;
  onToggle: () => void;
}

export interface ExtendedMedia extends Media {
  formattedViews?: string;
  formattedDuration?: string;
  creatorName?: string;
  creatorAvatar?: string;
  summarized?: boolean;
  createdAt?: string | null;
}

export interface MediaCardProps {
  item: ExtendedMedia;
  viewMode: "grid" | "list";
  contentType: "media" | "bookmark" | "summary";
  onDelete?: (id: string) => void;
}

export interface MediaActionProps {
  onView?: () => void;
  onEdit?: () => void;
  onCreateAIPresenter?: () => void;
  onDelete: () => void;
}

export interface TranscriptChunk {
  id: string;
  content: string;
  time: number;
}

export interface Transcript {
  id: string;
  content: string;
  chunks: TranscriptChunk[];
}

export interface Keyword {
  id: string;
  content: string;
}

export interface Keypoint {
  id: string;
  content: string;
}

export interface MediaData {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  keywords: Keyword[];
  keypoints: Keypoint[];
  summary: string;
  duration: number;
  category: string;
  transcript: Transcript | null;
  creator?: User;
  views?: number;
  likes?: number;
}

export interface MediaEditState {
  mediaData: MediaData;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  successMessage: string | null;
  isPlaying: boolean;
  isMuted: boolean;
  activeTab: string;
  isEditingChunk: number | null;
  editedChunkText: string;
  isEditingFullTranscript: boolean;
  fullTranscriptText: string;
  keywordInput: string;
  keypointInput: string;
}

export interface MediaPlayerControlProps {
  isPlaying: boolean;
  isMuted: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
}

export interface ContentTabProps {
  mediaData: MediaData;
  keywordInput: string;
  keypointInput: string;
  onKeywordInputChange: (value: string) => void;
  onKeypointInputChange: (value: string) => void;
  onAddKeyword: () => void;
  onRemoveKeyword: (keyword: string) => void;
  onAddKeypoint: () => void;
  onRemoveKeypoint: (keypoint: string) => void;
}

export interface TranscriptTabProps {
  transcript: Transcript | null;
  fullTranscriptText: string;
  isEditingFullTranscript: boolean;
  isEditingChunk: number | null;
  editedChunkText: string;
  onToggleFullTranscriptEdit: () => void;
  onFullTranscriptChange: (value: string) => void;
  onStartEditingChunk: (index: number, text: string) => void;
  onSaveChunkEdit: (index: number) => void;
  onCancelChunkEdit: () => void;
  onSeekToTime: (time: number) => void;
}

export interface MediaEditHandlers {
  handleTogglePlay: () => void;
  handleToggleMute: () => void;
  handleFullscreen: () => void;
  handleSeekToTime: (timeInSeconds: number) => void;
  handleAddKeyword: () => void;
  handleRemoveKeyword: (keyword: string) => void;
  handleAddKeypoint: () => void;
  handleRemoveKeypoint: (keypoint: string) => void;
  handleSummaryChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleToggleAIPresenter: () => void;
  startEditingChunk: (index: number, text: string) => void;
  saveChunkEdit: (index: number) => void;
  cancelChunkEdit: () => void;
  toggleFullTranscriptEdit: () => void;
  handleFullTranscriptChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSave: () => void;
  handleCancel: () => void;
}
