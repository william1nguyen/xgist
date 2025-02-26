import React from "react";
import { Grid, List } from "lucide-react";

interface ViewToggleProps {
  viewMode: "grid" | "list";
  onViewChange: (mode: "grid" | "list") => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  viewMode,
  onViewChange,
}) => {
  return (
    <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
      <button
        onClick={() => onViewChange("grid")}
        className={`p-1.5 ${
          viewMode === "grid"
            ? "bg-gray-100 text-indigo-600"
            : "bg-white text-gray-500 hover:text-gray-700"
        }`}
      >
        <Grid size={18} />
      </button>
      <button
        onClick={() => onViewChange("list")}
        className={`p-1.5 ${
          viewMode === "list"
            ? "bg-gray-100 text-indigo-600"
            : "bg-white text-gray-500 hover:text-gray-700"
        }`}
      >
        <List size={18} />
      </button>
    </div>
  );
};
