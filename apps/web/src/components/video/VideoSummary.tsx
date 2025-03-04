import React, { useState } from "react";
import {
  Clock,
  MessageSquare,
  Download,
  Share,
  Copy,
  FastForward,
  ThumbsUp,
  ThumbsDown,
  Printer,
  ExternalLink,
  Tag,
  Lightbulb,
} from "lucide-react";

interface KeyPoint {
  timestamp: string;
  title: string;
  content: string;
}

interface VideoSummaryProps {
  videoId: string;
  videoTitle: string;
  originalDuration: string;
  readingTime: string;
  summaryDate: string;
  summaryText: string;
  keyPoints: KeyPoint[];
  mainIdeas?: string[];
  mainKeys?: string[];
  wordCount: string;
}

export const VideoSummary: React.FC<VideoSummaryProps> = ({
  videoTitle,
  originalDuration,
  readingTime,
  summaryDate,
  summaryText,
  keyPoints,
  mainIdeas = [],
  mainKeys = [],
  wordCount,
}) => {
  const [activeSection, setActiveSection] = useState<"summary" | "key-points">(
    "summary"
  );
  const [expandedPoints, setExpandedPoints] = useState<number[]>([]);

  const togglePointExpansion = (index: number) => {
    if (expandedPoints.includes(index)) {
      setExpandedPoints(expandedPoints.filter((i) => i !== index));
    } else {
      setExpandedPoints([...expandedPoints, index]);
    }
  };

  const handleCopyToClipboard = () => {
    const content = `
# Tóm tắt: ${videoTitle}

${summaryText}

## Ý chính:
${mainIdeas.map((idea) => `- ${idea}`).join("\n")}

## Điểm chính:
${keyPoints.map((point) => `- [${point.timestamp}] ${point.title}: ${point.content}`).join("\n")}

## Từ khóa:
${mainKeys.join(", ")}
    `;

    navigator.clipboard.writeText(content);
    alert("Đã sao chép tóm tắt vào clipboard!");
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold flex items-center">
            <FastForward size={20} className="mr-2" />
            Tóm tắt AI
          </h2>
          <div className="flex items-center text-sm bg-indigo-500 py-1 px-2 rounded">
            <Clock size={14} className="mr-1" />
            <span>
              Tiết kiệm{" "}
              {Math.round(
                (parseInt(originalDuration.split(":")[0]) * 60 +
                  parseInt(originalDuration.split(":")[1]) -
                  parseInt(readingTime.split(" ")[0])) /
                  60
              )}{" "}
              phút
            </span>
          </div>
        </div>
        <p className="text-indigo-100 text-sm">{videoTitle}</p>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <span className="flex items-center">
            <Clock size={14} className="mr-1" />
            <span>Video gốc: {originalDuration}</span>
          </span>
          <span className="flex items-center">
            <FastForward size={14} className="mr-1" />
            <span>Đọc trong: {readingTime}</span>
          </span>
          <span className="flex items-center">
            <MessageSquare size={14} className="mr-1" />
            <span>{wordCount}</span>
          </span>
        </div>
        <span className="text-xs">Tóm tắt: {summaryDate}</span>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            activeSection === "summary"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveSection("summary")}
        >
          Tóm tắt
        </button>
        <button
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            activeSection === "key-points"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveSection("key-points")}
        >
          Điểm chính ({keyPoints.length})
        </button>
      </div>

      <div className="p-4">
        {activeSection === "summary" ? (
          <div>
            <div className="prose max-w-none mb-6">
              <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                {summaryText}
              </p>
            </div>

            {/* Ý chính section */}
            {mainIdeas.length > 0 && (
              <div className="mt-6 mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center text-indigo-700">
                  <Lightbulb size={18} className="mr-2" />Ý chính
                </h3>
                <div className="space-y-2">
                  {mainIdeas.map((idea, index) => (
                    <div
                      key={index}
                      className="flex items-start p-3 border border-indigo-100 bg-indigo-50 rounded-lg"
                    >
                      <div className="bg-indigo-100 text-indigo-800 w-6 h-6 flex items-center justify-center rounded-full mr-3 flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-gray-800">{idea}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Từ khóa section */}
            {mainKeys.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center text-indigo-700">
                  <Tag size={18} className="mr-2" />
                  Từ khóa
                </h3>
                <div className="flex flex-wrap gap-2 py-2">
                  {mainKeys.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {keyPoints.map((point, index) => (
              <div
                key={index}
                className={`border border-gray-200 rounded-lg overflow-hidden transition-all ${
                  expandedPoints.includes(index) ? "shadow-sm" : ""
                }`}
              >
                <div
                  className={`flex items-start p-3 cursor-pointer ${
                    expandedPoints.includes(index)
                      ? "bg-indigo-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => togglePointExpansion(index)}
                >
                  <div className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-medium mr-3 whitespace-nowrap">
                    {point.timestamp}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{point.title}</h4>
                    {expandedPoints.includes(index) && (
                      <p className="text-sm text-gray-600 mt-2">
                        {point.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center mr-auto">
            <button className="p-1.5 text-gray-500 hover:text-indigo-600 rounded">
              <ThumbsUp size={18} />
            </button>
            <button className="p-1.5 text-gray-500 hover:text-red-500 rounded">
              <ThumbsDown size={18} />
            </button>
            <span className="text-xs text-gray-500 ml-2">
              Đánh giá tóm tắt này
            </span>
          </div>

          <button
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            onClick={handleCopyToClipboard}
          >
            <Copy size={14} />
            <span>Sao chép</span>
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">
            <Share size={14} />
            <span>Chia sẻ</span>
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">
            <Download size={14} />
            <span>Tải xuống</span>
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">
            <Printer size={14} />
            <span>In</span>
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
