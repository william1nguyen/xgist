import React from "react";
import { formatTime } from "../../utils/mediaEdit";

interface MediaInfoSectionProps {
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  category: string;
  description: string;
}

export const MediaInfoSection: React.FC<MediaInfoSectionProps> = ({
  videoRef,
  category,
  description,
}) => {
  const [duration, setDuration] = React.useState(0);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateDuration = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    video.addEventListener("loadedmetadata", updateDuration);

    updateDuration();

    return () => {
      video.removeEventListener("loadedmetadata", updateDuration);
    };
  }, [videoRef]);

  return (
    <div className="mt-4 text-sm text-black">
      <div className="flex justify-between mb-2">
        <span>Duration: {formatTime(duration)}</span>
        <span>Category: {category}</span>
      </div>
      <p className="text-black line-clamp-3">{description}</p>
    </div>
  );
};
