import { LayoutGrid, List, Plus, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { MediaCard } from "@/components/media/media-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	type MediaListQuery,
	useMediaListQuery,
} from "@/graphql/generated/graphql";
import { useDebounce } from "@/hooks/useDebounce";
import { useMediaProgress } from "@/hooks/useMediaProgress";
import { TERMINAL_MEDIA_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type MediaItem = MediaListQuery["mediaList"]["items"][number];
type ViewMode = "grid" | "list";

export default function DashboardPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [view, setView] = useState<ViewMode>("grid");
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 350);

	const { data, loading, fetchMore } = useMediaListQuery({
		variables: {
			pageSize: 20,
			search: debouncedSearch.trim() || undefined,
		},
		fetchPolicy: "cache-and-network",
		notifyOnNetworkStatusChange: true,
	});

	const items = data?.mediaList.items ?? [];
	const nextCursor = data?.mediaList.nextCursor ?? null;

	const nonTerminalIds = useMemo(
		() =>
			items
				.filter((item) => !TERMINAL_MEDIA_STATUSES.has(item.status))
				.map((item) => item.id),
		[items],
	);
	const progress = useMediaProgress(nonTerminalIds, {
		onAuthError: () => navigate("/login", { replace: true }),
	});

	const sentinelRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el || !nextCursor) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					fetchMore({
						variables: {
							cursor: nextCursor,
							pageSize: 20,
							search: debouncedSearch.trim() || undefined,
						},
					});
				}
			},
			{ threshold: 0.1 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [nextCursor, fetchMore, debouncedSearch]);

	function handleOpen(media: MediaItem) {
		if (media.status === "COMPLETED") navigate(`/media/${media.id}`);
	}

	const isSearching = debouncedSearch.trim() !== "";

	return (
		<div className="flex flex-col gap-5 px-6 py-8 md:px-10">
			<div className="flex justify-center">
				<div className="flex w-full max-w-2xl items-center gap-3">
					<div className="relative flex-1">
						<Search className="-translate-y-1/2 absolute top-1/2 left-4 size-5 text-muted-foreground" />
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder={t("dashboard.searchPlaceholder")}
							className="h-12 w-full rounded-xl border border-border bg-background pr-4 pl-11 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						/>
					</div>
					<Button
						size="lg"
						onClick={() => navigate("/create")}
						className="h-12 shrink-0"
					>
						<Plus className="size-4" />
						{t("dashboard.create")}
					</Button>
				</div>
			</div>

			<div className="flex items-center justify-end">
				<div className="flex items-center gap-1 rounded-lg border border-border p-1">
					<button
						type="button"
						onClick={() => setView("grid")}
						title={t("dashboard.gridView")}
						className={cn(
							"rounded p-1.5 transition-colors",
							view === "grid"
								? "bg-muted text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<LayoutGrid className="size-4" />
					</button>
					<button
						type="button"
						onClick={() => setView("list")}
						title={t("dashboard.listView")}
						className={cn(
							"rounded p-1.5 transition-colors",
							view === "list"
								? "bg-muted text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<List className="size-4" />
					</button>
				</div>
			</div>

			{loading && items.length === 0 ? (
				<div
					className={cn(
						view === "grid"
							? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
							: "flex flex-col gap-2",
					)}
				>
					{Array.from({ length: 12 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered
						<Skeleton key={i} className={view === "grid" ? "h-40" : "h-16"} />
					))}
				</div>
			) : items.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border border-dashed py-28 text-center">
					<div className="flex size-12 items-center justify-center rounded-full bg-muted">
						<Sparkles className="size-5 text-muted-foreground" />
					</div>
					<div>
						<p className="font-medium">
							{isSearching
								? t("dashboard.emptyTitleSearch")
								: t("dashboard.emptyTitleDefault")}
						</p>
						<p className="mt-1 text-muted-foreground text-sm">
							{isSearching
								? t("dashboard.emptyDescSearch", {
										query: debouncedSearch.trim(),
									})
								: t("dashboard.emptyDescDefault")}
						</p>
					</div>
					{!isSearching && (
						<Button onClick={() => navigate("/create")}>
							<Plus className="size-4" />
							{t("dashboard.create")}
						</Button>
					)}
				</div>
			) : (
				<div
					className={cn(
						view === "grid"
							? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
							: "flex flex-col gap-2",
					)}
				>
					{items.map((item) => {
						const live = progress.get(item.id);
						const merged = live ? { ...item, status: live.status } : item;
						return (
							<MediaCard
								key={item.id}
								media={merged}
								progress={live}
								view={view}
								onOpen={handleOpen}
							/>
						);
					})}
				</div>
			)}

			<div ref={sentinelRef} className="py-2 text-center">
				{nextCursor && items.length > 0 && (
					<div className="inline-block size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				)}
			</div>
		</div>
	);
}
