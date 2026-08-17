import { forwardRef, useImperativeHandle, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ContentDetailQuery } from "@/graphql/generated/graphql";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

type Segment = NonNullable<
	ContentDetailQuery["contentDetail"]["transcript"]
>["segments"][number];

type TranscriptPanelProps = {
	segments: Segment[];
	currentTimeMs: number;
	citedIndices: Set<number>;
	onSeek: (ms: number) => void;
};

// Exposes the active segment's DOM node so a caller (the "jump to
// current" button, which lives in the panel's own header rather than
// scrolling with the list) can scroll it into view within whichever
// element it owns as the transcript's scroll container — never via
// scrollIntoView, which walks up and can nudge ancestor scroll
// containers (the whole page) along with it.
export type TranscriptPanelHandle = {
	activeElement: HTMLButtonElement | null;
};

export const TranscriptPanel = forwardRef<
	TranscriptPanelHandle,
	TranscriptPanelProps
>(function TranscriptPanel(
	{ segments, currentTimeMs, citedIndices, onSeek },
	ref,
) {
	const { t } = useTranslation();
	const activeRef = useRef<HTMLButtonElement | null>(null);

	useImperativeHandle(ref, () => ({
		get activeElement() {
			return activeRef.current;
		},
	}));

	if (segments.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">{t("video.noTranscript")}</p>
		);
	}

	return (
		<div className="flex flex-col gap-1">
			{segments.map((segment) => {
				const isActive =
					currentTimeMs >= segment.startMs && currentTimeMs < segment.endMs;
				const isCited = citedIndices.has(segment.segmentIndex);
				return (
					<button
						key={segment.segmentIndex}
						ref={isActive ? activeRef : undefined}
						type="button"
						onClick={() => onSeek(segment.startMs)}
						className={cn(
							"flex gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
							isActive && "bg-primary/10",
							isCited && !isActive && "bg-amber-500/10",
							"hover:bg-accent",
						)}
					>
						<span className="shrink-0 font-mono text-muted-foreground text-xs">
							{formatDuration(segment.startMs)}
						</span>
						<span>
							{segment.speaker && (
								<span className="mr-1.5 font-medium text-primary">
									{segment.speaker}:
								</span>
							)}
							{segment.text}
						</span>
					</button>
				);
			})}
		</div>
	);
});
