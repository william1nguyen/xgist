import React from "react";
import { AgentCard } from "./AgentCard";
import { Agent } from "../../types/agent";

interface AgentGridProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
}

export const AgentGrid: React.FC<AgentGridProps> = ({
  agents,
  selectedAgent,
  onSelectAgent,
}) => {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-gray-700">
        Available Agents
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isSelected={selectedAgent?.id === agent.id}
            onSelect={onSelectAgent}
          />
        ))}
      </div>
    </div>
  );
};
