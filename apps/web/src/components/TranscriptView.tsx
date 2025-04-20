import React, { useRef, useEffect, useState, ReactNode } from "react";
import { ChevronsDown } from "lucide-react";
import { Button } from "./ui/Button";
import { useTranslation } from "react-i18next";

export interface Chunk {
  time: number;
  text: string;
}

export interface Transcript {
  text: string;
  chunks: Chunk[];
}

interface TranscriptViewProps {
  title: ReactNode;
  transcript: Transcript;
  currentTime: number;
  onTimeClick: (time: number) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  highlightedTimestamps?: number[];
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  title,
  transcript,
  currentTime,
  onTimeClick,
  isLoading = false,
  emptyMessage = "Transcript not available",
  highlightedTimestamps = [],
}) => {
  const { t } = useTranslation(["summary"]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (transcript?.chunks) {
      itemsRef.current = Array(transcript.chunks.length)
        .fill(null)
        .map((_, i) => itemsRef.current[i] || null);
    }
  }, [transcript?.chunks?.length]);

  useEffect(() => {
    if (transcript?.chunks && transcript.chunks.length > 0) {
      let newActiveIndex = -1;
      for (let i = 0; i < transcript.chunks.length; i++) {
        const chunk = transcript.chunks[i];
        const nextChunk = transcript.chunks[i + 1];
        const chunkTime = chunk.time;
        const nextChunkTime = nextChunk ? nextChunk.time : Infinity;

        if (currentTime >= chunkTime && currentTime < nextChunkTime) {
          newActiveIndex = i;
          break;
        }
      }

      if (newActiveIndex !== currentIndex) {
        setCurrentIndex(newActiveIndex);
        highlightCurrentItem(newActiveIndex);
      }
    }
  }, [currentTime, transcript?.chunks, currentIndex]);

  const scrollToCurrentItem = (): void => {
    if (containerRef.current && currentIndex >= 0) {
      const activeElement = itemsRef.current[currentIndex];

      if (activeElement) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const elementRect = activeElement.getBoundingClientRect();

        const containerVisibleHeight = containerRect.height;
        const elementRelativeTop = elementRect.top - containerRect.top;
        const elementHeight = elementRect.height;

        const currentScrollTop = containerRef.current.scrollTop;
        const targetScrollTop =
          currentScrollTop +
          elementRelativeTop -
          containerVisibleHeight / 2 +
          elementHeight / 2;

        containerRef.current.scrollTo({
          top: targetScrollTop,
          behavior: "smooth",
        });
      }
    }
  };

  const highlightCurrentItem = (activeIndex: number): void => {
    if (containerRef.current) {
      itemsRef.current.forEach((item, index) => {
        if (item) {
          if (index === activeIndex) {
            item.classList.add("bg-blue-50", "border-l-4", "border-blue-500");
          } else {
            item.classList.remove(
              "bg-blue-50",
              "border-l-4",
              "border-blue-500"
            );
          }
        }
      });
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>

        <Button
          variant="outline"
          size="sm"
          onClick={scrollToCurrentItem}
          className="flex items-center text-xs px-2 py-1 h-8"
          type="button"
          disabled={!transcript?.chunks || transcript.chunks.length === 0}
        >
          <ChevronsDown size={14} className="mr-1" />
          {t("summary:transcript.jump_to_current", "Jump to current")}
        </Button>
      </div>

      <div
        ref={containerRef}
        className="overflow-y-auto custom-scrollbar pr-2 space-y-0.5"
        style={{ height: "500px" }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
            <p className="text-gray-600 text-sm">
              {t("summary:loading.transcript", "Loading transcript...")}
            </p>
          </div>
        ) : transcript?.chunks && transcript.chunks.length > 0 ? (
          transcript.chunks.map((chunk: Chunk, index: number) => {
            const isHighlighted = highlightedTimestamps.some((time) => {
              const match = Math.abs(time - chunk.time) < 0.5;
              if (match) {
                console.log(
                  `Highlighting chunk at ${chunk.time} because it matches ${time}`
                );
              }
              return match;
            });

            return (
              <div
                key={index}
                ref={(el) => {
                  itemsRef.current[index] = el;
                }}
                className={`transcript-item flex p-2 rounded relative group
                  ${isHighlighted ? "bg-yellow-100 border border-yellow-300" : ""}
                  ${index === currentIndex ? "bg-blue-50 border-l-4 border-blue-500" : ""}`}
              >
                <span className="text-xs text-gray-500 w-12 flex-shrink-0 font-mono mt-0.5">
                  {formatTime(chunk.time)}
                </span>
                <p className="text-sm text-gray-800">{chunk.text}</p>
                <button
                  className="ml-auto text-xs text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onTimeClick(chunk.time)}
                >
                  Play
                </button>
              </div>
            );
          })
        ) : (
          <div className="text-center p-4 text-gray-500">
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};
