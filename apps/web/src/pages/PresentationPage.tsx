import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { useTranslation } from "react-i18next";
import { AgentSelectionModal } from "../components/agent/AgentSelectionModal";
import { toast } from "react-toastify";
import { Agent } from "../types/agent";
import { httpClient } from "../config/httpClient";
import { Loader, Film } from "lucide-react";

interface MediaInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  summary: string;
  duration: number;
  category: string;
}

export const PresentationPage: React.FC = () => {
  const { t } = useTranslation(["presentation", "common"]);
  const { mediaId } = useParams<{ mediaId: string }>();
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (mediaId) {
      fetchMediaInfo();
    }
  }, [mediaId]);

  const fetchMediaInfo = async () => {
    setIsLoading(true);
    try {
      const response = await httpClient.get(`/v1/media/${mediaId}`);
      const data = response.data.data;

      setMediaInfo({
        id: data.id,
        title: data.title,
        description: data.description,
        thumbnail: data.thumbnail,
        url: data.url,
        summary: data.metadata?.summary || "",
        duration: data.duration || 0,
        category: data.category || "",
      });
    } catch (error) {
      console.error("Error fetching media info:", error);
      toast.error("Failed to load media information");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    toast.success(t("presentation:agent_selected", { name: agent.name }));
  };

  const openAgentSelection = () => {
    setIsAgentModalOpen(true);
  };

  const closeAgentSelection = () => {
    setIsAgentModalOpen(false);
  };

  if (isLoading) {
    return (
      <Layout activeItem="presentation" title={t("presentation:page_title")}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-center items-center py-16">
            <Loader size={32} className="animate-spin text-indigo-600" />
            <span className="ml-2 text-indigo-600">{t("common:loading")}</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeItem="presentation" title={t("presentation:page_title")}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-black mb-6 border-b pb-3">
              {t("presentation:title")}
            </h2>

            {mediaInfo && (
              <div className="mb-6 bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Film size={20} className="mr-2 text-indigo-600" />
                  {t("presentation:media_info")}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <img
                      src={mediaInfo.thumbnail}
                      alt={mediaInfo.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        {t("presentation:title_label")}
                      </p>
                      <p className="text-black font-semibold">
                        {mediaInfo.title}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        {t("presentation:duration_label")}
                      </p>
                      <p className="text-black">
                        {formatDuration(mediaInfo.duration)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        {t("presentation:category_label")}
                      </p>
                      <p className="text-black">{mediaInfo.category}</p>
                    </div>
                  </div>
                </div>

                {mediaInfo.summary && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 font-medium mb-2">
                      {t("presentation:summary_label")}
                    </p>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-black text-sm leading-relaxed">
                        {mediaInfo.summary}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedAgent && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <img
                    src={selectedAgent.avatarUrl}
                    alt={selectedAgent.name}
                    className="w-16 h-16 rounded-full object-cover mr-4"
                  />
                  <div>
                    <p className="text-lg font-semibold">
                      {selectedAgent.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t("presentation:ready_to_present")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={openAgentSelection}
                className="w-full md:w-auto px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {selectedAgent
                  ? t("presentation:change_agent")
                  : t("presentation:select_agent")}
              </button>

              {selectedAgent && mediaInfo && (
                <button className="ml-0 md:ml-4 w-full md:w-auto px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                  {t("presentation:start_presentation")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <AgentSelectionModal
        isOpen={isAgentModalOpen}
        onClose={closeAgentSelection}
        onSelectAgent={handleSelectAgent}
      />
    </Layout>
  );
};
