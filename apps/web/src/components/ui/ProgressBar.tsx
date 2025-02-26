import React from "react";

interface ProgressBarProps {
  progress: number;
  label?: string;
  value?: string | number;
  height?: "sm" | "md" | "lg";
  color?: "indigo" | "blue" | "green" | "red" | "yellow";
  showPercentage?: boolean;
  animate?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  value,
  height = "md",
  color = "indigo",
  showPercentage = false,
  animate = false,
}) => {
  const heightClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-4",
  };

  const colorClasses = {
    indigo: "bg-indigo-600",
    blue: "bg-blue-600",
    green: "bg-green-600",
    red: "bg-red-600",
    yellow: "bg-yellow-600",
  };

  const animateClass = animate ? "transition-all duration-300" : "";

  return (
    <div>
      {(label || value) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-sm text-gray-600">{label}</span>}
          {value && <span className="text-sm font-medium">{value}</span>}
          {showPercentage && !value && (
            <span className="text-sm font-medium">{progress}%</span>
          )}
        </div>
      )}
      <div
        className={`w-full bg-gray-200 rounded-full ${heightClasses[height]}`}
      >
        <div
          className={`${colorClasses[color]} ${heightClasses[height]} rounded-full ${animateClass}`}
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        ></div>
      </div>
    </div>
  );
};
