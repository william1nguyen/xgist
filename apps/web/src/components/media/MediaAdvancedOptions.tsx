import React from "react";
import { ChevronDown } from "lucide-react";
import { AdvancedOptionsProps } from "../../types/media";

export const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
  options,
  show,
  disabled,
  onChange,
  onToggle,
}) => (
  <div className="mt-6 p-5 bg-gray-50 rounded-lg border border-gray-200">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-base font-semibold">Summary Options</h3>
      <button
        type="button"
        onClick={onToggle}
        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        disabled={disabled}
      >
        {show ? "Hide" : "Show"} <ChevronDown size={16} className="ml-1" />
      </button>
    </div>
    {show && (
      <div className="space-y-3">
        {Object.entries(options).map(([key, value]) => (
          <label key={key} className="flex items-center">
            <input
              type="checkbox"
              checked={value}
              onChange={() => onChange(key)}
              className="h-5 w-5 text-blue-600 rounded"
              disabled={disabled}
            />
            <span className="ml-3">{key}</span>
          </label>
        ))}
      </div>
    )}
  </div>
);
