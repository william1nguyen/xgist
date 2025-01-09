"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Modal } from "../Modal";

interface VideoSummaryProps {
  videoUrl: string;
}

export default function VideoSummary({ videoUrl }: VideoSummaryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const mockSummary = `Video này trình bày về các khái niệm cơ bản của React.

Những điểm chính được đề cập:
1. Components và Props
- Cách tạo và sử dụng components
- Truyền dữ liệu qua props
- PropTypes và TypeScript
- Best practices khi thiết kế components

2. State Management
- Local state với useState
- Complex state với useReducer
- Global state management
- State optimization

3. Lifecycle Methods
- Component mounting
- Component updating
- Component unmounting
- Error boundaries

4. Hooks và Custom Hooks
- Built-in hooks (useState, useEffect, useContext)
- Rules of Hooks
- Creating custom hooks
- Common use cases

5. Performance Optimization
- React.memo
- useMemo và useCallback
- Code splitting
- Lazy loading

6. Advanced Patterns
- Render props
- Higher-order components
- Compound components
- Custom hooks patterns

Ngoài ra, video cũng đưa ra các best practices và common patterns khi làm việc với React.

Practical Examples:
- Building a responsive navigation
- Form handling with validation
- Data fetching and caching
- State management solutions
- Testing strategies
- Deployment considerations

Key Takeaways:
1. Start with component composition
2. Manage state effectively
3. Optimize when needed
4. Follow React best practices`;

  const handleGenerateSummary = () => {
    setIsModalOpen(true);
    setIsLoading(true);

    setTimeout(() => {
      setSummary(mockSummary);
      setIsLoading(false);
    }, 3000);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (!summary) {
      setIsLoading(false);
    }
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
