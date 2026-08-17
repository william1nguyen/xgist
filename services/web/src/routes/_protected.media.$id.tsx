import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { MediaActionsMenu } from "@/components/media/media-actions-menu";
import { StatusBadge } from "@/components/media/status-badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioSummaryPanel } from "@/components/video/audio-summary-panel";
import { KeypointsPanel } from "@/components/video/keypoints-panel";
import { KeywordsPanel } from "@/components/video/keywords-panel";
import { MediaPlayer } from "@/components/video/media-player";
import { NotesPanel } from "@/components/video/notes-panel";
import { SummaryPanel } from "@/components/video/summary-panel";
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
			<div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-6 py-8 md:px-10">
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

	const tabs = [
		{
			id: "summary",
			label: t("mediaDetail.tabSummary"),
			show: (content?.summaries.length ?? 0) > 0,
		},
		{
			id: "keywords",
			label: t("mediaDetail.tabKeywords"),
			show: (content?.keywords.length ?? 0) > 0,
		},
		{
			id: "keypoints",
			label: t("mediaDetail.tabKeypoints"),
			show: (content?.keypoints.length ?? 0) > 0,
		},
		{
			id: "notes",
			label: t("mediaDetail.tabNotes"),
			show: (content?.notes.length ?? 0) > 0,
		},
		{
			id: "audio",
			label: t("mediaDetail.tabAudio"),
			show: (content?.summaryAudios.length ?? 0) > 0,
		},
	].filter((tab) => tab.show);

	const percent =
		liveProgress && liveProgress.totalSteps > 0
			? Math.round(
					(liveProgress.completedSteps / liveProgress.totalSteps) * 100,
				)
			: null;

	return (
		<div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-6 py-8 md:px-10">
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

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div className="flex flex-col rounded-xl border border-border bg-card">
					<div className="border-border border-b px-4 py-2.5">
						<p className="font-medium text-sm">{t("mediaDetail.transcript")}</p>
					</div>
					<div className="h-[50vh] overflow-y-auto p-3">
						<TranscriptPanel
							segments={segments}
							currentTimeMs={currentTimeMs}
							citedIndices={citedIndices}
							onSeek={setSeekToMs}
						/>
					</div>
				</div>

				<div className="flex flex-col rounded-xl border border-border bg-card">
					{tabs.length > 0 ? (
						<Tabs defaultValue={tabs[0].id} className="flex flex-1 flex-col">
							<TabsList className="px-4 pt-1">
								{tabs.map((tab) => (
									<TabsTrigger key={tab.id} value={tab.id}>
										{tab.label}
									</TabsTrigger>
								))}
							</TabsList>
							<div className="h-[50vh] overflow-y-auto p-4">
								<TabsContent value="summary">
									<SummaryPanel
										summaries={content?.summaries ?? []}
										onHoverIndices={(indices) =>
											setCitedIndices(new Set(indices))
										}
										onSeekToIndex={seekToSegmentIndex}
									/>
								</TabsContent>
								<TabsContent value="keywords">
									<KeywordsPanel keywords={content?.keywords ?? []} />
								</TabsContent>
								<TabsContent value="keypoints">
									<KeypointsPanel
										keypoints={content?.keypoints ?? []}
										onSeekToIndex={seekToSegmentIndex}
									/>
								</TabsContent>
								<TabsContent value="notes">
									<NotesPanel
										notes={content?.notes ?? []}
										mediaTitle={media.title}
									/>
								</TabsContent>
								<TabsContent value="audio">
									<AudioSummaryPanel audios={content?.summaryAudios ?? []} />
								</TabsContent>
							</div>
						</Tabs>
					) : (
						<div className="flex h-[50vh] items-center justify-center p-4">
							<p className="text-muted-foreground text-sm">
								{status === "PROCESSING" || status === "PENDING_UPLOAD"
									? t("mediaDetail.contentPending")
									: t("mediaDetail.contentNone")}
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
