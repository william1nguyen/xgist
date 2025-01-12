"use client";
import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { Modal } from "../Modal";
import { Video } from "@/types/video";

interface VideoSummaryProps {
  video: Video
}

export default function VideoSummary({ video }: VideoSummaryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    // Nếu đã có summary, hiển thị ngay
    if (summary) {
      setIsModalOpen(true);
      return;
    }

    setIsModalOpen(true);
    setIsLoading(true);

    try {
      // Gọi API để lấy summary
      const response = await fetch(`/api/videos/${video.id}/summary`);
      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }
      const summaryData = (await response.json()).summary;

      // Đợi 3 giây trước khi hiển thị kết quả
      await new Promise(resolve => setTimeout(resolve, 3000));

      setSummary(summaryData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error generating summary:', error);
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="mt-4 bg-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tóm tắt video</h3>
          <button
            onClick={handleGenerateSummary}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={isLoading}
          >
            {summary ? "Xem tóm tắt" : "Tạo tóm tắt"}
          </button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <div className="relative">
          <button
            onClick={handleCloseModal}
            className="absolute right-0 top-0 p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="pr-8">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <div className="space-y-2 text-center">
                  <p className="text-lg font-medium">
                    Đang tạo tóm tắt video...
                  </p>
                  <p className="text-sm text-gray-500">
                    Vui lòng đợi trong giây lát
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">
                  Tóm tắt nội dung video
                </h3>
                <div className="space-y-4">
                  {summary?.split("\n").map((paragraph, index) => (
                    <p key={index} className="text-gray-600">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
