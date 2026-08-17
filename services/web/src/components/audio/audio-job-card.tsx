import { AlertCircle, Loader2, Music, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { AudioJobsQuery } from "@/graphql/generated/graphql";
import { relativeTime } from "@/lib/format";

type AudioJobItem = AudioJobsQuery["audioJobs"]["items"][number];

const STATUS_VARIANT = {
	generating: "default",
	completed: "success",
	failed: "destructive",
} as const;

export function AudioJobCard({
	job,
	onOpen,
}: {
	job: AudioJobItem;
	onOpen: (jobId: string) => void;
}) {
	const { t } = useTranslation();

	return (
		<button
			type="button"
			onClick={() => onOpen(job.id)}
			className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/50"
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2">
					<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
						{job.status === "completed" ? (
							<Play className="size-4" />
						) : (
							<Music className="size-4" />
						)}
					</div>
					<p className="truncate text-sm" title={job.inputText}>
						{job.inputText}
					</p>
				</div>
				<Badge
					variant={
						STATUS_VARIANT[job.status as keyof typeof STATUS_VARIANT] ??
						"secondary"
					}
					className="shrink-0"
				>
					{job.status === "generating" && (
						<Loader2 className="size-3 animate-spin" />
					)}
					{t(`audio.status.${job.status}`)}
				</Badge>
			</div>

			{job.status === "failed" && (
				<p className="flex items-center gap-1.5 text-destructive text-xs">
					<AlertCircle className="size-3.5 shrink-0" />
					{t("audio.generationFailed")}
				</p>
			)}

			<p className="text-muted-foreground text-xs">
				{relativeTime(job.createdAt)}
			</p>
		</button>
	);
}
