import React from "react";
import { KeywordsSection } from "./KeywordsSection";
import { KeypointsSection } from "./KeypointsSection";
import { TabsContent } from "../ui/Tabs";
import { ContentTabProps } from "../../types/media";

export const ContentTab: React.FC<ContentTabProps> = ({
  mediaData,
  keywordInput,
  keypointInput,
  onKeywordInputChange,
  onKeypointInputChange,
  onAddKeyword,
  onRemoveKeyword,
  onAddKeypoint,
  onRemoveKeypoint,
}) => {
  return (
    <TabsContent value="content" className="space-y-8">
      <KeywordsSection
        keywords={mediaData.keywords}
        keywordInput={keywordInput}
        onKeywordInputChange={onKeywordInputChange}
        onAddKeyword={onAddKeyword}
        onRemoveKeyword={onRemoveKeyword}
      />

      <KeypointsSection
        keypoints={mediaData.keypoints}
        keypointInput={keypointInput}
        onKeypointInputChange={onKeypointInputChange}
        onAddKeypoint={onAddKeypoint}
        onRemoveKeypoint={onRemoveKeypoint}
      />
    </TabsContent>
  );
};
