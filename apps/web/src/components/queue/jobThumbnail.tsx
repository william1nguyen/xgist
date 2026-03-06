import type { VideoStatus } from "@repo/types";
import { Film, Loader2, Music } from "lucide-react";
import { useState } from "react";

type JobThumbnailProps = {
	mediaUrl: string;
	mediaType: "video" | "audio";
	status: VideoStatus;
	title: string;
};

const STATUS_BADGE: Record<VideoStatus, { label: string; className: string }> =
	{
		pending: { label: "Waiting", className: "bg-zinc-700 text-zinc-300" },
		processing: {
			label: "Processing",
			className: "bg-blue-600/90 text-white animate-pulse",
		},
		completed: { label: "Done", className: "bg-green-600/90 text-white" },
		failed: { label: "Failed", className: "bg-red-600/90 text-white" },
	};

export default function JobThumbnail({
	mediaUrl,
	mediaType,
	status,
	title,
}: JobThumbnailProps) {
	const [hovered, setHovered] = useState(false);
	const badge = STATUS_BADGE[status];

	return (
		<div
			role="img"
			aria-label={title}
			className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-zinc-900"
			onMouseEnter={() => setHovered(true)}
		>
			{mediaType === "video" ? (
				hovered ? (
					<video
						src={mediaUrl}
						className="h-full w-full object-cover"
						preload="metadata"
						muted
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center">
						<Film size={32} className="text-zinc-600" />
					</div>
				)
			) : (
				<div className="flex h-full w-full items-center justify-center">
					<Music size={32} className="text-zinc-600" />
				</div>
			)}

			{status === "processing" && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/40">
					<Loader2 size={28} className="animate-spin text-blue-400" />
				</div>
			)}

			<span
				className={`absolute top-2 right-2 rounded-full px-2 py-0.5 font-medium text-xs ${badge.className}`}
			>
				{badge.label}
			</span>

			{mediaType === "video" && (
				<div className="absolute top-2 left-2 rounded-full bg-black/50 p-1">
					<Film size={12} className="text-white" />
				</div>
			)}
		</div>
	);
}
