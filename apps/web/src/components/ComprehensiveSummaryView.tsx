import React, { useState, useRef, useEffect } from "react";
import {
  Clock,
  File,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Share,
  Download,
  MessageSquare,
  User,
  Bookmark,
  ChevronsDown,
} from "lucide-react";
import { Button } from "./ui/Button";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

export interface Chunk {
  time: number;
  text: string;
}

export interface Transcript {
  text: string;
  chunks: Chunk[];
}

export interface SupportingSentence {
  text: string;
  time: string;
}

export interface SummaryPoint {
  text: string;
  time?: number;
  supporting_sentences: SupportingSentence[];
}

interface TalkData {
  id: string;
  status: string;
  result_url?: string;
  transcripts?: SummaryPoint[] | Transcript;
}

interface ComprehensiveSummaryViewProps {
  videoFile: File | null;
  videoPreviewUrl: string | null;
  thumbnailPreview: string | null;
  talkData: TalkData | null;
  summaryData: {
    id: string;
    summary: SummaryPoint[];
    summaryText: string;
    transcripts: Transcript;
  };
  onReset: () => void;
  avatarVideoUrl?: string | null;
  isTalkProcessing?: boolean;
  talkId?: string;
}

export const ComprehensiveSummaryView: React.FC<
  ComprehensiveSummaryViewProps
> = ({
  videoFile,
  videoPreviewUrl,
  thumbnailPreview,
  talkData,
  summaryData,
  onReset,
  avatarVideoUrl,
  isTalkProcessing = false,
}) => {
  const { t } = useTranslation(["common", "summary", "videos"]);

  const [isOriginalPlaying, setIsOriginalPlaying] = useState<boolean>(false);
  const [isOriginalMuted, setIsOriginalMuted] = useState<boolean>(false);
  const [isAvatarPlaying, setIsAvatarPlaying] = useState<boolean>(false);
  const [isAvatarMuted, setIsAvatarMuted] = useState<boolean>(false);
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [highlightedTimestamps, setHighlightedTimestamps] = useState<string[]>(
    []
  );
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(-1);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const [avatarCurrentTime, setAvatarCurrentTime] = useState<number>(0);
  const [avatarDuration, setAvatarDuration] = useState<number>(0);
  const [currentAvatarChunkIndex, setCurrentAvatarChunkIndex] =
    useState<number>(-1);

  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  const isSummaryFormat = Array.isArray(talkData?.transcripts);

  useEffect(() => {
    if (
      activePoint !== null &&
      talkData?.transcripts &&
      isSummaryFormat &&
      (talkData.transcripts as SummaryPoint[])[activePoint]
    ) {
      const timestamps = (talkData.transcripts as SummaryPoint[])[
        activePoint
      ].supporting_sentences.map((sentence) => sentence.time);
      setHighlightedTimestamps(timestamps);
    } else {
      setHighlightedTimestamps([]);
    }
  }, [activePoint, talkData?.transcripts, isSummaryFormat]);

  useEffect(() => {
    if (summaryData?.transcripts?.chunks) {
      const chunks = summaryData.transcripts.chunks;
      let newIndex = -1;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const nextChunk = chunks[i + 1];
        const nextTime = nextChunk ? nextChunk.time : Infinity;

        if (currentTime >= chunk.time && currentTime < nextTime) {
          newIndex = i;
          break;
        }
      }

      if (newIndex !== currentChunkIndex) {
        setCurrentChunkIndex(newIndex);
      }
    }
  }, [currentTime, summaryData?.transcripts?.chunks, currentChunkIndex]);

  useEffect(() => {
    if (talkData?.transcripts && isSummaryFormat) {
      const summaryPoints = talkData.transcripts as SummaryPoint[];
      let newIndex = -1;

      for (let i = 0; i < summaryPoints.length; i++) {
        const point = summaryPoints[i];
        const nextPoint = summaryPoints[i + 1];

        const pointTime = point.time !== undefined ? Number(point.time) : 0;
        const nextPointTime =
          nextPoint && nextPoint.time !== undefined
            ? Number(nextPoint.time)
            : Infinity;

        if (
          avatarCurrentTime >= pointTime &&
          avatarCurrentTime < nextPointTime
        ) {
          newIndex = i;
          break;
        }
      }

      if (newIndex !== currentAvatarChunkIndex) {
        setCurrentAvatarChunkIndex(newIndex);
      }
    }
  }, [
    avatarCurrentTime,
    talkData?.transcripts,
    currentAvatarChunkIndex,
    isSummaryFormat,
  ]);

  const toggleOriginalPlayPause = (): void => {
    if (originalVideoRef.current) {
      if (isOriginalPlaying) {
        originalVideoRef.current.pause();
      } else {
        originalVideoRef.current.play();
      }
      setIsOriginalPlaying(!isOriginalPlaying);
    }
  };

  const toggleOriginalMute = (): void => {
    if (originalVideoRef.current) {
      originalVideoRef.current.muted = !isOriginalMuted;
      setIsOriginalMuted(!isOriginalMuted);
    }
  };

  const toggleAvatarPlayPause = (): void => {
    if (avatarVideoRef.current) {
      if (isAvatarPlaying) {
        avatarVideoRef.current.pause();
      } else {
        avatarVideoRef.current.play();
      }
      setIsAvatarPlaying(!isAvatarPlaying);
    }
  };

  const toggleAvatarMute = (): void => {
    if (avatarVideoRef.current) {
      avatarVideoRef.current.muted = !isAvatarMuted;
      setIsAvatarMuted(!isAvatarMuted);
    }
  };

  const handleTimeUpdate = (): void => {
    if (originalVideoRef.current) {
      setCurrentTime(originalVideoRef.current.currentTime);
    }
  };

  const handleAvatarTimeUpdate = (): void => {
    if (avatarVideoRef.current) {
      setAvatarCurrentTime(avatarVideoRef.current.currentTime);
    }
  };

  const jumpToTime = (time: number): void => {
    if (originalVideoRef.current) {
      originalVideoRef.current.currentTime = time;
      if (!isOriginalPlaying) {
        originalVideoRef.current.play();
        setIsOriginalPlaying(true);
      }
    }
  };

  const jumpToAvatarTime = (time: number | string | undefined): void => {
    if (avatarVideoRef.current && time !== undefined) {
      const timeValue = typeof time === "string" ? parseFloat(time) : time;
      avatarVideoRef.current.currentTime = timeValue;
      if (!isAvatarPlaying) {
        avatarVideoRef.current.play();
        setIsAvatarPlaying(true);
      }
    }
  };

  const jumpToSupportingTimestamp = (time: string): void => {
    if (avatarVideoRef.current) {
      const timestamp = parseFloat(time);
      avatarVideoRef.current.currentTime = timestamp;
      if (!isAvatarPlaying) {
        avatarVideoRef.current.play();
        setIsAvatarPlaying(true);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLoadedMetadata = (): void => {
    if (originalVideoRef.current) {
      setDuration(originalVideoRef.current.duration);
    }
  };

  const handleAvatarLoadedMetadata = (): void => {
    if (avatarVideoRef.current) {
      setAvatarDuration(avatarVideoRef.current.duration);
    }
  };

  const scrollToCurrentChunk = (): void => {
    if (currentChunkIndex >= 0 && transcriptContainerRef.current) {
      const chunkElement = document.getElementById(
        `transcript-chunk-${currentChunkIndex}`
      );

      if (chunkElement) {
        transcriptContainerRef.current.scrollTo({
          top:
            chunkElement.offsetTop -
            transcriptContainerRef.current.offsetTop -
            100,
          behavior: "smooth",
        });
      }
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
      <div className="p-5 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-black">
              {t("summary:results.title", "Summary Results")}
            </h2>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-700">
              <div className="flex items-center gap-1">
                <File size={14} />
                <span>
                  {videoFile?.name ||
                    t("summary:results.your_video", "Your Video")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>Duration: {formatTime(duration)}</span>
              </div>
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={onReset} type="button">
            {t("summary:buttons.create_new", "Create New")}
          </Button>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold mb-3 flex items-center text-gray-800">
                <File className="mr-2 text-blue-600" size={20} />
                {t("summary:layout.original_video", "Original Video")}
              </h3>

              <div className="relative rounded-lg overflow-hidden border border-gray-300 shadow-sm bg-black aspect-video">
                <video
                  ref={originalVideoRef}
                  className="w-full h-full object-contain"
                  src={videoPreviewUrl || undefined}
                  poster={thumbnailPreview || undefined}
                  onPlay={() => setIsOriginalPlaying(true)}
                  onPause={() => setIsOriginalPlaying(false)}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  muted={isOriginalMuted}
                  controls={false}
                />

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <div
                    className="w-full h-1.5 bg-gray-700 rounded-full mb-2 cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickPos = e.clientX - rect.left;
                      const percent = clickPos / rect.width;
                      if (originalVideoRef.current) {
                        originalVideoRef.current.currentTime =
                          percent * duration;
                      }
                    }}
                  >
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${(currentTime / (duration || 1)) * 100}%`,
                      }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={toggleOriginalPlayPause}
                        className="text-white hover:text-blue-300 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                        type="button"
                      >
                        {isOriginalPlaying ? (
                          <Pause size={18} />
                        ) : (
                          <Play size={18} />
                        )}
                      </button>

                      <button
                        onClick={toggleOriginalMute}
                        className="text-white hover:text-blue-300 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                        type="button"
                      >
                        {isOriginalMuted ? (
                          <VolumeX size={18} />
                        ) : (
                          <Volume2 size={18} />
                        )}
                      </button>

                      <span className="text-white text-xs">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold mb-3 flex items-center text-gray-800">
                <User className="mr-2 text-blue-600" size={20} />
                {t("summary:preview.ai_presenter", "AI Presenter")}
              </h3>

              {isTalkProcessing ? (
                <div className="flex flex-col items-center justify-center aspect-video bg-gray-100 rounded-lg border border-gray-300 p-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
                  <p className="text-gray-600 font-medium">
                    {t("summary:talk.generating", "Generating AI presenter...")}
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    {t(
                      "summary:talk.please_wait",
                      "This may take a few moments"
                    )}
                  </p>
                </div>
              ) : !avatarVideoUrl ? (
                <div className="flex flex-col items-center justify-center aspect-video bg-gray-100 rounded-lg border border-gray-300 p-4">
                  <User size={36} className="text-gray-400 mb-3" />
                  <p className="text-gray-600">
                    {t(
                      "summary:avatar.not_available",
                      "AI Presenter not available"
                    )}
                  </p>
                </div>
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-gray-300 shadow-sm bg-black aspect-video">
                  <video
                    ref={avatarVideoRef}
                    className="w-full h-full object-contain"
                    src={avatarVideoUrl}
                    onPlay={() => setIsAvatarPlaying(true)}
                    onPause={() => setIsAvatarPlaying(false)}
                    onTimeUpdate={handleAvatarTimeUpdate}
                    onLoadedMetadata={handleAvatarLoadedMetadata}
                    muted={isAvatarMuted}
                    controls={false}
                  />

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <div
                      className="w-full h-1.5 bg-gray-700 rounded-full mb-2 cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickPos = e.clientX - rect.left;
                        const percent = clickPos / rect.width;
                        if (avatarVideoRef.current) {
                          avatarVideoRef.current.currentTime =
                            percent * avatarDuration;
                        }
                      }}
                    >
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${(avatarCurrentTime / (avatarDuration || 1)) * 100}%`,
                        }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={toggleAvatarPlayPause}
                          className="text-white hover:text-blue-300 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                          type="button"
                        >
                          {isAvatarPlaying ? (
                            <Pause size={18} />
                          ) : (
                            <Play size={18} />
                          )}
                        </button>

                        <button
                          onClick={toggleAvatarMute}
                          className="text-white hover:text-blue-300 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                          type="button"
                        >
                          {isAvatarMuted ? (
                            <VolumeX size={18} />
                          ) : (
                            <Volume2 size={18} />
                          )}
                        </button>

                        <span className="text-white text-xs">
                          {formatTime(avatarCurrentTime)} /{" "}
                          {formatTime(avatarDuration)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <MessageSquare className="mr-2 text-blue-600" size={18} />
                {t("summary:preview.summary_points", "Summary Points")}
              </h3>
            </div>

            <div
              className="overflow-y-auto custom-scrollbar pr-2 space-y-4"
              style={{ height: "500px" }}
            >
              {avatarVideoUrl && talkData?.transcripts && isSummaryFormat ? (
                <div>
                  {(talkData.transcripts as SummaryPoint[]).map(
                    (point, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-3 mb-2 transition-colors cursor-pointer
                        ${
                          activePoint === index
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                        onClick={() => {
                          setActivePoint(activePoint === index ? null : index);
                          jumpToAvatarTime(point.time);
                        }}
                      >
                        <div className="flex items-start">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                            <span className="text-xs font-medium">
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p
                              className={`text-sm ${activePoint === index ? "text-blue-800 font-medium" : "text-gray-800"}`}
                            >
                              {point.text}
                            </p>

                            {activePoint === index &&
                              point.supporting_sentences &&
                              point.supporting_sentences.length > 0 && (
                                <div className="mt-3 pt-2 border-t border-gray-200">
                                  <p className="text-xs text-gray-500 font-medium mb-2">
                                    {t(
                                      "summary:supporting_sentences",
                                      "Supporting sentences"
                                    )}
                                  </p>

                                  <div className="space-y-2">
                                    {point.supporting_sentences.map(
                                      (sentence, sIndex) => (
                                        <div
                                          key={sIndex}
                                          className="bg-gray-50 p-2 rounded border border-gray-200 hover:border-blue-300 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            jumpToSupportingTimestamp(
                                              sentence.time
                                            );
                                          }}
                                        >
                                          <div className="flex items-start">
                                            <span className="text-xs text-blue-600 font-mono mr-2 flex-shrink-0">
                                              {formatTime(
                                                parseFloat(sentence.time)
                                              )}
                                            </span>
                                            <p className="text-xs text-gray-600">
                                              {sentence.text}
                                            </p>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-center p-4 text-gray-500">
                  <p>
                    {isTalkProcessing
                      ? t("summary:summary.generating", "Generating summary...")
                      : t(
                          "summary:summary.not_available",
                          "Summary not available"
                        )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {summaryData && summaryData.transcripts ? (
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm h-full">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <MessageSquare className="mr-2 text-blue-600" size={18} />
                  {t("summary:preview.transcript", "Original Transcript")}
                </h3>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={scrollToCurrentChunk}
                  className="flex items-center text-xs px-2 py-1 h-8"
                  type="button"
                >
                  <ChevronsDown size={14} className="mr-1" />
                  {t("summary:transcript.jump_to_current", "Jump to current")}
                </Button>
              </div>

              <div
                className="overflow-y-auto custom-scrollbar pr-2 space-y-1"
                style={{ height: "500px" }}
                id="transcript-container"
                ref={transcriptContainerRef}
              >
                {summaryData.transcripts.chunks.map((chunk, index) => {
                  const isCurrentChunk = currentChunkIndex === index;

                  const isHighlighted = highlightedTimestamps.some(
                    (timestamp) =>
                      Math.abs(chunk.time - parseFloat(timestamp)) < 0.5
                  );

                  return (
                    <div
                      key={index}
                      id={`transcript-chunk-${index}`}
                      className={`p-2 rounded flex items-start cursor-pointer 
                        ${isHighlighted ? "bg-yellow-100 border border-yellow-300" : "hover:bg-gray-50"}
                        ${isCurrentChunk ? "border-l-4 border-blue-500 pl-1" : ""}
                        ${isCurrentChunk && !isHighlighted ? "bg-blue-50" : ""}
                      `}
                      onClick={() => jumpToTime(chunk.time)}
                    >
                      <span className="text-xs text-gray-500 w-12 flex-shrink-0 font-mono mt-0.5">
                        {formatTime(chunk.time)}
                      </span>
                      <p className="text-sm text-gray-800 flex-1">
                        {chunk.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 h-full">
              <h3 className="text-lg font-semibold mb-3 flex items-center text-gray-800">
                <MessageSquare className="mr-2 text-blue-600" size={18} />
                {t("summary:preview.transcript", "Original Transcript")}
              </h3>
              <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg border border-gray-300 p-4">
                <MessageSquare size={36} className="text-gray-400 mb-3" />
                <p className="text-gray-600 text-center">
                  {t(
                    "summary:transcript.not_available",
                    "Transcript not available"
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            leftIcon={<Download size={16} />}
            onClick={() => {
              if (summaryData && summaryData.id) {
                window.open(
                  `/v1/videos/summary/${summaryData.id}/download/pdf`,
                  "_blank"
                );
              } else {
                toast.error(
                  t(
                    "summary:errors.download_failed",
                    "Download failed: Summary not available"
                  )
                );
              }
            }}
            type="button"
            disabled={!summaryData || !summaryData.id}
          >
            {t("summary:buttons.download_pdf", "Download PDF")}
          </Button>
          <Button
            variant="primary"
            leftIcon={<Share size={16} />}
            onClick={() => {
              if (summaryData && summaryData.id) {
                navigator.clipboard.writeText(
                  window.location.origin + `/summary/${summaryData.id}`
                );
                toast.success(
                  t("summary:messages.link_copied", "Link copied to clipboard!")
                );
              } else {
                toast.error(
                  t(
                    "summary:errors.share_failed",
                    "Share failed: Summary not available"
                  )
                );
              }
            }}
            type="button"
            disabled={!summaryData || !summaryData.id}
          >
            {t("summary:buttons.share", "Share")}
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Bookmark size={16} />}
            onClick={() => {
              if (summaryData && summaryData.id) {
                toast.success(t("summary:messages.saved", "Summary saved!"));
              } else {
                toast.error(
                  t(
                    "summary:errors.save_failed",
                    "Save failed: Summary not available"
                  )
                );
              }
            }}
            type="button"
            disabled={!summaryData || !summaryData.id}
          >
            {t("summary:buttons.save", "Save")}
          </Button>
        </div>
      </div>
    </div>
  );
};
