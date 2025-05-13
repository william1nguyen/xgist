import React from "react";
import { Clock, Edit3, Check, X } from "lucide-react";
import { Textarea } from "../ui/TextArea";
import { TranscriptChunk } from "../../types/media";

interface TranscriptChunkEditorProps {
  chunk: TranscriptChunk;
  index: number;
  isEditing: boolean;
  editedText: string;
  onStartEdit: (index: number, text: string) => void;
  onSaveEdit: (index: number) => void;
  onCancelEdit: () => void;
  onSeekToTime: (time: number) => void;
  onTextChange: (text: string) => void;
}

export const TranscriptChunkEditor: React.FC<TranscriptChunkEditorProps> = ({
  chunk,
  index,
  isEditing,
  editedText,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onSeekToTime,
  onTextChange,
}) => {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  return (
    <div className="border rounded-md p-3 bg-white">
      <div className="flex justify-between items-center mb-2">
        <div
          className="flex items-center text-sm text-indigo-600 cursor-pointer hover:text-indigo-800"
          onClick={() => onSeekToTime(chunk.time)}
        >
          <Clock size={14} className="mr-1" />
          {formatTime(chunk.time)}
        </div>

        {isEditing ? (
          <div className="flex space-x-2">
            <button
              className="text-green-600 hover:text-green-800"
              onClick={() => onSaveEdit(index)}
            >
              <Check size={14} />
            </button>
            <button
              className="text-red-600 hover:text-red-800"
              onClick={onCancelEdit}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            className="text-black hover:text-gray-700"
            onClick={() => onStartEdit(index, chunk.content)}
          >
            <Edit3 size={14} />
          </button>
        )}
      </div>

      {isEditing ? (
        <Textarea
          value={editedText}
          onChange={(e) => onTextChange(e.target.value)}
          rows={2}
          className="w-full text-sm"
        />
      ) : (
        <p className="text-sm text-black">{chunk.content}</p>
      )}
    </div>
  );
};
