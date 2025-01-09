import { Video } from "@/types/video";

interface VideoPlayerProps {
  video: Video;
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  return (
    <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden">
      <video
        className="absolute inset-0 w-full h-full"
        controls
        poster={video.thumbnailUrl || ""}
        src={video.url}
      />
    </div>
  );
}
