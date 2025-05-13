import React from "react";
import { Agent } from "../../types/agent";

interface AgentCardProps {
  agent: Agent;
  isSelected: boolean;
  onSelect: (agent: Agent) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  isSelected,
  onSelect,
}) => {
  return (
    <div
      className={`cursor-pointer rounded-lg p-2 transition-all duration-300 ${
        isSelected
          ? "bg-blue-100 border-2 border-blue-500"
          : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
      }`}
      onClick={() => onSelect(agent)}
    >
      <div className="flex flex-col items-center">
        <img
          src={agent.avatarUrl}
          alt={agent.name}
          className="w-16 h-16 object-cover rounded-full mb-1"
        />
        <p className="text-xs font-medium text-gray-800 text-center">
          {agent.name}
        </p>
      </div>
    </div>
  );
};
