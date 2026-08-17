import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { MediaActionsMenu } from "@/components/media/media-actions-menu";
import { RecommendedMedia } from "@/components/media/recommended-media";
import { StatusBadge } from "@/components/media/status-badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaDescription } from "@/components/video/media-description";
import { MediaPlayer } from "@/components/video/media-player";
import { TranscriptPanel } from "@/components/video/transcript-panel";
import {
	useContentDetailQuery,
	useMediaDetailQuery,
} from "@/graphql/generated/graphql";
import { useMediaProgress } from "@/hooks/useMediaProgress";
import { TERMINAL_MEDIA_STATUSES } from "@/lib/constants";

export default function MediaDetailPage() {
	const { t } = useTranslation();
	const { id: rawId } = useParams<{ id: string }>();
	const id = rawId ?? "";
	const navigate = useNavigate();

	const [currentTimeMs, setCurrentTimeMs] = useState(0);
	const [seekToMs, setSeekToMs] = useState<number | null>(null);
	const [citedIndices, setCitedIndices] = useState<Set<number>>(new Set());

	const { data: mediaData, loading: mediaLoading } = useMediaDetailQuery({
		variables: { id },
		skip: !id,
	});
	const { data: contentData } = useContentDetailQuery({
		variables: { mediaId: id },
		skip: !id,
	});

	const media = mediaData?.mediaDetail;
	const content = contentData?.contentDetail;
	const segments = content?.transcript?.segments ?? [];

	const trackedIds = useMemo(
		() => (media && !TERMINAL_MEDIA_STATUSES.has(media.status) ? [id] : []),
		[media, id],
	);
	const progress = useMediaProgress(trackedIds, {
		onAuthError: () => navigate("/login", { replace: true }),
	});
	const liveProgress = progress.get(id);
	const status = liveProgress?.status ?? media?.status;

	function seekToSegmentIndex(index: number) {
		const segment = segments.find((s) => s.segmentIndex === index);
		if (segment) setSeekToMs(segment.startMs);
	}

	if (mediaLoading && !media) {
		return (
			<div className="flex flex-col gap-5 px-4 py-6 md:px-6 lg:px-8">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="aspect-video w-full" />
			</div>
		);
	}

	if (!media) {
		return (
			<div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
				<p className="text-muted-foreground">
					{t("mediaDetail.mediaNotFound")}
				</p>
				<Link to="/" className="text-primary text-sm hover:underline">
					{t("mediaDetail.backToDashboard")}
				</Link>
			</div>
		);
	}

	const percent =
		liveProgress && liveProgress.totalSteps > 0
			? Math.round(
					(liveProgress.completedSteps / liveProgress.totalSteps) * 100,
				)
			: null;

	return (
		<div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
			<div className="flex items-center gap-3">
				<Link
					to="/"
					className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				>
					<ArrowLeft className="size-4" />
				</Link>
				<h1 className="truncate font-semibold text-xl tracking-tight">
					{media.title}
				</h1>
				{status && <StatusBadge status={status} />}
				<MediaActionsMenu
					mediaId={media.id}
					title={media.title}
					description={media.description}
					status={status ?? media.status}
					className="ml-auto shrink-0"
				/>
			</div>

			{percent != null && status !== "COMPLETED" && status !== "FAILED" && (
				<div className="flex items-center gap-3">
					<Progress value={percent} className="max-w-xs" />
					<span className="text-muted-foreground text-xs">
						{t("mediaDetail.stepsCount", {
							completed: liveProgress?.completedSteps,
							total: liveProgress?.totalSteps,
						})}
					</span>
				</div>
			)}

			<div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
				<div className="flex min-w-0 flex-col gap-4">
					{media.playbackUrl ? (
						<MediaPlayer
							src={media.playbackUrl}
							mediaType={media.mediaType}
							thumbnailUrl={media.thumbnailUrl}
							seekToMs={seekToMs}
							onTimeUpdateMs={setCurrentTimeMs}
						/>
					) : (
						<div
							className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted bg-center bg-cover text-muted-foreground text-sm"
							style={
								media.thumbnailUrl
									? { backgroundImage: `url(${media.thumbnailUrl})` }
									: undefined
							}
						>
							{!media.thumbnailUrl && t("mediaDetail.playbackUnavailable")}
						</div>
					)}
					<MediaDescription
						mediaId={media.id}
						mediaTitle={media.title}
						createdAt={media.createdAt}
						description={media.description}
						summaries={content?.summaries ?? []}
						keywords={content?.keywords ?? []}
						keypoints={content?.keypoints ?? []}
						notes={content?.notes ?? []}
						hasAudio={(content?.summaryAudios.length ?? 0) > 0}
						audioGenerating={
							status === "PROCESSING" && (content?.summaries.length ?? 0) > 0
						}
						onHoverIndices={(indices) => setCitedIndices(new Set(indices))}
						onSeekToIndex={seekToSegmentIndex}
					/>
				</div>

				<div className="flex flex-col self-stretch overflow-hidden rounded-xl border border-border bg-card xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)]">
					<div className="shrink-0 border-border border-b px-4 py-2.5">
						<p className="font-medium text-sm">{t("mediaDetail.transcript")}</p>
					</div>
					<div className="flex-1 overflow-y-auto p-3">
						{segments.length > 0 ? (
							<TranscriptPanel
								segments={segments}
								currentTimeMs={currentTimeMs}
								citedIndices={citedIndices}
								onSeek={setSeekToMs}
							/>
						) : (
							<div className="flex min-h-[260px] items-center justify-center">
								<p className="text-center text-muted-foreground text-sm">
									{status === "PROCESSING" || status === "PENDING_UPLOAD"
										? t("mediaDetail.contentPending")
										: t("mediaDetail.contentNone")}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>

			<RecommendedMedia excludeId={media.id} />
		</div>
	);
}
