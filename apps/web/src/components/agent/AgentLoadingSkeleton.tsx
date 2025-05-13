import React from "react";

export const AgentLoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="h-5 w-32 bg-gray-300 rounded animate-pulse"></div>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg p-2">
              <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-1"></div>
              <div className="h-3 bg-gray-300 rounded w-14 mx-auto"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
