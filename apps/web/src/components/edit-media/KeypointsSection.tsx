import React from "react";
import { List, X } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Keypoint } from "../../types/media";

interface KeypointsSectionProps {
  keypoints: Keypoint[];
  keypointInput: string;
  onKeypointInputChange: (value: string) => void;
  onAddKeypoint: () => void;
  onRemoveKeypoint: (keypoint: string) => void;
}

export const KeypointsSection: React.FC<KeypointsSectionProps> = ({
  keypoints,
  keypointInput,
  onKeypointInputChange,
  onAddKeypoint,
  onRemoveKeypoint,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddKeypoint();
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-black mb-2 flex items-center">
        <List size={18} className="text-indigo-500 mr-2" />
        Key Points
      </h3>
      <p className="text-black mb-4 text-sm">
        Highlight important takeaways from the media content
      </p>

      <div className="flex mb-3">
        <Input
          type="text"
          value={keypointInput}
          onChange={(e) => onKeypointInputChange(e.target.value)}
          placeholder="Add a key point"
          className="flex-grow"
          onKeyDown={handleKeyDown}
        />
        <Button onClick={onAddKeypoint} variant="outline" className="ml-2">
          Add
        </Button>
      </div>

      <ul className="list-disc pl-5 space-y-2">
        {keypoints.map((keypoint, index) => (
          <li key={index} className="text-black flex items-start">
            <span className="flex-grow">{keypoint.content}</span>
            <button
              onClick={() => onRemoveKeypoint(keypoint.content)}
              className="ml-2 text-black hover:text-gray-600 flex-shrink-0"
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
