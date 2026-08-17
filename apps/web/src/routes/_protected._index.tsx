import { LayoutGrid, List } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { MediaCard } from "@/components/media/media-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	type MediaListQuery,
	useMediaListQuery,
} from "@/graphql/generated/graphql";
import { useMediaProgress } from "@/hooks/useMediaProgress";
import { TERMINAL_MEDIA_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type MediaItem = MediaListQuery["mediaList"]["items"][number];
type ViewMode = "grid" | "list";

export default function DashboardPage() {
	const navigate = useNavigate();
	const [view, setView] = useState<ViewMode>("grid");
	const { data, loading, fetchMore } = useMediaListQuery({
		variables: { pageSize: 20 },
		fetchPolicy: "cache-and-network",
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
					fetchMore({ variables: { cursor: nextCursor, pageSize: 20 } });
				}
			},
			{ threshold: 0.1 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [nextCursor, fetchMore]);

	function handleOpen(media: MediaItem) {
		if (media.status === "COMPLETED") navigate(`/media/${media.id}`);
	}

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 md:px-6">
			<div className="flex items-center justify-between">
				<h1 className="font-semibold text-xl">Your media</h1>
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1 rounded-lg border border-border p-1">
						<button
							type="button"
							onClick={() => setView("grid")}
							title="Grid view"
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
							title="List view"
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
					<Button asChild size="sm">
						<Link to="/upload">Upload</Link>
					</Button>
				</div>
			</div>

			{loading && items.length === 0 ? (
				<div
					className={cn(
						view === "grid"
							? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
							: "flex flex-col gap-2",
					)}
				>
					{Array.from({ length: 8 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered
						<Skeleton key={i} className={view === "grid" ? "h-40" : "h-16"} />
					))}
				</div>
			) : items.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
					<p className="text-muted-foreground">
						No media yet — upload your first file to get started.
					</p>
					<Button asChild>
						<Link to="/upload">Upload media</Link>
					</Button>
				</div>
			) : (
				<div
					className={cn(
						view === "grid"
							? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
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
