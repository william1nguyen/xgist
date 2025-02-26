import React, { useState } from "react";
import { SortAsc, ChevronDown } from "lucide-react";

export interface SortOption {
  id: string;
  label: string;
}

interface SortingMenuProps {
  options: SortOption[];
  selectedOption: string;
  onSelect: (optionId: string) => void;
}

export const SortingMenu: React.FC<SortingMenuProps> = ({
  options,
  selectedOption,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getSelectedLabel = () => {
    return options.find((option) => option.id === selectedOption)?.label || "";
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50"
      >
        <SortAsc size={16} className="mr-1" />
        {getSelectedLabel()}
        <ChevronDown size={16} className="ml-1" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 py-1">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onSelect(option.id);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
