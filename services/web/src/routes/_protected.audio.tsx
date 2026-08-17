import { ChevronLeft, ChevronRight, Music, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AudioJobCard } from "@/components/audio/audio-job-card";
import { CreateAudioDialog } from "@/components/audio/create-audio-dialog";
import { ListenAudioDialog } from "@/components/audio/listen-audio-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudioJobsQuery } from "@/graphql/generated/graphql";

const PAGE_SIZE = 12;
// A plain fixed-interval poll so a generating job's card flips to
// completed/failed without a manual refresh — not ADR 0005's
// backoff-aware useMediaProgress, which is sized for the dashboard's
// higher-traffic batched per-item feed.
const POLL_INTERVAL_MS = 4000;

export default function AudioPage() {
	const { t } = useTranslation();
	const [createOpen, setCreateOpen] = useState(false);
	const [listenJobId, setListenJobId] = useState<string | null>(null);
	// Same forward-only cursor-stack pattern as the dashboard and trash
	// screens: audioJobs' cursor has no backward form, so "Previous" pops
	// the stack instead of re-deriving one.
	const [cursorStack, setCursorStack] = useState<string[]>([]);
	const pageIndex = cursorStack.length;
	const currentCursor = cursorStack[cursorStack.length - 1];

	const { data, loading, startPolling, stopPolling } = useAudioJobsQuery({
		variables: { kind: "audio", cursor: currentCursor, pageSize: PAGE_SIZE },
		fetchPolicy: "cache-and-network",
	});

	const items = data?.audioJobs.items ?? [];
	const nextCursor = data?.audioJobs.nextCursor ?? null;
	const hasGenerating = items.some((item) => item.status === "generating");

	// Poll only while something is actually generating: content presigns
	// a fresh playback URL on every read, so polling a page that's fully
	// settled would keep swapping a completed job's <audio src> out from
	// under the listener every tick, cutting playback off mid-clip.
	useEffect(() => {
		if (hasGenerating) {
			startPolling(POLL_INTERVAL_MS);
		} else {
			stopPolling();
		}
		return () => stopPolling();
	}, [hasGenerating, startPolling, stopPolling]);

	function goToNextPage() {
		if (nextCursor) setCursorStack((prev) => [...prev, nextCursor]);
	}

	function goToPreviousPage() {
		setCursorStack((prev) => prev.slice(0, -1));
	}

	return (
		<div className="flex min-h-full flex-col gap-5 px-4 py-6 md:px-6 lg:px-8">
			<PageHeader
				title={t("audio.title")}
				description={t("audio.description")}
				actions={
					<Button onClick={() => setCreateOpen(true)}>
						<Plus className="size-4" />
						{t("audio.create")}
					</Button>
				}
			/>

			<div className="flex flex-1 flex-col gap-5">
				{loading && items.length === 0 ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered
							<Skeleton key={i} className="h-32" />
						))}
					</div>
				) : items.length === 0 ? (
					<div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-border border-dashed py-28 text-center">
						<div className="flex size-12 items-center justify-center rounded-full bg-muted">
							<Music className="size-5 text-muted-foreground" />
						</div>
						<div>
							<p className="font-medium">{t("audio.emptyTitle")}</p>
							<p className="mt-1 text-muted-foreground text-sm">
								{t("audio.emptyDescription")}
							</p>
						</div>
						<Button onClick={() => setCreateOpen(true)}>
							<Plus className="size-4" />
							{t("audio.create")}
						</Button>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{items.map((job) => (
							<AudioJobCard key={job.id} job={job} onOpen={setListenJobId} />
						))}
					</div>
				)}
			</div>

			{items.length > 0 && (
				<div className="mt-auto flex items-center justify-center gap-4 pt-4">
					<Button
						variant="outline"
						size="sm"
						onClick={goToPreviousPage}
						disabled={pageIndex === 0 || loading}
					>
						<ChevronLeft className="size-4" />
						{t("dashboard.previous")}
					</Button>
					<span className="text-muted-foreground text-sm">
						{t("dashboard.page", { number: pageIndex + 1 })}
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={goToNextPage}
						disabled={!nextCursor || loading}
					>
						{t("dashboard.next")}
						<ChevronRight className="size-4" />
					</Button>
				</div>
			)}

			<CreateAudioDialog open={createOpen} onOpenChange={setCreateOpen} />
			<ListenAudioDialog
				jobId={listenJobId}
				open={listenJobId != null}
				onOpenChange={(open) => {
					if (!open) setListenJobId(null);
				}}
			/>
		</div>
	);
}
