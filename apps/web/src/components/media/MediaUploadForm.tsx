import React from "react";
import { Button } from "../ui/Button";
import { MediaPreview } from "./MediaPreview";
import { MediaUploadHandlers, MediaUploadState } from "../../types/media";
import { ThumbnailUpload } from "./MediaThumbnailUpload";
import { DetailsForm } from "./MediaDetailsForm";
import { AdvancedOptions } from "./MediaAdvancedOptions";

interface Props extends MediaUploadState, MediaUploadHandlers {}

export const MediaUploadForm: React.FC<Props> = (props) => {
  const {
    mediaUrl,
    mediaPreviewUrl,
    thumbnailUrl,
    thumbnailPreview,
    title = "",
    description = "",
    category = "",
    advancedOptions = {},
    isProcessing,
    isUploadingMedia,
    isUploadingThumbnail,
    showAdvancedOptions,
    categories,
    onMediaSelect,
    onThumbnailSelect,
    onRemoveMedia,
    onRemoveThumbnail,
    onFieldChange,
    onOptionChange,
    onToggleOptions,
    onSubmit,
    onCancel,
  } = props;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Upload Media</h3>
          <MediaPreview
            url={mediaUrl ?? ""}
            previewUrl={mediaPreviewUrl}
            isUploading={isUploadingMedia}
            onSelect={onMediaSelect}
            onRemove={onRemoveMedia}
          />
        </div>
        <ThumbnailUpload
          url={thumbnailUrl ?? ""}
          previewUrl={thumbnailPreview}
          isUploading={isUploadingThumbnail}
          onSelect={onThumbnailSelect}
          onRemove={onRemoveThumbnail}
        />
      </div>

      <div className="lg:col-span-5">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-4">
          <h3 className="text-lg font-semibold mb-4">Media Details</h3>
          <DetailsForm
            title={title}
            description={description}
            category={category}
            categories={categories}
            disabled={isProcessing}
            onChange={onFieldChange}
          />
          <AdvancedOptions
            options={advancedOptions}
            show={showAdvancedOptions}
            disabled={isProcessing}
            onChange={onOptionChange}
            onToggle={onToggleOptions}
          />
          <div className="flex justify-end mt-6 pt-4 border-t">
            {isProcessing ? (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={onSubmit}
                disabled={!mediaUrl || !title || isUploadingMedia}
              >
                Publish
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
