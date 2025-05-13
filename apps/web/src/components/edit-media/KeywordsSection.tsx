import React from "react";
import { Tag, X } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Keyword } from "../../types/media";

interface KeywordsSectionProps {
  keywords: Keyword[];
  keywordInput: string;
  onKeywordInputChange: (value: string) => void;
  onAddKeyword: () => void;
  onRemoveKeyword: (keyword: string) => void;
}

export const KeywordsSection: React.FC<KeywordsSectionProps> = ({
  keywords,
  keywordInput,
  onKeywordInputChange,
  onAddKeyword,
  onRemoveKeyword,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddKeyword();
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-black mb-2 flex items-center">
        <Tag size={18} className="text-indigo-500 mr-2" />
        Keywords
      </h3>
      <p className="text-black mb-4 text-sm">
        Add relevant keywords to improve media discoverability
      </p>

      <div className="flex mb-3">
        <Input
          type="text"
          value={keywordInput}
          onChange={(e) => onKeywordInputChange(e.target.value)}
          placeholder="Add a keyword"
          className="flex-grow"
          onKeyDown={handleKeyDown}
        />
        <Button onClick={onAddKeyword} variant="outline" className="ml-2">
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, index) => (
          <div
            key={index}
            className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm flex items-center"
          >
            {keyword.content}
            <button
              onClick={() => onRemoveKeyword(keyword.content)}
              className="ml-2 text-indigo-500 hover:text-indigo-700"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
