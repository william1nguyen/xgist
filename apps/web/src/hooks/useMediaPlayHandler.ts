import { useRef } from "react";
import { MediaEditState } from "../types/media";

export const useMediaPlayerHandlers = (
  state: MediaEditState,
  updateState: (updates: Partial<MediaEditState>) => void,
  updateMediaData: (updates: any) => void
) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleVideoRef = (ref: HTMLVideoElement | null) => {
    videoRef.current = ref;

    if (ref) {
      ref.addEventListener("play", () => {
        updateState({ isPlaying: true });
      });

      ref.addEventListener("pause", () => {
        updateState({ isPlaying: false });
      });
    }
  };

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (!state.isPlaying) {
        videoRef.current.play().catch((error) => {
          console.error("Error playing video:", error);
        });
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !videoRef.current.muted;
      videoRef.current.muted = newMutedState;
      updateState({ isMuted: newMutedState });
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if ((videoRef.current as any).webkitRequestFullscreen) {
        (videoRef.current as any).webkitRequestFullscreen();
      } else if ((videoRef.current as any).mozRequestFullScreen) {
        (videoRef.current as any).mozRequestFullScreen();
      } else if ((videoRef.current as any).msRequestFullscreen) {
        (videoRef.current as any).msRequestFullscreen();
      }
    }
  };

  const handleSeekToTime = (timeInSeconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeInSeconds;
      if (!state.isPlaying) {
        videoRef.current.play().catch((error) => {
          console.error("Error playing video:", error);
        });
      }
    }
  };

  return {
    videoRef,
    handleVideoRef,
    handleTogglePlay,
    handleToggleMute,
    handleFullscreen,
    handleSeekToTime,
  };
};
