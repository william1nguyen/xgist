import { useEffect, useRef } from "react";
import type { MediaType } from "@/graphql/generated/graphql";

type MediaPlayerProps = {
	src: string;
	mediaType: MediaType;
	thumbnailUrl?: string | null;
	seekToMs: number | null;
	onTimeUpdateMs: (ms: number) => void;
};

export function MediaPlayer({
	src,
	mediaType,
	thumbnailUrl,
	seekToMs,
	onTimeUpdateMs,
}: MediaPlayerProps) {
	const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);

	useEffect(() => {
		if (seekToMs == null || !ref.current) return;
		ref.current.currentTime = seekToMs / 1000;
		ref.current.play().catch(() => {});
	}, [seekToMs]);

	const onTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) =>
		onTimeUpdateMs(e.currentTarget.currentTime * 1000);

	if (mediaType === "AUDIO") {
		return (
			<div
				className="relative flex aspect-video w-full items-end justify-center overflow-hidden rounded-xl bg-muted bg-center bg-cover"
				style={
					thumbnailUrl ? { backgroundImage: `url(${thumbnailUrl})` } : undefined
				}
			>
				{/* biome-ignore lint/a11y/useMediaCaption: transcript panel serves this role; no separate track source exists. */}
				<audio
					ref={ref}
					src={src}
					controls
					preload="none"
					className="w-full bg-background/90 backdrop-blur"
					onTimeUpdate={onTimeUpdate}
				/>
			</div>
		);
	}

	return (
		// A fixed aspect-ratio frame keeps the player's footprint stable
		// regardless of the source's actual dimensions — without this the
		// element has no height until metadata loads (preload="none" defers
		// that), so the layout jumps once playback becomes possible.
		<div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
			{/* biome-ignore lint/a11y/useMediaCaption: transcript panel serves this role; no separate track source exists. */}
			<video
				ref={ref}
				src={src}
				poster={thumbnailUrl ?? undefined}
				controls
				preload="none"
				className="size-full object-contain"
				onTimeUpdate={onTimeUpdate}
			/>
		</div>
	);
}
