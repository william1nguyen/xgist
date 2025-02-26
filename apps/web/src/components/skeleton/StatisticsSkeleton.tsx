import React from "react";

export const StatisticsSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow animate-pulse">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="h-6 bg-gray-300 rounded w-48"></div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Array(3)
            .fill(0)
            .map((_, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg p-4 border border-gray-100"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
                    <div className="h-8 bg-gray-300 rounded w-16"></div>
                  </div>
                  <div className="h-10 w-10 bg-gray-300 rounded-lg"></div>
                </div>
                <div className="h-4 bg-gray-300 rounded w-40 mt-4"></div>
              </div>
            ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="h-5 bg-gray-300 rounded w-32"></div>
            </div>
            <div className="p-4 space-y-4">
              {Array(5)
                .fill(0)
                .map((_, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="h-4 bg-gray-300 rounded w-24"></div>
                      <div className="h-4 bg-gray-300 rounded w-8"></div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-300 h-2 rounded-full"
                        style={{ width: `${Math.random() * 80 + 10}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="h-5 bg-gray-300 rounded w-32"></div>
            </div>
            <div className="p-4 space-y-4">
              {Array(4)
                .fill(0)
                .map((_, index) => (
                  <div key={index} className="flex items-start">
                    <div className="h-8 w-8 rounded-full bg-gray-300 mr-3 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded w-full mb-1"></div>
                      <div className="h-3 bg-gray-300 rounded w-20"></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
