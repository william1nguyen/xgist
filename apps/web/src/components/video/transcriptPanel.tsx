import type { TranscriptSegment } from "@repo/types";
import { useEffect, useRef } from "react";

type TranscriptPanelProps = {
	segments: TranscriptSegment[];
	currentTime: number;
	hoveredIndices: number[];
	onSeek: (time: number) => void;
};

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function isActive(segment: TranscriptSegment, currentTime: number): boolean {
	return currentTime >= segment.start && currentTime < segment.end;
}

export default function TranscriptPanel({
	segments,
	currentTime,
	hoveredIndices,
	onSeek,
}: TranscriptPanelProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const activeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (activeRef.current && containerRef.current) {
			activeRef.current.scrollIntoView({
				block: "nearest",
				behavior: "smooth",
			});
		}
	}, []);

	return (
		<div ref={containerRef} className="h-full space-y-0.5 overflow-y-auto pr-1">
			{segments.map((seg) => {
				const active = isActive(seg, currentTime);
				const glowing = hoveredIndices.includes(seg.index);

				return (
					<button
						key={seg.id}
						ref={active ? activeRef : undefined}
						type="button"
						onClick={() => onSeek(seg.start)}
						className={[
							"flex w-full gap-3 rounded-lg px-3 py-2 text-left transition-colors",
							active
								? "border-primary border-l-2 bg-primary/10 pl-2.5"
								: "hover:bg-muted/50",
							glowing ? "bg-amber-500/10 ring-1 ring-amber-500/30" : "",
						].join(" ")}
					>
						<span className="shrink-0 pt-0.5 font-mono text-muted-foreground text-xs">
							{formatTime(seg.start)}
						</span>
						<span className="text-sm leading-relaxed">{seg.text}</span>
					</button>
				);
			})}
		</div>
	);
}
