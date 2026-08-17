import { Locate } from "lucide-react";
import { useRef } from "react";
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

export function TranscriptPanel({
	segments,
	currentTimeMs,
	citedIndices,
	onSeek,
}: TranscriptPanelProps) {
	const { t } = useTranslation();
	const activeRef = useRef<HTMLButtonElement | null>(null);

	if (segments.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">{t("video.noTranscript")}</p>
		);
	}

	const hasActive = segments.some(
		(segment) =>
			currentTimeMs >= segment.startMs && currentTimeMs < segment.endMs,
	);

	return (
		<div className="flex flex-col gap-1">
			{hasActive && (
				<button
					type="button"
					onClick={() =>
						activeRef.current?.scrollIntoView({
							behavior: "smooth",
							block: "center",
						})
					}
					className="sticky top-0 z-10 mb-1 flex w-fit items-center gap-1.5 self-center rounded-full border border-border bg-background/95 px-3 py-1 text-xs shadow-sm backdrop-blur transition-colors hover:bg-accent"
				>
					<Locate className="size-3" />
					{t("video.jumpToCurrent")}
				</button>
			)}
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
}
