import React from "react";

import { MessageSquare } from "lucide-react";
import { TranscriptTab } from "./TranscriptTab";
import { MediaData } from "../../types/media";
import { Tabs, TabsList, TabsTrigger } from "../ui/Tabs";

interface MediaEditTabsProps {
  activeTab: string;
  mediaData: MediaData;
  state: any;
  handlers: any;
  onTabChange: (value: string) => void;
  onSeekToTime: (time: number) => void;
}

export const MediaEditTabs: React.FC<MediaEditTabsProps> = ({
  activeTab,
  mediaData,
  state,
  handlers,
  onTabChange,
  onSeekToTime,
}) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="mb-4 border-b w-full">
        <TabsTrigger value="transcript" className="flex items-center">
          <MessageSquare size={16} className="mr-2" />
          Transcript
        </TabsTrigger>
      </TabsList>

      <TranscriptTab
        transcript={mediaData.transcript}
        fullTranscriptText={state.fullTranscriptText}
        isEditingFullTranscript={state.isEditingFullTranscript}
        isEditingChunk={state.isEditingChunk}
        editedChunkText={state.editedChunkText}
        onToggleFullTranscriptEdit={handlers.toggleFullTranscriptEdit}
        onFullTranscriptChange={handlers.handleFullTranscriptChange}
        onStartEditingChunk={handlers.startEditingChunk}
        onSaveChunkEdit={handlers.saveChunkEdit}
        onCancelChunkEdit={handlers.cancelChunkEdit}
        onSeekToTime={onSeekToTime}
      />
    </Tabs>
  );
};
