import React from "react";
import { useTranslation } from "react-i18next";
import { Agent } from "../../types/agent";

interface AgentSelectionHeaderProps {
  selectedAgent: Agent | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AgentSelectionHeader: React.FC<AgentSelectionHeaderProps> = ({
  selectedAgent,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation(["agent", "common"]);

  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          {t("agent:select_agent_title")}
        </h2>
        <p className="text-gray-600 mt-1">
          {t("agent:select_agent_description")}
        </p>
      </div>
      <div className="flex space-x-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {t("common:cancel")}
        </button>
        <button
          onClick={onConfirm}
          disabled={!selectedAgent}
          className={`px-6 py-2 rounded-lg transition-colors ${
            selectedAgent
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {t("agent:confirm_selection")}
        </button>
      </div>
    </div>
  );
};
