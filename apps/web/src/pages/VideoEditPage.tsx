import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Save,
  X,
  Tag,
  List,
  FileText,
  User,
  ChevronLeft,
  Loader,
  AlertTriangle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  MessageSquare,
  Clock,
  Edit3,
  Check,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Layout } from "../components/layout/Layout";
import { httpClient } from "../config/httpClient";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/TextArea";
import { Switch } from "../components/ui/Switch";
import { useKeycloakAuth } from "../hooks/useKeycloakAuth";
import {
  TabsContent,
  TabsList,
  TabsTrigger,
  Tabs,
} from "../components/ui/Tabs";

interface TranscriptChunk {
  text: string;
  time: number;
}

interface Transcript {
  text: string;
  chunks: TranscriptChunk[];
}

interface VideoData {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  keywords: string[];
  keypoints: string[];
  summary: string;
  hasAIPresenter: boolean;
  duration: number;
  category: string;
  transcript: Transcript | null;
}

export const VideoEditPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["common", "edit"]);
  const { isAuthenticated, login } = useKeycloakAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "transcript">(
    "content"
  );
  const [isEditingChunk, setIsEditingChunk] = useState<number | null>(null);
  const [editedChunkText, setEditedChunkText] = useState("");
  const [isEditingFullTranscript, setIsEditingFullTranscript] = useState(false);
  const [fullTranscriptText, setFullTranscriptText] = useState("");

  const [videoData, setVideoData] = useState<VideoData>({
    id: "",
    title: "",
    description: "",
    thumbnail: "",
    url: "",
    keywords: [],
    keypoints: [],
    summary: "",
    hasAIPresenter: false,
    duration: 0,
    category: "",
    transcript: null,
  });

  const [keywordInput, setKeywordInput] = useState("");
  const [keypointInput, setKeypointInput] = useState("");

  useEffect(() => {
    if (videoId) {
      fetchVideoData();
    }
  }, [videoId]);

  const fetchVideoData = async () => {
    setIsLoading(true);
    try {
      const response = await httpClient.get(`/v1/videos/${videoId}`);
      const data = response.data.data.video;

      setVideoData({
        id: data.id || "",
        title: data.title || "",
        description: data.description || "",
        thumbnail: data.thumbnail || "",
        url: data.url || "",
        keywords: data.metadata?.keywords || [],
        keypoints: data.metadata?.keyPoints || [],
        summary: data.metadata?.summary || "",
        hasAIPresenter: data.metadata?.hasAIPresenter || false,
        duration: data.duration || 0,
        category: data.category || "",
        transcript: data.metadata?.transcripts || null,
      });

      if (data.metadata?.transcripts?.text) {
        setFullTranscriptText(data.metadata.transcripts.text);
      }
    } catch (error) {
      console.error("Error fetching video data:", error);
      setError(t("edit:errors.fetch_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleSeekToTime = (timeInSeconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeInSeconds;
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleAddKeyword = () => {
    if (
      keywordInput.trim() &&
      !videoData.keywords.includes(keywordInput.trim())
    ) {
      setVideoData({
        ...videoData,
        keywords: [...videoData.keywords, keywordInput.trim()],
      });
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setVideoData({
      ...videoData,
      keywords: videoData.keywords.filter((k) => k !== keyword),
    });
  };

  const handleAddKeypoint = () => {
    if (
      keypointInput.trim() &&
      !videoData.keypoints.includes(keypointInput.trim())
    ) {
      setVideoData({
        ...videoData,
        keypoints: [...videoData.keypoints, keypointInput.trim()],
      });
      setKeypointInput("");
    }
  };

  const handleRemoveKeypoint = (keypoint: string) => {
    setVideoData({
      ...videoData,
      keypoints: videoData.keypoints.filter((k) => k !== keypoint),
    });
  };

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setVideoData({
      ...videoData,
      summary: e.target.value,
    });
  };

  const handleToggleAIPresenter = () => {
    setVideoData({
      ...videoData,
      hasAIPresenter: !videoData.hasAIPresenter,
    });
  };

  const startEditingChunk = (index: number, text: string) => {
    setIsEditingChunk(index);
    setEditedChunkText(text);
  };

  const saveChunkEdit = (index: number) => {
    if (!videoData.transcript || !videoData.transcript.chunks) return;

    const updatedChunks = [...videoData.transcript.chunks];
    updatedChunks[index] = {
      ...updatedChunks[index],
      text: editedChunkText.trim(),
    };

    const newTranscript = {
      ...videoData.transcript,
      chunks: updatedChunks,
      text: updatedChunks.map((chunk) => chunk.text).join(" "),
    };

    setVideoData({
      ...videoData,
      transcript: newTranscript,
    });

    setFullTranscriptText(newTranscript.text);

    setIsEditingChunk(null);
    setEditedChunkText("");
  };

  const cancelChunkEdit = () => {
    setIsEditingChunk(null);
    setEditedChunkText("");
  };

  const toggleFullTranscriptEdit = () => {
    if (isEditingFullTranscript) {
      if (!videoData.transcript) return;

      const updatedTranscript = {
        ...videoData.transcript,
        text: fullTranscriptText.trim(),
      };

      setVideoData({
        ...videoData,
        transcript: updatedTranscript,
      });
    }

    setIsEditingFullTranscript(!isEditingFullTranscript);
  };

  const handleFullTranscriptChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setFullTranscriptText(e.target.value);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const transcriptData = videoData.transcript
        ? {
            text: videoData.transcript.text,
            chunks: videoData.transcript.chunks,
          }
        : null;

      await httpClient.put(`/v1/videos/${videoId}`, {
        metadata: {
          keywords: videoData.keywords,
          keyPoints: videoData.keypoints,
          summary: videoData.summary,
          hasAIPresenter: videoData.hasAIPresenter,
          transcripts: transcriptData,
        },
      });

      setSuccessMessage(t("edit:messages.save_success"));

      if (videoData.hasAIPresenter) {
        try {
          await httpClient.post(`/v1/videos/${videoId}/generate-presenter`);
        } catch (presenterError) {
          console.error("Error generating AI presenter:", presenterError);
          setError(t("edit:errors.presenter_generation_failed"));
        }
      }

      setTimeout(() => {
        navigate(-1);
      }, 1500);
    } catch (error) {
      console.error("Error saving video data:", error);
      setError(t("edit:errors.save_failed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="p-16 text-center bg-white rounded-lg shadow-md">
          <div className="mb-4 bg-white border border-gray-200 h-16 w-16 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={32} className="text-black" />
          </div>
          <h3 className="text-xl font-bold text-black mb-2">
            {t("edit:auth.locked_content")}
          </h3>
          <p className="text-black mb-6 max-w-md mx-auto">
            {t("edit:auth.login_message")}
          </p>
          <Button
            variant="outline"
            onClick={() => login()}
            type="button"
            className="flex items-center mx-auto border border-black text-black hover:bg-gray-100"
          >
            <User size={18} className="mr-2" />
            {t("edit:buttons.login_now")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Layout activeItem="settings" title={t("edit:title")}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
          >
            <ChevronLeft size={16} className="mr-1" />
            {t("edit:buttons.back")}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-black mb-2">
            {isLoading ? t("edit:loading_title") : videoData.title}
          </h1>
          <p className="text-black mb-6">{t("edit:subtitle")}</p>

          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader size={32} className="animate-spin text-indigo-600" />
              <span className="ml-2 text-indigo-600">{t("edit:loading")}</span>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
                  {successMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="md:col-span-1">
                  <div className="relative bg-black rounded-md overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full h-auto"
                      src={videoData.url}
                      poster={videoData.thumbnail}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    >
                      Your browser does not support the video tag.
                    </video>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 px-3 py-2 flex items-center justify-between">
                      <button
                        className="text-white hover:text-indigo-300"
                        onClick={handleTogglePlay}
                      >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                      </button>
                      <button
                        className="text-white hover:text-indigo-300"
                        onClick={handleToggleMute}
                      >
                        {isMuted ? (
                          <VolumeX size={20} />
                        ) : (
                          <Volume2 size={20} />
                        )}
                      </button>
                      <button
                        className="text-white hover:text-indigo-300"
                        onClick={handleFullscreen}
                      >
                        <Maximize size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-black">
                    <div className="flex justify-between mb-2">
                      <span>
                        {t("edit:video_info.duration")}:{" "}
                        {formatTime(videoData.duration)}
                      </span>
                      <span>
                        {t("edit:video_info.category")}:{" "}
                        {t(`common:categories.${videoData.category}`)}
                      </span>
                    </div>
                    <p className="text-black line-clamp-3">
                      {videoData.description}
                    </p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Tabs
                    value={activeTab}
                    onValueChange={(value) =>
                      setActiveTab(value as "content" | "transcript")
                    }
                    className="w-full"
                  >
                    <TabsList className="mb-4 border-b w-full">
                      <TabsTrigger
                        value="content"
                        className="flex items-center"
                      >
                        <FileText size={16} className="mr-2" />
                        {t("edit:tabs.content")}
                      </TabsTrigger>
                      <TabsTrigger
                        value="transcript"
                        className="flex items-center"
                      >
                        <MessageSquare size={16} className="mr-2" />
                        {t("edit:tabs.transcript")}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="content" className="space-y-8">
                      <div>
                        <h3 className="text-lg font-medium text-black mb-2 flex items-center">
                          <Tag size={18} className="text-indigo-500 mr-2" />
                          {t("edit:sections.keywords")}
                        </h3>
                        <p className="text-black mb-4 text-sm">
                          {t("edit:descriptions.keywords")}
                        </p>

                        <div className="flex mb-3">
                          <Input
                            type="text"
                            value={keywordInput}
                            onChange={(e) => setKeywordInput(e.target.value)}
                            placeholder={t("edit:placeholders.keyword")}
                            className="flex-grow"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddKeyword();
                              }
                            }}
                          />
                          <Button
                            onClick={handleAddKeyword}
                            variant="outline"
                            className="ml-2"
                          >
                            {t("edit:buttons.add")}
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {videoData.keywords.map((keyword, index) => (
                            <div
                              key={index}
                              className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm flex items-center"
                            >
                              {keyword}
                              <button
                                onClick={() => handleRemoveKeyword(keyword)}
                                className="ml-2 text-indigo-500 hover:text-indigo-700"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-black mb-2 flex items-center">
                          <List size={18} className="text-indigo-500 mr-2" />
                          {t("edit:sections.keypoints")}
                        </h3>
                        <p className="text-black mb-4 text-sm">
                          {t("edit:descriptions.keypoints")}
                        </p>

                        <div className="flex mb-3">
                          <Input
                            type="text"
                            value={keypointInput}
                            onChange={(e) => setKeypointInput(e.target.value)}
                            placeholder={t("edit:placeholders.keypoint")}
                            className="flex-grow"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddKeypoint();
                              }
                            }}
                          />
                          <Button
                            onClick={handleAddKeypoint}
                            variant="outline"
                            className="ml-2"
                          >
                            {t("edit:buttons.add")}
                          </Button>
                        </div>

                        <ul className="list-disc pl-5 space-y-2">
                          {videoData.keypoints.map((keypoint, index) => (
                            <li
                              key={index}
                              className="text-black flex items-start"
                            >
                              <span className="flex-grow">{keypoint}</span>
                              <button
                                onClick={() => handleRemoveKeypoint(keypoint)}
                                className="ml-2 text-black hover:text-gray-600 flex-shrink-0"
                              >
                                <X size={14} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-black mb-2 flex items-center">
                          <FileText
                            size={18}
                            className="text-indigo-500 mr-2"
                          />
                          {t("edit:sections.summary")}
                        </h3>
                        <p className="text-black mb-4 text-sm">
                          {t("edit:descriptions.summary")}
                        </p>

                        <Textarea
                          value={videoData.summary}
                          onChange={handleSummaryChange}
                          placeholder={t("edit:placeholders.summary")}
                          rows={6}
                          className="w-full resize-none"
                        />
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-black mb-2 flex items-center">
                          <User size={18} className="text-indigo-500 mr-2" />
                          {t("edit:sections.ai_presenter")}
                        </h3>
                        <p className="text-black mb-4 text-sm">
                          {t("edit:descriptions.ai_presenter")}
                        </p>

                        <div className="flex items-center">
                          <Switch
                            checked={videoData.hasAIPresenter}
                            onCheckedChange={handleToggleAIPresenter}
                            className="mr-3"
                          />
                          <span className="text-black">
                            {videoData.hasAIPresenter
                              ? t("edit:labels.ai_presenter_enabled")
                              : t("edit:labels.ai_presenter_disabled")}
                          </span>
                        </div>

                        {videoData.hasAIPresenter && (
                          <div className="mt-4 text-sm bg-indigo-50 border border-indigo-100 text-indigo-700 p-4 rounded">
                            {t("edit:messages.ai_presenter_info")}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="transcript" className="space-y-8">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-medium text-black flex items-center">
                            <MessageSquare
                              size={18}
                              className="text-indigo-500 mr-2"
                            />
                            {t("edit:sections.full_transcript")}
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleFullTranscriptEdit}
                            className="text-indigo-600"
                          >
                            {isEditingFullTranscript ? (
                              <>
                                <Check size={16} className="mr-1" />{" "}
                                {t("edit:buttons.save")}
                              </>
                            ) : (
                              <>
                                <Edit3 size={16} className="mr-1" />{" "}
                                {t("edit:buttons.edit")}
                              </>
                            )}
                          </Button>
                        </div>

                        {isEditingFullTranscript ? (
                          <Textarea
                            value={fullTranscriptText}
                            onChange={handleFullTranscriptChange}
                            placeholder={t("edit:placeholders.transcript")}
                            rows={10}
                            className="w-full"
                          />
                        ) : (
                          <div className="bg-gray-50 p-4 rounded-md max-h-60 overflow-y-auto">
                            <p className="text-black whitespace-pre-wrap">
                              {fullTranscriptText}
                            </p>
                          </div>
                        )}
                      </div>

                      {videoData.transcript &&
                        videoData.transcript.chunks &&
                        videoData.transcript.chunks.length > 0 && (
                          <div>
                            <h3 className="text-lg font-medium text-black mb-4 flex items-center">
                              <Clock
                                size={18}
                                className="text-indigo-500 mr-2"
                              />
                              {t("edit:sections.transcript_chunks")}
                            </h3>

                            <div className="space-y-3 max-h-96 overflow-y-auto p-2">
                              {videoData.transcript.chunks.map(
                                (chunk, index) => (
                                  <div
                                    key={index}
                                    className="border rounded-md p-3 bg-white"
                                  >
                                    <div className="flex justify-between items-center mb-2">
                                      <div
                                        className="flex items-center text-sm text-indigo-600 cursor-pointer hover:text-indigo-800"
                                        onClick={() =>
                                          handleSeekToTime(chunk.time)
                                        }
                                      >
                                        <Clock size={14} className="mr-1" />
                                        {formatTime(chunk.time)}
                                      </div>

                                      {isEditingChunk === index ? (
                                        <div className="flex space-x-2">
                                          <button
                                            className="text-green-600 hover:text-green-800"
                                            onClick={() => saveChunkEdit(index)}
                                          >
                                            <Check size={14} />
                                          </button>
                                          <button
                                            className="text-red-600 hover:text-red-800"
                                            onClick={cancelChunkEdit}
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          className="text-black hover:text-gray-700"
                                          onClick={() =>
                                            startEditingChunk(index, chunk.text)
                                          }
                                        >
                                          <Edit3 size={14} />
                                        </button>
                                      )}
                                    </div>

                                    {isEditingChunk === index ? (
                                      <Textarea
                                        value={editedChunkText}
                                        onChange={(e) =>
                                          setEditedChunkText(e.target.value)
                                        }
                                        rows={2}
                                        className="w-full text-sm"
                                      />
                                    ) : (
                                      <p className="text-sm text-black">
                                        {chunk.text}
                                      </p>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </TabsContent>
                  </Tabs>

                  <div className="mt-8 flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      leftIcon={<X size={16} />}
                    >
                      {t("edit:buttons.cancel")}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSave}
                      disabled={isSaving}
                      leftIcon={
                        isSaving ? (
                          <Loader size={16} className="animate-spin" />
                        ) : (
                          <Save size={16} />
                        )
                      }
                    >
                      {isSaving
                        ? t("edit:buttons.saving")
                        : t("edit:buttons.save")}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};
