import type { MediaType } from "@repo/types";
import { useEffect, useRef } from "react";

type MediaPlayerProps = {
	src: string;
	mediaType: MediaType;
	onTimeUpdate: (time: number) => void;
	seekTo: number | null;
};

export default function MediaPlayer({
	src,
	mediaType,
	onTimeUpdate,
	seekTo,
}: MediaPlayerProps) {
	const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);

	useEffect(() => {
		if (seekTo !== null && ref.current) {
			ref.current.currentTime = seekTo;
		}
	}, [seekTo]);

	const handleTimeUpdate = () => {
		if (ref.current) onTimeUpdate(ref.current.currentTime);
	};

	if (mediaType === "video") {
		return (
			<video
				ref={ref}
				src={src}
				controls
				onTimeUpdate={handleTimeUpdate}
				className="max-h-[40vh] w-full rounded-xl bg-black"
			/>
		);
	}

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<audio
				ref={ref}
				src={src}
				controls
				onTimeUpdate={handleTimeUpdate}
				className="w-full"
			/>
		</div>
	);
}
