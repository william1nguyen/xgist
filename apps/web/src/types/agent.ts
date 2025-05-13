export interface Agent {
  id: string;
  name: string;
  avatarUrl: string;
  voiceId: string;
  videoUrl: string;
  createdTime: string;
  updatedTime: string;
  deletedTime: string | null;
}

export interface AgentMetadata {
  page: number;
  size: number;
  total: number;
}

export interface AgentResponse {
  data: Agent[];
  metadata: AgentMetadata;
}

export interface AgentSelectionState {
  agents: Agent[];
  selectedAgent: Agent | null;
  isLoading: boolean;
  error: string | null;
  metadata: AgentMetadata | null;
}
