import React from "react";

interface ActivityItemProps {
  icon: React.ReactNode;
  iconColor: "indigo" | "purple" | "green" | "blue" | "red";
  title: string;
  timestamp: string;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  icon,
  iconColor,
  title,
  timestamp,
}) => {
  const colorClasses = {
    indigo: "bg-indigo-100 text-indigo-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <div className="flex items-start">
      <div
        className={`h-8 w-8 rounded-full ${colorClasses[iconColor]} flex items-center justify-center mr-3 flex-shrink-0`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-800">{title}</p>
        <p className="text-xs text-gray-500">{timestamp}</p>
      </div>
    </div>
  );
};
