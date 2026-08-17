import { FileAudio } from "lucide-react";
import { MediaActionsMenu } from "@/components/media/media-actions-menu";
import { StatusBadge } from "@/components/media/status-badge";
import { Progress } from "@/components/ui/progress";
import type {
	MediaListQuery,
	MediaProgress,
} from "@/graphql/generated/graphql";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type MediaItem = MediaListQuery["mediaList"]["items"][number];

type MediaCardProps = {
	media: MediaItem;
	progress?: Pick<MediaProgress, "completedSteps" | "totalSteps"> | null;
	onOpen: (media: MediaItem) => void;
};

export function MediaCard({ media, progress, onOpen }: MediaCardProps) {
	const isFailed = media.status === "FAILED";
	// Processing (or failed) media already has real content worth viewing —
	// title, thumbnail, whatever transcript/summary/audio has landed so
	// far — so it stays openable the whole time, not just once COMPLETED.
	// Only PENDING_UPLOAD has nothing to show yet (no confirmed object).
	const isOpenable = media.status !== "PENDING_UPLOAD";
	const percent =
		progress && progress.totalSteps > 0
			? Math.round((progress.completedSteps / progress.totalSteps) * 100)
			: null;

	return (
		<div
			className={cn(
				"group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all",
				isOpenable
					? "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
					: "",
				isFailed ? "border-destructive/30 bg-destructive/5" : "border-border",
			)}
		>
			<button
				type="button"
				onClick={() => onOpen(media)}
				disabled={!isOpenable}
				className={cn(
					"flex flex-col text-left",
					isOpenable ? "cursor-pointer" : "cursor-default",
				)}
			>
				<div className="relative aspect-video w-full shrink-0 overflow-hidden bg-muted">
					{media.thumbnailUrl ? (
						<img
							src={media.thumbnailUrl}
							alt=""
							loading="lazy"
							className="size-full object-cover"
						/>
					) : (
						<div className="flex size-full items-center justify-center text-muted-foreground">
							<FileAudio className="size-8" />
						</div>
					)}
				</div>
				<div className="flex flex-col gap-2 p-4">
					<p className="truncate pr-6 font-medium text-sm" title={media.title}>
						{media.title}
					</p>
					<div className="flex items-center justify-between">
						<StatusBadge status={media.status} />
						<span className="text-muted-foreground text-xs">
							{relativeTime(media.createdAt)}
						</span>
					</div>
					{percent != null && <Progress value={percent} />}
				</div>
			</button>
			<MediaActionsMenu
				mediaId={media.id}
				title={media.title}
				description={media.description}
				status={media.status}
				className="absolute top-1.5 right-1.5 bg-background/80 backdrop-blur-sm hover:bg-background"
			/>
		</div>
	);
}
