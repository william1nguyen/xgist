import { useState } from "react";
import { httpClient } from "../config/httpClient";
import { toast } from "react-toastify";
import { Agent, AgentResponse, AgentSelectionState } from "../types/agent";

export const useAgents = () => {
  const [state, setState] = useState<AgentSelectionState>({
    agents: [],
    selectedAgent: null,
    isLoading: false,
    error: null,
    metadata: null,
  });

  const fetchAgents = async (page: number = 1, size: number = 10) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await httpClient.get<AgentResponse>("/v1/agent", {
        params: { page, size },
      });

      setState((prev) => ({
        ...prev,
        agents: response.data.data,
        metadata: response.data.metadata,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load agents";
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      toast.error(errorMessage);
    }
  };

  const selectAgent = (agent: Agent) => {
    setState((prev) => ({
      ...prev,
      selectedAgent: agent,
    }));
  };

  const clearSelection = () => {
    setState((prev) => ({
      ...prev,
      selectedAgent: null,
    }));
  };

  return {
    ...state,
    fetchAgents,
    selectAgent,
    clearSelection,
  };
};
