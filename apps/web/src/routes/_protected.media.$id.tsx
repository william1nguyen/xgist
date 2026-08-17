import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
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
				<p className="text-muted-foreground">Media not found.</p>
				<Link to="/" className="text-primary text-sm hover:underline">
					Back to dashboard
				</Link>
			</div>
		);
	}

	const tabs = [
		{
			id: "summary",
			label: "Summary",
			show: (content?.summaries.length ?? 0) > 0,
		},
		{
			id: "keywords",
			label: "Keywords",
			show: (content?.keywords.length ?? 0) > 0,
		},
		{
			id: "keypoints",
			label: "Keypoints",
			show: (content?.keypoints.length ?? 0) > 0,
		},
		{ id: "notes", label: "Notes", show: (content?.notes.length ?? 0) > 0 },
		{
			id: "audio",
			label: "Audio",
			show: (content?.summaryAudios.length ?? 0) > 0,
		},
	].filter((t) => t.show);

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
			</div>

			{percent != null && status !== "COMPLETED" && status !== "FAILED" && (
				<div className="flex items-center gap-3">
					<Progress value={percent} className="max-w-xs" />
					<span className="text-muted-foreground text-xs">
						{liveProgress?.completedSteps}/{liveProgress?.totalSteps} steps
					</span>
				</div>
			)}

			{media.playbackUrl ? (
				<MediaPlayer
					src={media.playbackUrl}
					mediaType={media.mediaType}
					seekToMs={seekToMs}
					onTimeUpdateMs={setCurrentTimeMs}
				/>
			) : (
				<div className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted text-muted-foreground text-sm">
					Playback isn't available yet.
				</div>
			)}

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div className="flex flex-col rounded-xl border border-border bg-card">
					<div className="border-border border-b px-4 py-2.5">
						<p className="font-medium text-sm">Transcript</p>
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
									? "Generated content will appear here as it's ready."
									: "No generated content available."}
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
