import { useEffect, useRef } from "react";
import type { MediaType } from "@/graphql/generated/graphql";

type MediaPlayerProps = {
	src: string;
	mediaType: MediaType;
	seekToMs: number | null;
	onTimeUpdateMs: (ms: number) => void;
};

export function MediaPlayer({
	src,
	mediaType,
	seekToMs,
	onTimeUpdateMs,
}: MediaPlayerProps) {
	const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);

	useEffect(() => {
		if (seekToMs == null || !ref.current) return;
		ref.current.currentTime = seekToMs / 1000;
		ref.current.play().catch(() => {});
	}, [seekToMs]);

	const commonProps = {
		ref,
		src,
		controls: true,
		preload: "none" as const,
		className: "w-full rounded-xl bg-black",
		onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) =>
			onTimeUpdateMs(e.currentTarget.currentTime * 1000),
	};

	if (mediaType === "AUDIO") {
		return <audio {...commonProps} className="w-full" />;
	}
	return <video {...commonProps} />;
}
