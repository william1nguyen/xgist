import React from "react";
import { Clock, Search, X } from "lucide-react";

export interface SearchHistoryItem {
  query: string;
  time: string;
  timestamp: number;
}

export interface SearchHistoryProps {
  history: SearchHistoryItem[];
  searchTerm: string;
  onSelectHistory: (query: string) => void;
  onClearHistory: () => void;
  onClearHistoryItem: (index: number) => void;
  visible: boolean;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  history = [],
  searchTerm = "",
  onSelectHistory,
  onClearHistory,
  onClearHistoryItem,
  visible,
}) => {
  if (!visible || history.length === 0) return null;

  const filteredHistory = searchTerm
    ? history.filter((item) =>
        item.query.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : history;

  if (filteredHistory.length === 0) return null;

  return (
    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
      <div className="p-2 flex justify-between items-center border-b border-gray-100">
        <span className="text-sm text-gray-500 flex items-center">
          <Clock size={14} className="mr-1" />
          Recent Searches
        </span>
        <button
          onClick={onClearHistory}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Clear All
        </button>
      </div>
      <ul>
        {filteredHistory.map((item, index) => (
          <li
            key={index}
            className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer"
            onClick={() => onSelectHistory(item.query)}
          >
            <div className="flex items-center">
              <Search size={14} className="text-gray-400 mr-2" />
              <span className="text-gray-700">{item.query}</span>
            </div>
            <div className="flex items-center">
              <span className="text-xs text-gray-400 mr-2">{item.time}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearHistoryItem(index);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
