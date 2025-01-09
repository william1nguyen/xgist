import { Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Video } from "@/types/video";

interface VideoCardProps {
  video: Video;
  compact?: boolean;
}

export default function VideoCard({ video, compact = false }: VideoCardProps) {
  return (
    <Link href={`/videos/${video.id}`}>
      <div className="bg-white rounded-lg overflow-hidden shadow hover:shadow-md transition-shadow">
        <div className="relative pt-[56.25%] bg-gray-100">
          <Image
            src={video.thumbnailUrl || ""}
            alt={video.title}
            fill
            className="object-cover"
          />
        </div>

        <div className={`p-4 ${compact ? "p-2" : "p-4"}`}>
          <h3
            className={`font-semibold ${
              compact ? "text-base" : "text-lg"
            } mb-2`}
          >
            {video.title}
          </h3>
          {!compact && (
            <p className="text-sm text-gray-600 mb-3">{video.description}</p>
          )}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span>{video.likes}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span>{video.comments}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
