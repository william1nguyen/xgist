import type { QueueJob, VideoStatus } from "@repo/types";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { computeCreditCost } from "@xgist/config";
import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { toast } from "sonner";
import JobThumbnail from "@/components/queue/JobThumbnail";
import { client, orpc } from "@/utils/orpc";

type ViewMode = "grid" | "list";
type DateRange = "all" | "today" | "week" | "month";

const STATUS_OPTIONS: { value: VideoStatus; label: string }[] = [
	{ value: "pending", label: "Waiting" },
	{ value: "processing", label: "Processing" },
	{ value: "completed", label: "Done" },
	{ value: "failed", label: "Failed" },
];

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
	{ value: "all", label: "All time" },
	{ value: "today", label: "Today" },
	{ value: "week", label: "This week" },
	{ value: "month", label: "This month" },
];

const TERMINAL: Set<VideoStatus> = new Set(["completed", "failed"]);

function useDebounce<T>(value: T, delay: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const t = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(t);
	}, [value, delay]);
	return debounced;
}

function timeAgo(date: Date): string {
	const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
	if (seconds < 60) return `${seconds}s ago`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	return `${hours}h ago`;
}

function dateRangeBounds(range: DateRange): {
	dateFrom?: string;
	dateTo?: string;
} {
	if (range === "all") return {};
	const now = new Date();
	const from = new Date(now);
	if (range === "today") from.setHours(0, 0, 0, 0);
	else if (range === "week") from.setDate(now.getDate() - 7);
	else if (range === "month") from.setMonth(now.getMonth() - 1);
	return { dateFrom: from.toISOString(), dateTo: now.toISOString() };
}

function statusBadge(status: VideoStatus) {
	const styles: Record<VideoStatus, string> = {
		pending: "bg-zinc-500/20 text-zinc-400",
		processing: "bg-blue-500/20 text-blue-400",
		completed: "bg-green-500/20 text-green-400",
		failed: "bg-red-500/20 text-red-400",
	};
	const labels: Record<VideoStatus, string> = {
		pending: "Waiting",
		processing: "Processing",
		completed: "Done",
		failed: "Failed",
	};
	return (
		<span
			className={`rounded-full px-2 py-0.5 font-medium text-xs ${styles[status]}`}
		>
			{labels[status]}
		</span>
	);
}

type FilterState = {
	statuses: VideoStatus[];
	dateRange: DateRange;
};

type FilterPopupProps = {
	filters: FilterState;
	onChange: (f: FilterState) => void;
	onClose: () => void;
};

function FilterPopup({ filters, onChange, onClose }: FilterPopupProps) {
	const [local, setLocal] = useState<FilterState>(filters);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function onClickOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) onClose();
		}
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, [onClose]);

	const toggleStatus = (s: VideoStatus) => {
		setLocal((prev) => ({
			...prev,
			statuses: prev.statuses.includes(s)
				? prev.statuses.filter((x) => x !== s)
				: [...prev.statuses, s],
		}));
	};

	const activeCount =
		local.statuses.length + (local.dateRange !== "all" ? 1 : 0);

	return (
		<div
			ref={ref}
			className="absolute top-full right-0 z-50 mt-2 w-64 rounded-xl border border-border bg-card p-4 shadow-xl"
		>
			<p className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
				Status
			</p>
			<div className="mb-4 flex flex-wrap gap-1.5">
				{STATUS_OPTIONS.map((opt) => (
					<button
						key={opt.value}
						type="button"
						onClick={() => toggleStatus(opt.value)}
						className={[
							"rounded-full border px-3 py-1 text-xs transition-colors",
							local.statuses.includes(opt.value)
								? "border-primary bg-primary/10 text-primary"
								: "border-border text-muted-foreground hover:border-primary/40",
						].join(" ")}
					>
						{opt.label}
					</button>
				))}
			</div>

			<p className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
				Time range
			</p>
			<div className="mb-4 flex flex-col gap-1">
				{DATE_RANGE_OPTIONS.map((opt) => (
					<button
						key={opt.value}
						type="button"
						onClick={() =>
							setLocal((prev) => ({ ...prev, dateRange: opt.value }))
						}
						className={[
							"rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
							local.dateRange === opt.value
								? "bg-primary/10 text-primary"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
						].join(" ")}
					>
						{opt.label}
					</button>
				))}
			</div>

			<div className="flex gap-2">
				<button
					type="button"
					onClick={() => {
						const reset: FilterState = { statuses: [], dateRange: "all" };
						setLocal(reset);
						onChange(reset);
						onClose();
					}}
					className="flex-1 rounded-lg border border-border py-1.5 text-muted-foreground text-xs hover:text-foreground"
				>
					Reset
				</button>
				<button
					type="button"
					onClick={() => {
						onChange(local);
						onClose();
					}}
					className="flex-1 rounded-lg bg-primary py-1.5 font-medium text-primary-foreground text-xs"
				>
					Apply{activeCount > 0 ? ` (${activeCount})` : ""}
				</button>
			</div>
		</div>
	);
}

export default function QueuePage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [search, setSearch] = useState("");
	const [filters, setFilters] = useState<FilterState>({
		statuses: [],
		dateRange: "all",
	});
	const [filterOpen, setFilterOpen] = useState(false);
	const [viewMode, setViewMode] = useState<ViewMode>("grid");

	const debouncedSearch = useDebounce(search, 400);
	const { dateFrom, dateTo } = dateRangeBounds(filters.dateRange);

	const queryInput = {
		search: debouncedSearch || undefined,
		status: filters.statuses.length > 0 ? filters.statuses : undefined,
		dateFrom,
		dateTo,
	};

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useInfiniteQuery({
			queryKey: orpc.queue.list.key({ input: queryInput }),
			queryFn: ({ pageParam }) =>
				client.queue.list({
					...queryInput,
					cursor: pageParam as string | undefined,
				}),
			getNextPageParam: (last) => last.nextCursor ?? undefined,
			initialPageParam: undefined as string | undefined,
			refetchInterval: (query) => {
				const jobs = query.state.data?.pages.flatMap((p) => p.jobs) ?? [];
				return jobs.some((j) => !TERMINAL.has(j.video.status)) ? 3000 : false;
			},
			staleTime: 2000,
		});

	const jobs = data?.pages.flatMap((p) => p.jobs) ?? [];

	const sentinelRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && hasNextPage) fetchNextPage();
			},
			{ threshold: 0.1 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [hasNextPage, fetchNextPage]);

	const handleRetry = async (videoId: string) => {
		try {
			await client.video.retry({ videoId });
			await queryClient.invalidateQueries({ queryKey: orpc.queue.list.key() });
			toast.success("Job re-queued");
		} catch {
			toast.error("Retry failed — check your credit balance");
		}
	};

	const handleCardClick = useCallback(
		(job: QueueJob) => {
			if (job.video.status === "completed") navigate(`/video/${job.video.id}`);
		},
		[navigate],
	);

	const activeFilterCount =
		filters.statuses.length + (filters.dateRange !== "all" ? 1 : 0);
	const hasFilters = debouncedSearch || activeFilterCount > 0;

	return (
		<div className="space-y-5 px-4 py-8">
			<div className="mx-auto flex max-w-6xl items-center justify-between">
				<h1 className="font-semibold text-xl">Processing Queue</h1>
				<NavLink
					to="/upload"
					className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
				>
					+ New Upload
				</NavLink>
			</div>

			<div className="mx-auto flex max-w-6xl items-center gap-2">
				<div className="relative flex-1">
					<svg
						className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					<input
						type="text"
						placeholder="Search by title..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full rounded-lg border border-border bg-background py-2 pr-3 pl-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
					/>
				</div>

				<div className="relative">
					<button
						type="button"
						onClick={() => setFilterOpen((v) => !v)}
						className={[
							"relative flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
							activeFilterCount > 0
								? "border-primary bg-primary/10 text-primary"
								: "border-border text-muted-foreground hover:text-foreground",
						].join(" ")}
					>
						<svg
							className="h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
							/>
						</svg>
						{activeFilterCount > 0 && (
							<span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary font-bold text-[10px] text-primary-foreground">
								{activeFilterCount}
							</span>
						)}
					</button>
					{filterOpen && (
						<FilterPopup
							filters={filters}
							onChange={setFilters}
							onClose={() => setFilterOpen(false)}
						/>
					)}
				</div>

				<div className="flex items-center gap-1 rounded-lg border border-border p-1">
					<button
						type="button"
						onClick={() => setViewMode("grid")}
						title="Grid view"
						className={`rounded p-1.5 transition-colors ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
					>
						<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
							<path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3A1.5 1.5 0 0115 10.5v3A1.5 1.5 0 0113.5 15h-3A1.5 1.5 0 019 13.5v-3z" />
						</svg>
					</button>
					<button
						type="button"
						onClick={() => setViewMode("list")}
						title="List view"
						className={`rounded p-1.5 transition-colors ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
					>
						<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
							<path
								fillRule="evenodd"
								d="M2.5 12a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z"
							/>
						</svg>
					</button>
				</div>
			</div>

			{jobs.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
					<p className="text-muted-foreground">
						{hasFilters ? "No jobs match your filters." : "No jobs yet."}
					</p>
					{!hasFilters && (
						<NavLink
							to="/upload"
							className="font-medium text-primary text-sm hover:underline"
						>
							Upload your first file →
						</NavLink>
					)}
				</div>
			) : viewMode === "grid" ? (
				<div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
					{jobs.map((job) => (
						<GridCard
							key={job.jobId}
							job={job}
							onRetry={handleRetry}
							onClick={handleCardClick}
						/>
					))}
				</div>
			) : (
				<div className="mx-auto flex max-w-6xl flex-col gap-2">
					{jobs.map((job) => (
						<ListRow
							key={job.jobId}
							job={job}
							onRetry={handleRetry}
							onClick={handleCardClick}
						/>
					))}
				</div>
			)}

			<div ref={sentinelRef} className="mx-auto max-w-6xl py-2 text-center">
				{isFetchingNextPage && (
					<div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				)}
			</div>
		</div>
	);
}

type CardProps = {
	job: QueueJob;
	onRetry: (id: string) => void;
	onClick: (job: QueueJob) => void;
};

function GridCard({ job, onRetry, onClick }: CardProps) {
	const { status } = job.video;
	const isCompleted = status === "completed";
	const isFailed = status === "failed";
	const creditCost = computeCreditCost(job.video.options);

	return (
		<div
			onClick={() => onClick(job)}
			className={[
				"group flex flex-col overflow-hidden rounded-xl border bg-card transition-all",
				isCompleted
					? "cursor-pointer hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
					: "cursor-default",
				isFailed ? "border-red-500/30 bg-red-500/5" : "border-border",
			].join(" ")}
		>
			<JobThumbnail
				mediaUrl={job.video.mediaUrl}
				mediaType={job.video.mediaType}
				status={status}
				title={job.video.title}
			/>
			<div className="flex flex-col gap-1.5 p-3">
				<p
					className="truncate font-medium text-sm leading-tight"
					title={job.video.title}
				>
					{job.video.title}
				</p>
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground text-xs">{creditCost}c</span>
					<span className="text-muted-foreground text-xs">
						{timeAgo(job.video.createdAt)}
					</span>
				</div>
				{isFailed && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onRetry(job.video.id);
						}}
						className="mt-1 w-full rounded-md border border-red-500/40 py-1 text-red-400 text-xs hover:bg-red-500/10"
					>
						Retry
					</button>
				)}
				{isCompleted && (
					<span className="mt-1 text-center text-primary text-xs opacity-0 transition-opacity group-hover:opacity-100">
						View details →
					</span>
				)}
			</div>
		</div>
	);
}

function ListRow({ job, onRetry, onClick }: CardProps) {
	const { status } = job.video;
	const isCompleted = status === "completed";
	const isFailed = status === "failed";
	const creditCost = computeCreditCost(job.video.options);

	return (
		<div
			onClick={() => onClick(job)}
			className={[
				"flex items-center gap-4 rounded-xl border bg-card px-4 py-3 transition-all",
				isCompleted
					? "cursor-pointer hover:border-primary/50 hover:bg-muted/30"
					: "cursor-default",
				isFailed ? "border-red-500/30 bg-red-500/5" : "border-border",
			].join(" ")}
		>
			<div className="h-10 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
				<JobThumbnail
					mediaUrl={job.video.mediaUrl}
					mediaType={job.video.mediaType}
					status={status}
					title={job.video.title}
				/>
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-sm" title={job.video.title}>
					{job.video.title}
				</p>
				<p className="text-muted-foreground text-xs">
					{timeAgo(job.video.createdAt)}
				</p>
			</div>
			<div className="flex shrink-0 items-center gap-3">
				{statusBadge(status)}
				<span className="text-muted-foreground text-xs">{creditCost}c</span>
				{isFailed && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onRetry(job.video.id);
						}}
						className="rounded-md border border-red-500/40 px-2 py-1 text-red-400 text-xs hover:bg-red-500/10"
					>
						Retry
					</button>
				)}
				{isCompleted && <span className="text-primary text-xs">View →</span>}
			</div>
		</div>
	);
}
