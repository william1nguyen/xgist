import React, { useRef } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { ThumbnailUploadProps } from "../../types/media";

export const ThumbnailUpload: React.FC<ThumbnailUploadProps> = ({
  url,
  previewUrl,
  isUploading,
  onSelect,
  onRemove,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Thumbnail</h3>
      <div className="grid grid-cols-2 gap-4">
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 h-48 flex flex-col justify-center bg-gray-50"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={onSelect}
            accept="image/*"
          />
          <ImageIcon size={36} className="text-blue-500 mb-3 mx-auto" />
          <p className="text-sm font-medium">Upload thumbnail</p>
          {isUploading && (
            <p className="text-xs text-blue-600 mt-2">Uploading...</p>
          )}
        </div>

        {previewUrl ? (
          <div className="relative h-48 rounded-lg overflow-hidden border border-gray-300">
            <img
              src={previewUrl}
              alt="Thumbnail"
              className="w-full h-full object-cover"
            />
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 text-white p-1.5 rounded-full"
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="h-48 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
            <p className="text-sm text-gray-500">Preview</p>
          </div>
        )}
      </div>
    </div>
  );
};
