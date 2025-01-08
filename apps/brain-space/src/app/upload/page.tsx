"use client";

import { useForm } from "react-hook-form";
import { Upload, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface UploadFormData {
  title: string;
  description: string;
  category: string;
  tags: string;
}

export default function UploadPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadFormData>();

  const onSubmit = async (data: UploadFormData) => {
    if (!videoFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      if (thumbnailFile) {
        formData.append("thumbnail", thumbnailFile);
      }
      formData.append("data", JSON.stringify(data));

      const response = await fetch("/api/videos/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const { id } = await response.json();
        router.push(`/videos/${id}`);
      }
    } catch (error) {
      console.error("Error uploading video:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Đăng video mới</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Video Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Video</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                {!videoFile ? (
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Chọn video để tải lên
                        </span>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) =>
                            setVideoFile(e.target.files?.[0] || null)
                          }
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{videoFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setVideoFile(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Ảnh thumbnail
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                {!thumbnailFile ? (
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Chọn ảnh thumbnail
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            setThumbnailFile(e.target.files?.[0] || null)
                          }
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{thumbnailFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setThumbnailFile(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Tiêu đề</label>
              <input
                type="text"
                {...register("title", { required: "Tiêu đề là bắt buộc" })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Mô tả</label>
              <textarea
                {...register("description")}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">Danh mục</label>
              <select
                {...register("category", {
                  required: "Vui lòng chọn danh mục",
                })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              >
                <option value="">Chọn danh mục</option>
                <option value="programming">Lập trình</option>
                <option value="math">Toán học</option>
                <option value="science">Khoa học</option>
                <option value="language">Ngoại ngữ</option>
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.category.message}
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Tags (phân cách bằng dấu phẩy)
              </label>
              <input
                type="text"
                {...register("tags")}
                placeholder="ví dụ: javascript, web development, tutorial"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!videoFile || uploading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {uploading ? "Đang tải lên..." : "Đăng video"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
