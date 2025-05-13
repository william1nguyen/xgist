import React, { useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { MediaPlayerControlProps } from "../../types/media";

interface MediaPlayerProps extends MediaPlayerControlProps {
  url: string;
  thumbnail: string;
  onVideoRef: (ref: HTMLVideoElement | null) => void;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  url,
  thumbnail,
  isPlaying,
  isMuted,
  onTogglePlay,
  onToggleMute,
  onFullscreen,
  onVideoRef,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleRef = (ref: HTMLVideoElement | null) => {
    onVideoRef(ref);
    (videoRef as any).current = ref;
  };

  return (
    <div className="relative bg-black rounded-md overflow-hidden">
      <video
        ref={handleRef}
        className="w-full h-auto"
        src={url}
        poster={thumbnail}
        muted={isMuted}
      >
        Your browser does not support the video tag.
      </video>
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 px-3 py-2 flex items-center justify-between">
        <button
          className="text-white hover:text-indigo-300"
          onClick={onTogglePlay}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          className="text-white hover:text-indigo-300"
          onClick={onToggleMute}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <button
          className="text-white hover:text-indigo-300"
          onClick={onFullscreen}
        >
          <Maximize size={20} />
        </button>
      </div>
    </div>
  );
};
