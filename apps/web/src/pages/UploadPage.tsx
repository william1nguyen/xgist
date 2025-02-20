import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { X, FileVideo, ImageIcon, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { httpClient } from "../config/httpClient";
import { toast } from "react-toastify";
import { ErrorMessage } from "../types/errors";
import { useKeycloakAuth } from "../hooks/useKeycloakAuth";

interface UploadFormData {
  title: string;
  description: string;
}

export const UploadPage = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { user } = useKeycloakAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadFormData>();

  const onVideoDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setVideoFile(acceptedFiles[0]);
    }
  }, []);

  const onThumbnailDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setThumbnailFile(acceptedFiles[0]);
    }
  }, []);

  const {
    getRootProps: getVideoRootProps,
    getInputProps: getVideoInputProps,
    isDragActive: isVideoDragActive,
  } = useDropzone({
    onDrop: onVideoDrop,
    accept: { "video/*": [] },
    maxFiles: 1,
  });

  const {
    getRootProps: getThumbnailRootProps,
    getInputProps: getThumbnailInputProps,
    isDragActive: isThumbnailDragActive,
  } = useDropzone({
    onDrop: onThumbnailDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const onSubmit = async (data: UploadFormData) => {
    if (!videoFile) {
      toast.error(ErrorMessage.VideoUploadInvalid);
      return;
    }

    if (!thumbnailFile) {
      toast.error(ErrorMessage.VideoThumbnailUploadInvalid);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      const { title, description } = data;
      formData.append("file", videoFile);
      formData.append("thumbnail", thumbnailFile);
      formData.append("title", title);
      formData.append("description", description);

      const response = await httpClient.post("/v1/videos", formData, {
        headers: {
          Authorization: `Bearer ${user?.access_token}`,
        },
      });
      if (response.status !== 200) {
        toast.error(ErrorMessage.UploadVideoFailed);
      }
      navigate("");
    } catch (error) {
      console.error("Error uploading video:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-8 text-gray-800">
            Đăng video mới
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                {...getVideoRootProps()}
                className={`
                    relative border-2 border-dashed rounded-xl p-8 transition-all duration-200
                    ${isVideoDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
                    min-h-[280px] flex flex-col items-center justify-center cursor-pointer
                  `}
              >
                <input {...getVideoInputProps()} />
                {!videoFile ? (
                  <>
                    <FileVideo className="w-16 h-16 text-gray-400 mb-4" />
                    <div className="text-center">
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        Kéo thả video vào đây
                      </p>
                      <p className="text-sm text-gray-500">
                        hoặc click để chọn file
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="w-full">
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileVideo className="w-8 h-8 text-blue-500" />
                        <div>
                          <p className="font-medium text-gray-800">
                            {videoFile.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVideoFile(null);
                        }}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div
                {...getThumbnailRootProps()}
                className={`
                    relative border-2 border-dashed rounded-xl p-8 transition-all duration-200
                    ${isThumbnailDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
                    min-h-[280px] flex flex-col items-center justify-center cursor-pointer
                  `}
              >
                <input {...getThumbnailInputProps()} />
                {!thumbnailFile ? (
                  <>
                    <ImageIcon className="w-16 h-16 text-gray-400 mb-4" />
                    <div className="text-center">
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        Kéo thả ảnh thumbnail
                      </p>
                      <p className="text-sm text-gray-500">
                        hoặc click để chọn file
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="w-full">
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <ImageIcon className="w-8 h-8 text-blue-500" />
                        <div>
                          <p className="font-medium text-gray-800">
                            {thumbnailFile.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setThumbnailFile(null);
                        }}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  {...register("title")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Nhập tiêu đề video"
                />
                {errors.title && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả
                </label>
                <textarea
                  {...register("description")}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Mô tả về nội dung video của bạn"
                />
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={uploading}
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-700"
              >
                {uploading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Đang tải lên...
                  </span>
                ) : (
                  "Đăng video"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
