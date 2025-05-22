import React, { useState, useRef, useEffect } from "react";

export interface KeyPoint {
  text: string;
  supporting_sentences: Array<{
    text: string;
    time: string;
  }>;
}

interface KeyPointsWithTranscriptProps {
  keyPoints: KeyPoint[];
  transcript: {
    text: string;
    chunks: Array<{
      time: number;
      text: string;
    }>;
  };
}

export const KeyPointsWithTranscript: React.FC<
  KeyPointsWithTranscriptProps
> = ({ keyPoints, transcript }) => {
  const [selectedKeyPoint, setSelectedKeyPoint] = useState<number | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const findChunkIndexByTime = (time: string) => {
    const timeValue = parseFloat(time);
    return transcript.chunks.findIndex(
      (chunk) => Math.abs(chunk.time - timeValue) < 0.5
    );
  };

  const shouldHighlightChunk = (chunkTime: number) => {
    if (selectedKeyPoint === null) return false;

    const keyPoint = keyPoints[selectedKeyPoint];
    return keyPoint.supporting_sentences.some((sentence) => {
      const sentenceTime = parseFloat(sentence.time);
      return Math.abs(chunkTime - sentenceTime) < 0.5;
    });
  };

  const handleKeyPointClick = (index: number) => {
    if (selectedKeyPoint === index) {
      setSelectedKeyPoint(null);
    } else {
      setSelectedKeyPoint(index);
    }
  };

  useEffect(() => {
    if (selectedKeyPoint !== null && transcriptRef.current) {
      const keyPoint = keyPoints[selectedKeyPoint];
      if (keyPoint.supporting_sentences.length > 0) {
        const firstSentenceTime = keyPoint.supporting_sentences[0].time;
        const chunkIndex = findChunkIndexByTime(firstSentenceTime);

        if (chunkIndex !== -1) {
          const chunkElement = document.getElementById(`chunk-${chunkIndex}`);
          if (chunkElement) {
            chunkElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        }
      }
    }
  }, [selectedKeyPoint, keyPoints]);

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-1/3">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <h3 className="text-lg font-bold mb-4 text-black border-b pb-2">
            Key Points
          </h3>
          <div className="space-y-3">
            {keyPoints.map((keyPoint, index) => (
              <div
                key={index}
                className={`p-3 rounded-md cursor-pointer transition-colors ${
                  selectedKeyPoint === index
                    ? "bg-blue-100 border-l-4 border-blue-500"
                    : "bg-gray-50 hover:bg-gray-100 border-l-4 border-transparent"
                }`}
                onClick={() => handleKeyPointClick(index)}
              >
                <p className="font-medium text-black">{keyPoint.text}</p>
                <div className="mt-2 text-xs text-gray-600">
                  {keyPoint.supporting_sentences.map((sentence, idx) => (
                    <p key={idx} className="mt-1 italic">
                      "{sentence.text}"{" "}
                      <span className="font-mono">{sentence.time}s</span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full md:w-2/3">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <h3 className="text-lg font-bold mb-4 text-black border-b pb-2">
            Transcript
          </h3>
          <div
            ref={transcriptRef}
            className="space-y-2 max-h-[60vh] overflow-y-auto p-2"
          >
            {transcript.chunks.map((chunk, index) => (
              <div
                id={`chunk-${index}`}
                key={index}
                className={`p-2 rounded text-sm ${
                  shouldHighlightChunk(chunk.time)
                    ? "bg-yellow-100 border-l-4 border-yellow-500"
                    : "hover:bg-gray-50"
                }`}
              >
                <span className="font-mono text-xs text-gray-500 mr-2">
                  {chunk.time.toFixed(2)}s
                </span>
                <span className="text-black">{chunk.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
