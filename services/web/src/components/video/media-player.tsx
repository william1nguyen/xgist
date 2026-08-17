import { Maximize, Minimize } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation();
	const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);

	useEffect(() => {
		if (seekToMs == null || !ref.current) return;
		ref.current.currentTime = seekToMs / 1000;
		ref.current.play().catch(() => {});
	}, [seekToMs]);

	useEffect(() => {
		function handleChange() {
			setIsFullscreen(document.fullscreenElement === containerRef.current);
		}
		document.addEventListener("fullscreenchange", handleChange);
		return () => document.removeEventListener("fullscreenchange", handleChange);
	}, []);

	function toggleFullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen();
		} else {
			containerRef.current?.requestFullscreen();
		}
	}

	const onTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) =>
		onTimeUpdateMs(e.currentTarget.currentTime * 1000);

	const fullscreenButton = (
		<button
			type="button"
			onClick={toggleFullscreen}
			aria-label={
				isFullscreen
					? t("mediaDetail.exitFullscreen")
					: t("mediaDetail.fullscreen")
			}
			className="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-md bg-black/50 text-white transition-colors hover:bg-black/70"
		>
			{isFullscreen ? (
				<Minimize className="size-4" />
			) : (
				<Maximize className="size-4" />
			)}
		</button>
	);

	if (mediaType === "AUDIO") {
		return (
			<div
				ref={containerRef}
				className="relative flex aspect-video w-full items-end justify-center overflow-hidden rounded-xl bg-muted bg-center bg-cover"
				style={
					thumbnailUrl ? { backgroundImage: `url(${thumbnailUrl})` } : undefined
				}
			>
				{fullscreenButton}
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
		<div
			ref={containerRef}
			className="relative aspect-video w-full overflow-hidden rounded-xl bg-black"
		>
			{fullscreenButton}
			{/* biome-ignore lint/a11y/useMediaCaption: transcript panel serves this role; no separate track source exists. */}
			<video
				ref={ref}
				src={src}
				controls
				preload="metadata"
				className="size-full object-contain"
				onTimeUpdate={onTimeUpdate}
			/>
		</div>
	);
}
