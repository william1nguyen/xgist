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
	view: "grid" | "list";
	onOpen: (media: MediaItem) => void;
};

export function MediaCard({ media, progress, view, onOpen }: MediaCardProps) {
	const isCompleted = media.status === "COMPLETED";
	const isFailed = media.status === "FAILED";
	const percent =
		progress && progress.totalSteps > 0
			? Math.round((progress.completedSteps / progress.totalSteps) * 100)
			: null;

	const thumbnail = (
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
					<FileAudio className="size-6" />
				</div>
			)}
		</div>
	);

	if (view === "list") {
		return (
			<div
				className={cn(
					"flex w-full items-center gap-2 rounded-xl border bg-card pr-2 pl-4 transition-colors",
					isCompleted ? "hover:border-primary/50 hover:bg-muted/30" : "",
					isFailed ? "border-destructive/30 bg-destructive/5" : "border-border",
				)}
			>
				<button
					type="button"
					onClick={() => onOpen(media)}
					disabled={!isCompleted}
					className={cn(
						"flex min-w-0 flex-1 items-center gap-4 py-3 text-left",
						isCompleted ? "cursor-pointer" : "cursor-default",
					)}
				>
					<div className="h-10 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
						{media.thumbnailUrl ? (
							<img
								src={media.thumbnailUrl}
								alt=""
								loading="lazy"
								className="size-full object-cover"
							/>
						) : (
							<div className="flex size-full items-center justify-center text-muted-foreground">
								<FileAudio className="size-4" />
							</div>
						)}
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate font-medium text-sm">{media.title}</p>
						<p className="text-muted-foreground text-xs">
							{relativeTime(media.createdAt)}
						</p>
					</div>
					{percent != null && (
						<span className="text-muted-foreground text-xs">{percent}%</span>
					)}
					<StatusBadge status={media.status} />
				</button>
				<MediaActionsMenu
					mediaId={media.id}
					title={media.title}
					description={media.description}
					status={media.status}
				/>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all",
				isCompleted
					? "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
					: "",
				isFailed ? "border-destructive/30 bg-destructive/5" : "border-border",
			)}
		>
			<button
				type="button"
				onClick={() => onOpen(media)}
				disabled={!isCompleted}
				className={cn(
					"flex flex-col text-left",
					isCompleted ? "cursor-pointer" : "cursor-default",
				)}
			>
				{thumbnail}
				<div className="flex flex-col gap-2 p-3">
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
