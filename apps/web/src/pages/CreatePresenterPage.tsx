import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  Loader,
  AlertTriangle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Check,
  User,
  FileText,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Layout } from "../components/layout/Layout";
import { httpClient } from "../config/httpClient";
import { useKeycloakAuth } from "../hooks/useKeycloakAuth";

interface Agent {
  id: string;
  name: string;
  avatarUrl: string;
  voiceId: string;
  videoUrl: string;
  createdTime: string;
  updatedTime: string;
  deletedTime: string | null;
}

interface VideoData {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  duration: number;
  summary: string;
  transcript: {
    text: string;
    chunks: Array<{
      text: string;
      time: number;
    }>;
  } | null;
}

export const CreatePresenterPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["common", "presenter"]);
  const { isAuthenticated, login } = useKeycloakAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const [videoData, setVideoData] = useState<VideoData>({
    id: "",
    title: "",
    description: "",
    thumbnail: "",
    url: "",
    duration: 0,
    summary: "",
    transcript: null,
  });

  useEffect(() => {
    if (videoId) {
      fetchVideoData();
      fetchAgents();
    }
  }, [videoId]);

  useEffect(() => {
    if (previewVideoRef.current && previewVideoUrl) {
      previewVideoRef.current.play();
      setIsPlayingPreview(true);
    }
  }, [previewVideoUrl]);

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
        duration: data.duration || 0,
        summary: data.metadata?.summary || "",
        transcript: data.metadata?.transcripts[0] || null,
      });
    } catch (error) {
      console.error("Error fetching video data:", error);
      setError(t("presenter:errors.fetch_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgents = async () => {
    setIsLoadingAgents(true);
    try {
      const response = await httpClient.get("/v1/agent?page=1&size=10");
      setAgents(response.data.data);
    } catch (error) {
      console.error("Error fetching agents:", error);
      setError(t("presenter:errors.agents_fetch_failed"));
    } finally {
      setIsLoadingAgents(false);
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

  const handleCreatePresenter = async () => {
    if (!selectedAgent) {
      setError(t("presenter:errors.no_agent_selected"));
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await httpClient.post(`/v1/videos/generate-presenter`, {
        videoId,
        agentId: selectedAgent,
        text: videoData.summary,
      });

      setSuccessMessage(t("presenter:messages.create_success"));

      setTimeout(() => {
        navigate(`/videos/${videoId}`);
      }, 1500);
    } catch (error) {
      console.error("Error creating presenter:", error);
      setError(t("presenter:errors.create_failed"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent.id);
    setPreviewVideoUrl(agent.videoUrl);

    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTogglePreview = () => {
    if (previewVideoRef.current) {
      if (isPlayingPreview) {
        previewVideoRef.current.pause();
      } else {
        previewVideoRef.current.play();
      }
      setIsPlayingPreview(!isPlayingPreview);
    }
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
            {t("presenter:auth.locked_content")}
          </h3>
          <p className="text-black mb-6 max-w-md mx-auto">
            {t("presenter:auth.login_message")}
          </p>
          <Button
            variant="outline"
            onClick={() => login()}
            type="button"
            className="flex items-center mx-auto border border-black text-black hover:bg-gray-100"
          >
            <User size={18} className="mr-2" />
            {t("presenter:buttons.login_now")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Layout activeItem="presenter" title={t("presenter:title")}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
          >
            <ChevronLeft size={16} className="mr-1" />
            {t("presenter:buttons.back")}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-black mb-2">
            {t("presenter:title")}
          </h1>
          <p className="text-black mb-6">{t("presenter:subtitle")}</p>

          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader size={32} className="animate-spin text-indigo-600" />
              <span className="ml-2 text-indigo-600">
                {t("presenter:loading")}
              </span>
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
                  <div className="mt-4">
                    <h3 className="font-medium text-black mb-2">
                      {videoData.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {t("presenter:video_info.duration")}:{" "}
                      {formatTime(videoData.duration)}
                    </p>
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {videoData.description}
                    </p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="space-y-6">
                    {videoData.summary && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-medium text-black mb-2 flex items-center">
                          <FileText
                            size={18}
                            className="text-indigo-500 mr-2"
                          />
                          {t("presenter:sections.summary")}
                        </h3>
                        <p className="text-gray-700">{videoData.summary}</p>
                      </div>
                    )}

                    {videoData.transcript && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-medium text-black mb-2 flex items-center">
                          <FileText
                            size={18}
                            className="text-indigo-500 mr-2"
                          />
                          {t("presenter:sections.transcript")}
                        </h3>
                        <div className="max-h-40 overflow-y-auto">
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {videoData.transcript.text}
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="font-medium text-black mb-4 flex items-center">
                        <UserCheck size={18} className="text-indigo-500 mr-2" />
                        {t("presenter:sections.select_agent")}
                      </h3>

                      {isLoadingAgents ? (
                        <div className="flex justify-center py-8">
                          <Loader
                            size={24}
                            className="animate-spin text-indigo-600"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {agents.map((agent) => (
                              <div
                                key={agent.id}
                                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                  selectedAgent === agent.id
                                    ? "border-indigo-600 bg-indigo-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                                onClick={() => handleAgentClick(agent)}
                              >
                                <div className="relative">
                                  <img
                                    src={agent.avatarUrl}
                                    alt={agent.name}
                                    className="w-full h-32 object-cover rounded-md mb-2"
                                  />
                                  {selectedAgent === agent.id && (
                                    <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1">
                                      <Check size={16} />
                                    </div>
                                  )}
                                </div>
                                <h4 className="font-medium text-black text-center">
                                  {agent.name}
                                </h4>
                              </div>
                            ))}
                          </div>

                          {previewVideoUrl && (
                            <div className="mt-6 bg-gray-50 rounded-lg p-4">
                              <h4 className="font-medium text-black mb-3 flex items-center">
                                <Play
                                  size={18}
                                  className="text-indigo-500 mr-2"
                                />
                                {t("presenter:sections.agent_preview")}
                              </h4>
                              <div className="relative bg-black rounded-md overflow-hidden max-w-md mx-auto">
                                <video
                                  ref={previewVideoRef}
                                  className="w-full h-auto"
                                  src={previewVideoUrl}
                                  onPlay={() => setIsPlayingPreview(true)}
                                  onPause={() => setIsPlayingPreview(false)}
                                  onEnded={() => setIsPlayingPreview(false)}
                                  controls
                                >
                                  Your browser does not support the video tag.
                                </video>
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 px-3 py-2 flex items-center justify-center">
                                  <button
                                    className="text-white hover:text-indigo-300"
                                    onClick={handleTogglePreview}
                                  >
                                    {isPlayingPreview ? (
                                      <Pause size={20} />
                                    ) : (
                                      <Play size={20} />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        leftIcon={<ChevronLeft size={16} />}
                      >
                        {t("presenter:buttons.cancel")}
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleCreatePresenter}
                        disabled={isCreating || !selectedAgent}
                        leftIcon={
                          isCreating ? (
                            <Loader size={16} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={16} />
                          )
                        }
                      >
                        {isCreating
                          ? t("presenter:buttons.creating")
                          : t("presenter:buttons.create")}
                      </Button>
                    </div>
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
