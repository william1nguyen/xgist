import { ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { MediaCard } from "@/components/media/media-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	type MediaListQuery,
	useMediaListQuery,
} from "@/graphql/generated/graphql";
import { useCreateDialogs } from "@/hooks/useCreateDialogs";
import { useMediaProgress } from "@/hooks/useMediaProgress";
import { TERMINAL_MEDIA_STATUSES } from "@/lib/constants";

type MediaItem = MediaListQuery["mediaList"]["items"][number];

// 3 columns x 2 rows: keeps cards a readable size instead of shrinking
// into a dense wall as more columns get added on wide screens.
const PAGE_SIZE = 6;

export default function DashboardPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { openCreateMedia } = useCreateDialogs();
	// The search box lives in AppTopBar (outside this route) and drives
	// this page purely through the ?q= param — already debounced there,
	// so no second debounce is needed here.
	const [searchParams] = useSearchParams();
	const trimmedSearch = searchParams.get("q")?.trim() || undefined;

	// cursorStack[i] is the cursor that fetches page i+1; page 0 (the
	// first page) has no cursor. "Previous" just pops the stack instead
	// of re-deriving a backward cursor, since mediaList's cursor is
	// forward-only.
	const [cursorStack, setCursorStack] = useState<string[]>([]);
	const pageIndex = cursorStack.length;
	const currentCursor = cursorStack[cursorStack.length - 1];

	// biome-ignore lint/correctness/useExhaustiveDependencies: trimmedSearch isn't read in the body — it's only here to re-run (and reset pagination) whenever the search term changes.
	useEffect(() => {
		setCursorStack([]);
	}, [trimmedSearch]);

	const { data, loading } = useMediaListQuery({
		variables: {
			cursor: currentCursor,
			pageSize: PAGE_SIZE,
			search: trimmedSearch,
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

	function handleOpen(media: MediaItem) {
		// Processing/failed media already has real content worth viewing —
		// only PENDING_UPLOAD (no confirmed object yet) stays unopenable,
		// matching MediaCard's own click-gating.
		if (media.status !== "PENDING_UPLOAD") navigate(`/media/${media.id}`);
	}

	function goToNextPage() {
		if (nextCursor) setCursorStack((prev) => [...prev, nextCursor]);
	}

	function goToPreviousPage() {
		setCursorStack((prev) => prev.slice(0, -1));
	}

	const isSearching = trimmedSearch != null;

	return (
		<div className="flex min-h-full flex-col gap-5 px-4 py-6 md:px-6 lg:px-8">
			<div className="flex flex-1 flex-col gap-5">
				{loading && items.length === 0 ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: PAGE_SIZE }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered
							<Skeleton key={i} className="h-56" />
						))}
					</div>
				) : items.length === 0 ? (
					<div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-border border-dashed py-28 text-center">
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
									? t("dashboard.emptyDescSearch", { query: trimmedSearch })
									: t("dashboard.emptyDescDefault")}
							</p>
						</div>
						{!isSearching && (
							<Button onClick={openCreateMedia}>
								<Plus className="size-4" />
								{t("dashboard.create")}
							</Button>
						)}
					</div>
				) : (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{items.map((item) => {
							const live = progress.get(item.id);
							const merged = live ? { ...item, status: live.status } : item;
							return (
								<MediaCard
									key={item.id}
									media={merged}
									progress={live}
									onOpen={handleOpen}
								/>
							);
						})}
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
		</div>
	);
}
