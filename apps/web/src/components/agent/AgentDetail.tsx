import React from "react";
import { useTranslation } from "react-i18next";
import { Agent } from "../../types/agent";

interface AgentDetailsProps {
  agent: Agent;
}

export const AgentDetails: React.FC<AgentDetailsProps> = ({ agent }) => {
  const { t } = useTranslation(["agent"]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start gap-4 mb-4">
        <img
          src={agent.avatarUrl}
          alt={agent.name}
          className="w-24 h-24 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{agent.name}</h2>
          <div className="mt-2">
            <p className="text-sm text-gray-600 font-medium">
              {t("agent:voice_id")}
            </p>
            <p className="text-base text-gray-800">{agent.voiceId}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
          {t("agent:preview_video")}
        </h3>
        <div className="flex-1 relative">
          <video
            src={agent.videoUrl}
            className="absolute inset-0 w-full h-full rounded-lg shadow-md object-cover"
            autoPlay
          />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 flex justify-between">
          <span>
            {t("agent:created_at")}:{" "}
            {new Date(agent.createdTime).toLocaleDateString()}
          </span>
          <span>
            {t("agent:updated_at")}:{" "}
            {new Date(agent.updatedTime).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};
