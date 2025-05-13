import React, { useRef } from "react";
import { File, X, Upload, Loader2 } from "lucide-react";
import { MediaPreviewProps } from "../../types/media";

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  url,
  previewUrl,
  isUploading,
  onSelect,
  onRemove,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  if (!url) {
    return (
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 bg-gray-50"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={onSelect}
          accept="video/*,audio/*"
        />
        {isUploading ? (
          <>
            <Loader2
              size={48}
              className="mx-auto text-blue-500 mb-4 animate-spin"
            />
            <p className="text-base font-medium mb-2">Validating video...</p>
            <p className="text-sm text-gray-700">
              Please wait while we process your file
            </p>
          </>
        ) : (
          <>
            <Upload size={48} className="mx-auto text-blue-500 mb-4" />
            <p className="text-base font-medium mb-2">
              Drop your media file here
            </p>
            <p className="text-sm text-gray-700">
              Supports video and audio formats
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {previewUrl && (
        <video
          className="w-full h-64 object-cover rounded-lg mb-4"
          src={previewUrl}
          controls
        />
      )}
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <File size={20} className="text-gray-600 mr-2" />
            <span className="text-sm font-medium">{url.split("/").pop()}</span>
          </div>
          <button
            onClick={onRemove}
            className="text-gray-600 hover:text-red-600 p-1"
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        {isUploading && (
          <div className="mt-2 text-xs text-blue-600">Validating video...</div>
        )}
      </div>
    </>
  );
};
