import React from "react";
import { MessageSquare, Clock, Edit3, Check } from "lucide-react";
import { TranscriptChunkEditor } from "./TranscriptChunkEditor";
import { TranscriptTabProps } from "../../types/media";
import { TabsContent } from "../ui/Tabs";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/TextArea";

export const TranscriptTab: React.FC<TranscriptTabProps> = ({
  transcript,
  fullTranscriptText,
  isEditingFullTranscript,
  isEditingChunk,
  editedChunkText,
  onToggleFullTranscriptEdit,
  onFullTranscriptChange,
  onStartEditingChunk,
  onSaveChunkEdit,
  onCancelChunkEdit,
  onSeekToTime,
}) => {
  return (
    <TabsContent value="transcript" className="space-y-8">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-black flex items-center">
            <MessageSquare size={18} className="text-indigo-500 mr-2" />
            Full Transcript
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullTranscriptEdit}
            className="text-indigo-600"
          >
            {isEditingFullTranscript ? (
              <>
                <Check size={16} className="mr-1" /> Save
              </>
            ) : (
              <>
                <Edit3 size={16} className="mr-1" /> Edit
              </>
            )}
          </Button>
        </div>

        {isEditingFullTranscript ? (
          <Textarea
            value={fullTranscriptText}
            onChange={(e) => onFullTranscriptChange(e.target.value)}
            placeholder="Edit transcript..."
            rows={10}
            className="w-full"
          />
        ) : (
          <div className="bg-gray-50 p-4 rounded-md max-h-60 overflow-y-auto">
            <p className="text-black whitespace-pre-wrap">
              {fullTranscriptText}
            </p>
          </div>
        )}
      </div>

      {transcript && transcript.chunks && transcript.chunks.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-black mb-4 flex items-center">
            <Clock size={18} className="text-indigo-500 mr-2" />
            Transcript Chunks
          </h3>

          <div className="space-y-3 max-h-96 overflow-y-auto p-2">
            {transcript.chunks.map((chunk, index) => (
              <TranscriptChunkEditor
                key={index}
                chunk={chunk}
                index={index}
                isEditing={isEditingChunk === index}
                editedText={isEditingChunk === index ? editedChunkText : ""}
                onStartEdit={onStartEditingChunk}
                onSaveEdit={onSaveChunkEdit}
                onCancelEdit={onCancelChunkEdit}
                onSeekToTime={onSeekToTime}
                onTextChange={() => {
                  if (isEditingChunk === index) {
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}
    </TabsContent>
  );
};
