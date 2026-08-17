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
