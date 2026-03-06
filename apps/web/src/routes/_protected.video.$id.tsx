import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { NavLink, useParams } from "react-router";
import AudioSummaryPlayer from "@/components/video/audioSummaryPlayer";
import GenerateOptionsDialog from "@/components/video/generateOptionsDialog";
import MediaPlayer from "@/components/video/mediaPlayer";
import NotesPanel from "@/components/video/notesPanel";
import SummaryPanel from "@/components/video/summaryPanel";
import TranscriptPanel from "@/components/video/transcriptPanel";
import { orpc } from "@/utils/orpc";

type Tab = "summary" | "notes" | "audio";

const STATUS_BADGE: Record<string, string> = {
	pending: "bg-zinc-500/20 text-zinc-400",
	processing: "bg-blue-500/20 text-blue-400",
	completed: "bg-green-500/20 text-green-400",
	failed: "bg-red-500/20 text-red-400",
};

const STATUS_LABEL: Record<string, string> = {
	pending: "Waiting",
	processing: "Processing",
	completed: "Done",
	failed: "Failed",
};

export default function VideoDetailPage() {
	const { id } = useParams<{ id: string }>();
	const [currentTime, setCurrentTime] = useState(0);
	const [seekTo, setSeekTo] = useState<number | null>(null);
	const [hoveredIndices, setHoveredIndices] = useState<number[]>([]);
	const [activeTab, setActiveTab] = useState<Tab>("summary");
	const [showGenerateDialog, setShowGenerateDialog] = useState(false);

	const _queryClient = useQueryClient();

	const { data, isLoading, isError } = useQuery({
		...orpc.video.getDetail.queryOptions({ input: { videoId: id ?? "" } }),
		refetchInterval: (query) => {
			const status = query.state.data?.video.status;
			return status === "pending" || status === "processing" ? 3000 : false;
		},
	});

	const { data: creditsData } = useQuery(
		orpc.credits.getBalance.queryOptions({ input: {} }),
	);

	if (isLoading) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
				<p className="text-muted-foreground">Video not found or not ready.</p>
				<NavLink to="/queue" className="text-primary text-sm hover:underline">
					Back to queue
				</NavLink>
			</div>
		);
	}

	const { video, transcript, summary } = data;

	const handleSeekToIndex = (segmentIndex: number) => {
		const seg = transcript.find((s) => s.index === segmentIndex);
		if (seg) setSeekTo(seg.start);
	};

	const tabs: { id: Tab; label: string; show: boolean }[] = [
		{ id: "summary", label: "Summary", show: summary !== null },
		{ id: "notes", label: "Notes", show: summary?.notes != null },
		{ id: "audio", label: "Audio", show: summary?.audioSummaryUrl != null },
	];

	const visibleTabs = tabs.filter((t) => t.show);

	const allOptionsEnabled =
		video.options.summarize &&
		video.options.extractKeywords &&
		video.options.extractMainIdeas &&
		video.options.generateNotes;

	return (
		<div className="h-full overflow-y-auto">
			{showGenerateDialog && (
				<GenerateOptionsDialog
					videoId={video.id}
					existingOptions={video.options}
					balance={creditsData?.balance ?? 0}
					onClose={() => setShowGenerateDialog(false)}
				/>
			)}
			<div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 md:px-6">
				<div className="flex items-center gap-3">
					<NavLink
						to="/queue"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						Back
					</NavLink>
					<h1 className="truncate font-semibold text-base">{video.title}</h1>
					<span
						className={[
							"rounded-full px-2 py-0.5 font-medium text-xs",
							STATUS_BADGE[video.status] ?? "",
						].join(" ")}
					>
						{video.status === "processing" && (
							<span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
						)}
						{STATUS_LABEL[video.status] ?? video.status}
					</span>
					<div className="ml-auto flex items-center gap-3">
						{summary && summary.keywords.length > 0 && (
							<div className="hidden items-center gap-1 md:flex">
								<span className="text-muted-foreground text-xs">Keywords:</span>
								{summary.keywords.slice(0, 4).map((kw) => (
									<span
										key={kw}
										className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
									>
										{kw}
									</span>
								))}
							</div>
						)}
						{!allOptionsEnabled && (
							<button
								type="button"
								onClick={() => setShowGenerateDialog(true)}
								className="rounded-lg border border-border px-3 py-1.5 text-muted-foreground text-xs transition-colors hover:border-primary hover:text-foreground"
							>
								+ Generate more
							</button>
						)}
					</div>
				</div>

				<MediaPlayer
					src={video.mediaUrl}
					mediaType={video.mediaType}
					onTimeUpdate={setCurrentTime}
					seekTo={seekTo}
				/>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="flex flex-col rounded-xl border border-border bg-card">
						<div className="border-border border-b px-4 py-2.5">
							<p className="font-medium text-sm">Transcript</p>
						</div>
						<div className="h-[50vh] p-3">
							<TranscriptPanel
								segments={transcript}
								currentTime={currentTime}
								hoveredIndices={hoveredIndices}
								onSeek={(t) => setSeekTo(t)}
							/>
						</div>
					</div>

					<div className="flex flex-col rounded-xl border border-border bg-card">
						{visibleTabs.length > 0 && (
							<div className="flex border-border border-b">
								{visibleTabs.map((tab) => (
									<button
										key={tab.id}
										type="button"
										onClick={() => setActiveTab(tab.id)}
										className={[
											"px-4 py-2.5 text-sm transition-colors",
											activeTab === tab.id
												? "border-primary border-b-2 font-medium text-foreground"
												: "text-muted-foreground hover:text-foreground",
										].join(" ")}
									>
										{tab.label}
									</button>
								))}
							</div>
						)}

						<div className="h-[50vh] overflow-y-auto p-4">
							{activeTab === "summary" && summary && (
								<SummaryPanel
									summary={summary}
									onHoverIndices={setHoveredIndices}
									onSeekToIndex={handleSeekToIndex}
								/>
							)}
							{activeTab === "notes" && summary?.notes && (
								<NotesPanel notes={summary.notes} />
							)}
							{activeTab === "audio" && summary?.audioSummaryUrl && (
								<AudioSummaryPlayer src={summary.audioSummaryUrl} />
							)}
							{visibleTabs.length === 0 && (
								<p className="text-muted-foreground text-sm">
									No AI results available.
								</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
