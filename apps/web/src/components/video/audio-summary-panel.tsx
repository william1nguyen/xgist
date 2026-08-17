import { Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ContentDetailQuery } from "@/graphql/generated/graphql";
import { formatDuration } from "@/lib/format";

type SummaryAudio =
	ContentDetailQuery["contentDetail"]["summaryAudios"][number];

export function AudioSummaryPanel({ audios }: { audios: SummaryAudio[] }) {
	if (audios.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No audio summary available yet.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{audios.map((audio) => (
				<div
					key={audio.summaryType}
					className="flex flex-col gap-3 rounded-lg border border-border p-3"
				>
					<div className="flex items-center gap-3">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
							<Volume2 className="size-4" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-medium text-sm">{audio.voice} voice</p>
							<p className="text-muted-foreground text-xs">
								{formatDuration(audio.durationMs)} · {audio.mimeType}
							</p>
						</div>
						<Badge
							variant={audio.status === "READY" ? "success" : "destructive"}
						>
							{audio.status === "READY" ? "Ready" : "Failed"}
						</Badge>
					</div>
					{audio.url ? (
						<audio controls preload="none" className="w-full" src={audio.url}>
							<track kind="captions" />
						</audio>
					) : (
						<p className="text-muted-foreground text-xs">
							{audio.status === "READY"
								? "Playback URL isn't available right now."
								: "Generation failed for this audio summary."}
						</p>
					)}
				</div>
			))}
		</div>
	);
}
