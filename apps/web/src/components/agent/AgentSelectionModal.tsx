import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAgents } from "../../hooks/useAgents";
import { AgentGrid } from "./AgentGrid";
import { AgentLoadingSkeleton } from "./AgentLoadingSkeleton";
import { Agent } from "../../types/agent";
import { AgentSelectionHeader } from "./AgentSelectionHeader";
import { AgentDetails } from "./AgentDetail";

interface AgentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAgent: (agent: Agent) => void;
}

export const AgentSelectionModal: React.FC<AgentSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectAgent,
}) => {
  const { t } = useTranslation(["agent", "common"]);
  const {
    agents,
    selectedAgent,
    isLoading,
    error,
    fetchAgents,
    selectAgent,
    clearSelection,
  } = useAgents();

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (selectedAgent) {
      onSelectAgent(selectedAgent);
      onClose();
    }
  };

  const handleCancel = () => {
    clearSelection();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black opacity-50"></div>

        <div className="relative bg-white rounded-lg max-w-6xl w-full h-[85vh] flex flex-col">
          <div className="p-6 pb-0">
            <AgentSelectionHeader
              selectedAgent={selectedAgent}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          </div>

          <div className="flex-1 px-6 pb-6 flex gap-6 min-h-0">
            <div className="w-1/3 overflow-y-auto pr-4">
              {isLoading ? (
                <AgentLoadingSkeleton />
              ) : error ? (
                <div className="text-center py-10">
                  <p className="text-red-600">{error}</p>
                  <button
                    onClick={() => fetchAgents()}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    {t("common:retry")}
                  </button>
                </div>
              ) : (
                <AgentGrid
                  agents={agents}
                  selectedAgent={selectedAgent}
                  onSelectAgent={selectAgent}
                />
              )}
            </div>

            <div className="flex-1 border-l pl-6 min-h-0">
              {selectedAgent ? (
                <AgentDetails agent={selectedAgent} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p className="text-center">
                    {t("agent:select_agent_to_view_details")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
