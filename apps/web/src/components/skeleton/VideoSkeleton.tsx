import React from "react";

interface VideoSkeletonProps {
  viewMode: "grid" | "list";
  count?: number;
}

export const VideoSkeleton: React.FC<VideoSkeletonProps> = ({
  viewMode,
  count = 6,
}) => {
  return (
    <div
      className={
        viewMode === "grid"
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          : "space-y-4"
      }
    >
      {Array(count)
        .fill(0)
        .map((_, index) =>
          viewMode === "grid" ? (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm animate-pulse"
            >
              <div className="w-full h-40 bg-gray-300"></div>
              <div className="p-3">
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>

                <div className="flex items-center mb-3">
                  <div className="h-3 bg-gray-300 rounded w-1/4 mr-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/4"></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-6 w-6 rounded-full bg-gray-300 mr-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-20"></div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-4 w-4 bg-gray-300 rounded-full"></div>
                    <div className="h-4 w-4 bg-gray-300 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              key={index}
              className="flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm animate-pulse"
            >
              <div className="w-48 h-28 bg-gray-300 flex-shrink-0"></div>
              <div className="p-3 flex-1">
                <div className="h-4 bg-gray-300 rounded mb-2 w-3/4"></div>

                <div className="flex items-center mb-2">
                  <div className="h-3 bg-gray-300 rounded w-1/6 mr-3"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/6 mr-3"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/6"></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-6 w-6 rounded-full bg-gray-300 mr-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-20"></div>
                  </div>
                  <div className="flex space-x-3">
                    <div className="h-8 w-8 bg-gray-300 rounded"></div>
                    <div className="h-8 w-8 bg-gray-300 rounded"></div>
                    <div className="h-8 w-8 bg-gray-300 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
    </div>
  );
};
