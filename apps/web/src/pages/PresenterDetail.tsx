import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { httpClient } from "../config/httpClient";
import { aiHttpClient } from "../config/httpClient";
import { toast } from "react-toastify";

import { Layout } from "../components/layout/Layout";
import { ComprehensiveSummaryView } from "../components/ComprehensiveSummaryView";
import { Loader } from "lucide-react";
import { ProgressBar } from "../components/ui/ProgressBar";

interface PresenterDetailData {
  id: string;
  userId: string;
  videoId: string;
  agentId: string;
  presenterId: string;
  url: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  video?: {
    id: string;
    url: string;
    title: string;
    description: string;
    thumbnail: string;
    metadata?: {
      summary?: string;
      transcripts?: any[];
      keywords?: string[];
      keyPoints?: string[];
    };
  };
}

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

export const PresenterDetailPage: React.FC = () => {
  const { t } = useTranslation(["common", "summary", "errors"]);
  const { presenterId } = useParams<{ presenterId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [presenterData, setPresenterData] =
    useState<PresenterDetailData | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [talkData, setTalkData] = useState<TalkData | null>(null);
  const [isTalkProcessing, setIsTalkProcessing] = useState(false);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (presenterId) {
      fetchPresenterDetail();
    }
  }, [presenterId]);

  const fetchPresenterDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await httpClient.get(
        `/v1/videos/presenters/${presenterId}`
      );

      console.log("Presenter data response:", response.data);
      setPresenterData(response.data);

      if (response.data?.video?.metadata?.transcripts?.[0]) {
        console.log("Using existing transcripts from presenter data");
        const transcript = response.data.video.metadata.transcripts[0];
        const formattedSummaryData: SummaryData = {
          id: response.data.id,
          summary: [],
          summaryText: response.data.video.metadata.summary || "",
          transcripts: transcript,
        };
        setSummaryData(formattedSummaryData);

        await fetchTalkData(response.data.presenterId, transcript);
        setLoading(false);
      } else if (response.data?.video?.url) {
        console.log("No existing transcripts, will summarize video");
        await summarizeVideo(
          response.data.video.url,
          response.data.presenterId
        );
      } else {
        throw new Error("No video URL found");
      }
    } catch (err) {
      console.error("Error fetching presenter detail:", err);
      setError(t("errors:fetch_failed", "Failed to load presenter details"));
      setLoading(false);
    }
  };

  const summarizeVideo = async (videoUrl: string, presenterId: string) => {
    try {
      setIsProcessing(true);
      setProgress(0);

      const formData = new FormData();

      try {
        console.log("Attempting to fetch video from URL:", videoUrl);
        const videoResponse = await fetch(videoUrl);

        if (!videoResponse.ok) {
          throw new Error(`Failed to fetch video: ${videoResponse.status}`);
        }

        const videoBlob = await videoResponse.blob();
        const videoFile = new File([videoBlob], "video.mp4", {
          type: "video/mp4",
        });

        formData.append("videoFile", videoFile);
      } catch (fetchError) {
        console.error("Error fetching video file:", fetchError);

        if (presenterData?.video?.metadata?.transcripts?.[0]) {
          console.log("Using existing transcripts from presenter data");
          const transcript = presenterData.video.metadata.transcripts[0];
          const formattedSummaryData: SummaryData = {
            id: presenterData.id,
            summary: [],
            summaryText: presenterData.video.metadata.summary || "",
            transcripts: transcript,
          };
          setSummaryData(formattedSummaryData);

          await fetchTalkData(presenterId, transcript);
          setIsProcessing(false);
          setLoading(false);
          return;
        }

        throw fetchError;
      }

      formData.append("keywords", "true");
      formData.append("keyPoints", "true");

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent: any) => {
          const percentCompleted = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setProgress(percentCompleted);
        },
      };

      console.log("Calling summarize API with videoFile");
      const response = await httpClient.post(
        "/v2/videos/summarize",
        formData,
        config
      );

      const responseData = response.data;
      console.log("Summary response:", responseData);

      if (!responseData.transcripts) {
        console.error("API response is missing transcripts:", responseData);
        toast.error(t("summary:errors.invalid_response"));
        setIsProcessing(false);
        setLoading(false);
        return;
      }

      setSummaryData(responseData);

      await fetchTalkData(presenterId, responseData.transcripts);

      setIsProcessing(false);
      setLoading(false);
    } catch (error) {
      console.error("Error summarizing video:", error);
      setIsProcessing(false);
      setLoading(false);
      toast.error(t("summary:errors.summarize_failed"));
    }
  };

  const fetchTalkData = async (presenterId: string, transcript: any) => {
    try {
      setIsTalkProcessing(true);

      console.log("Calling get-talk API with:", {
        id: presenterId,
        transcripts: transcript,
      });
      const response = await aiHttpClient.post("/get-talk", {
        id: presenterId,
        transcripts: transcript,
      });

      const updatedTalkData = response.data;
      console.log("Talk data received:", updatedTalkData);

      setTalkData(updatedTalkData);

      if (updatedTalkData.result_url) {
        setAvatarVideoUrl(updatedTalkData.result_url);
      }

      setIsTalkProcessing(false);
    } catch (err) {
      console.error("Error fetching talk data:", err);
      setIsTalkProcessing(false);
      toast.error(t("summary:errors.talk_fetch_failed"));
    }
  };

  const handleReset = () => {
    navigate("/summary");
  };

  const renderLoadingIndicator = () => (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
        <h3 className="text-lg font-semibold text-black mb-4">
          {t("summary:loading.title", "Processing...")}
        </h3>
        <ProgressBar
          progress={progress}
          height="md"
          color="blue"
          animate={true}
        />
        <div className="mt-3 text-sm text-gray-700">
          <p className="mb-1 font-medium">
            {progress < 50 &&
              t("summary:progress.uploading", "Uploading video...")}
            {progress >= 50 &&
              progress < 95 &&
              t("summary:progress.processing", "Processing video...")}
            {progress >= 95 &&
              t("summary:progress.finishing", "Almost done...")}
          </p>
          <p>{t("summary:loading.please_wait", "Please wait...")}</p>
        </div>
      </div>
    </div>
  );

  if (loading && !isProcessing) {
    return (
      <Layout activeItem="presenter" title={t("summary:loading", "Loading...")}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader className="animate-spin" size={40} />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout activeItem="presenter" title={t("errors:error", "Error")}>
        <div className="p-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <button
              onClick={() => fetchPresenterDetail()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {t("common:retry", "Retry")}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!presenterData) {
    return (
      <Layout activeItem="presenter" title={t("errors:not_found", "Not Found")}>
        <div className="p-6 text-center">
          <p className="text-gray-600">
            {t("errors:presenter_not_found", "Presenter not found")}
          </p>
        </div>
      </Layout>
    );
  }

  let videoFile: File | null = null;
  if (presenterData?.video?.title) {
    const filename = presenterData.video.title.includes(".mp4")
      ? presenterData.video.title
      : `${presenterData.video.title}.mp4`;

    const blob = new Blob([], { type: "video/mp4" });
    videoFile = new File([blob], filename, {
      type: "video/mp4",
      lastModified: Date.now(),
    });
  }

  return (
    <Layout
      activeItem="presenter"
      title={
        presenterData?.video?.title ||
        t("summary:presenter_detail", "Presenter Detail")
      }
    >
      {isProcessing && renderLoadingIndicator()}

      <div className="p-6">
        {summaryData ? (
          <ComprehensiveSummaryView
            videoFile={videoFile}
            videoPreviewUrl={presenterData?.video?.url || null}
            thumbnailPreview={presenterData?.video?.thumbnail || null}
            talkData={talkData}
            summaryData={summaryData}
            onReset={handleReset}
            avatarVideoUrl={avatarVideoUrl}
            isTalkProcessing={isTalkProcessing}
            talkId={presenterData?.presenterId}
          />
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Loader className="animate-spin mx-auto mb-4" size={40} />
              <p className="text-gray-600">
                {t("summary:loading", "Loading...")}
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
