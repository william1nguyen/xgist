import React, {
  useState,
  useRef,
  ChangeEvent,
  FormEvent,
  useEffect,
} from "react";
import { Upload, File, X } from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { Button } from "../components/ui/Button";
import { ProgressBar } from "../components/ui/ProgressBar";
import { aiHttpClient, httpClient } from "../config/httpClient";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { ComprehensiveSummaryView } from "../components/ComprehensiveSummaryView";
import { AuthGate } from "../components/AuthGate";

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
  supporting_sentences: SupportingSentence[];
}

interface SummaryData {
  id: string;
  summary: SummaryPoint[];
  summaryText: string;
  transcripts: Transcript;
}

interface TalkData {
  id: string;
  status: string;
  result_url?: string;
  transcripts?: Transcript;
}

export const CreateSummaryPage: React.FC = () => {
  const { t } = useTranslation(["common", "summary", "videos"]);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [talkData, setTalkData] = useState<TalkData | null>(null);
  const [isTalkProcessing, setIsTalkProcessing] = useState<boolean>(false);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (talkData && talkData.id) {
      if (talkData.status !== "done" && talkData.status !== "failed") {
        setIsTalkProcessing(true);

        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        const pollTalkStatus = async () => {
          try {
            const response = await aiHttpClient.post("/get-talk", {
              id: talkData.id,
              transcripts: summaryData?.transcripts,
            });
            const updatedTalkData = response.data;

            console.log("Talk data received:", updatedTalkData);

            if (
              updatedTalkData.status === "done" &&
              updatedTalkData.result_url
            ) {
              setAvatarVideoUrl(updatedTalkData.result_url);
              setIsTalkProcessing(false);
              setTalkData(updatedTalkData);

              toast.success(
                t("summary:messages.talk_ready") ||
                  "AI presenter video is ready!"
              );

              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
            } else if (updatedTalkData.status === "failed") {
              toast.error(t("summary:errors.talk_generation_failed"));
              setIsTalkProcessing(false);
              setTalkData(updatedTalkData);

              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
            } else {
              setTalkData(updatedTalkData);
            }
          } catch (error) {
            console.error("Error polling talk status:", error);
            toast.error(`Error polling talk status: ${error}`);
          }
        };

        pollTalkStatus();
        pollIntervalRef.current = setInterval(pollTalkStatus, 10000);
      } else if (talkData.status === "done" && talkData.result_url) {
        setAvatarVideoUrl(talkData.result_url);
        setIsTalkProcessing(false);
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [talkData?.id, talkData?.status, t]);

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

  const createAvatarTalk = async (summaryText: string): Promise<void> => {
    try {
      setIsTalkProcessing(true);

      if (!summaryText) {
        toast.error(t("summary:errors.no_summary_available"));
        setIsTalkProcessing(false);
        return;
      }

      const response = await aiHttpClient.post("/create-talk", {
        script_text: summaryText,
      });

      setTalkData(response.data);
    } catch (error) {
      console.error("Error creating talk:", error);
      toast.error(t("summary:errors.talk_creation_failed"));
      setIsTalkProcessing(false);
    }
  };

  const handleSummarizeSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    if (!videoFile) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("videoFile", videoFile);
      if (thumbnailFile) {
        formData.append("thumbnailFile", thumbnailFile);
      }

      formData.append("keywords", "true");
      formData.append("keyPoints", "true");

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

      const response = await httpClient.post(
        "/v2/videos/summarize",
        formData,
        config
      );

      setIsComplete(true);
      const responseData = response.data;

      if (!responseData.summary) {
        console.error("API response is missing summary:", responseData);
        toast.error(t("summary:errors.invalid_response"));
        setIsProcessing(false);
        return;
      }

      setSummaryData(responseData);

      if (responseData && responseData.summaryText) {
        await createAvatarTalk(responseData.summaryText);
      }

      setIsProcessing(false);
    } catch (error) {
      console.error("Error summarizing video:", error);
      setIsProcessing(false);
      toast.error(t("summary:errors.summarize_failed"));
    }
  };

  const resetForm = (): void => {
    setIsProcessing(false);
    setIsComplete(false);
    setProgress(0);
    setVideoFile(null);
    setSummaryData(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setTalkData(null);
    setIsTalkProcessing(false);
    setAvatarVideoUrl(null);

    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
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
      <Layout activeItem="summarize" title={t("summary:page_title.create")}>
        {isProcessing && renderLoadingIndicator()}

        <div className="max-w-8xl mx-auto px-4 py-6">
          {!isComplete ? (
            <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-black mb-6 border-b pb-3">
                  {t("summary:heading.ai_summary")}
                </h2>

                <form onSubmit={handleSummarizeSubmit} className="space-y-6">
                  <div>
                    {!videoFile ? (
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors bg-gray-50"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={handleFileSelect}
                          accept="video/*"
                        />
                        <Upload
                          size={48}
                          className="mx-auto text-blue-500 mb-4"
                        />
                        <p className="text-base text-black font-medium mb-2">
                          {t("summary:dropzone.text")}
                        </p>
                        <p className="text-sm text-gray-700">
                          {t("summary:dropzone.formats")}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <File size={20} className="text-gray-600 mr-2" />
                              <span className="text-sm font-medium text-black">
                                {videoFile.name}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setVideoFile(null);
                                if (videoPreviewUrl) {
                                  URL.revokeObjectURL(videoPreviewUrl);
                                  setVideoPreviewUrl(null);
                                }
                              }}
                              className="text-gray-600 hover:text-red-600 p-1 rounded-full hover:bg-gray-200"
                              type="button"
                            >
                              <X size={18} />
                            </button>
                          </div>

                          <div className="flex justify-between text-xs text-gray-700 mt-2">
                            <span>{t("summary:file.selected")}</span>
                            <span className="font-medium">
                              {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                    {isProcessing ? (
                      <Button
                        variant="outline"
                        onClick={resetForm}
                        type="button"
                      >
                        {t("summary:buttons.cancel")}
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={!videoFile}
                      >
                        {t("summary:buttons.create_summary")}
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div>
              <ComprehensiveSummaryView
                videoFile={videoFile}
                videoPreviewUrl={videoPreviewUrl}
                thumbnailPreview={thumbnailPreview}
                talkData={talkData}
                summaryData={summaryData!}
                onReset={resetForm}
                avatarVideoUrl={avatarVideoUrl}
                isTalkProcessing={isTalkProcessing}
                talkId={talkData?.id}
              />
            </div>
          )}
        </div>
      </Layout>
    </AuthGate>
  );
};
