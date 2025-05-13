import React from "react";
import { FileText } from "lucide-react";
import { Textarea } from "../ui/TextArea";

interface SummarySectionProps {
  summary: string;
  onSummaryChange: (value: string) => void;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  summary,
  onSummaryChange,
}) => {
  return (
    <div>
      <h3 className="text-lg font-medium text-black mb-2 flex items-center">
        <FileText size={18} className="text-indigo-500 mr-2" />
        Summary
      </h3>
      <p className="text-black mb-4 text-sm">
        Provide a brief summary of the media content
      </p>

      <Textarea
        value={summary}
        onChange={(e) => onSummaryChange(e.target.value)}
        placeholder="Write a summary..."
        rows={6}
        className="w-full resize-none"
      />
    </div>
  );
};
