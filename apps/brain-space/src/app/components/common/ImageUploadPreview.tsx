import { Camera, User } from "lucide-react";
import Image from "next/image";

interface ImageUploadPreviewProps {
  currentImage?: string;
  onFileSelected: (file: File) => void;
  previewUrl: string | null;
}

export function ImageUploadPreview({
  currentImage,
  onFileSelected,
  previewUrl,
}: ImageUploadPreviewProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <div className="relative">
      <div className="w-24 h-24 rounded-full overflow-hidden">
        {previewUrl || currentImage ? (
          <Image
            src={previewUrl || currentImage || ""}
            alt="Avatar preview"
            width={96}
            height={96}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <User className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>
      <label className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700 cursor-pointer">
        <Camera className="w-4 h-4" />
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}
