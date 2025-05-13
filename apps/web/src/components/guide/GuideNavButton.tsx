import React from "react";
import { ChevronRight } from "lucide-react";
import { GuideNavButtonProps } from "../../types/guide";

export const GuideNavButton: React.FC<GuideNavButtonProps> = ({
  guide,
  isActive,
  onClick,
}) => {
  return (
    <button
      className={`flex items-center p-4 rounded-lg transition-all ${
        isActive
          ? "bg-indigo-50 border-l-4 border-indigo-600"
          : "hover:bg-gray-50 border-l-4 border-transparent"
      }`}
      onClick={onClick}
    >
      <div className="mr-4">{guide.icon}</div>
      <div className="text-left">
        <h3
          className={`font-medium ${isActive ? "text-indigo-700" : "text-gray-800"}`}
        >
          {guide.title}
        </h3>
        <p className="text-sm text-gray-600">{guide.description}</p>
      </div>
      <ChevronRight
        size={20}
        className={`ml-auto ${isActive ? "text-indigo-600" : "text-gray-500"}`}
      />
    </button>
  );
};
