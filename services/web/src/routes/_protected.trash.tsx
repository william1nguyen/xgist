import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/page-header";
import { TrashedMediaCard } from "@/components/media/trashed-media-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useDeleteMediaPermanentlyMutation,
	useRestoreMediaMutation,
	useTrashedMediaQuery,
} from "@/graphql/generated/graphql";

const PAGE_SIZE = 12;

export default function TrashPage() {
	const { t } = useTranslation();
	// Same forward-only cursor-stack pattern as the dashboard: mediaList's
	// (and trashedMedia's) cursor has no backward form, so "Previous" pops
	// the stack instead of re-deriving one.
	const [cursorStack, setCursorStack] = useState<string[]>([]);
	const pageIndex = cursorStack.length;
	const currentCursor = cursorStack[cursorStack.length - 1];

	const { data, loading } = useTrashedMediaQuery({
		variables: { cursor: currentCursor, pageSize: PAGE_SIZE },
		fetchPolicy: "cache-and-network",
	});
	const [restoreMedia] = useRestoreMediaMutation();
	const [deleteMediaPermanently] = useDeleteMediaPermanentlyMutation();

	const items = data?.trashedMedia.items ?? [];
	const nextCursor = data?.trashedMedia.nextCursor ?? null;

	function goToNextPage() {
		if (nextCursor) setCursorStack((prev) => [...prev, nextCursor]);
	}

	function goToPreviousPage() {
		setCursorStack((prev) => prev.slice(0, -1));
	}

	return (
		<div className="flex flex-col gap-5 px-4 py-6 md:px-6 lg:px-8">
			<PageHeader
				title={t("trash.title")}
				description={t("trash.description")}
			/>

			{loading && items.length === 0 ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered
						<Skeleton key={i} className="h-64" />
					))}
				</div>
			) : items.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border border-dashed py-28 text-center">
					<div className="flex size-12 items-center justify-center rounded-full bg-muted">
						<Trash2 className="size-5 text-muted-foreground" />
					</div>
					<div>
						<p className="font-medium">{t("trash.emptyTitle")}</p>
						<p className="mt-1 text-muted-foreground text-sm">
							{t("trash.emptyDescription")}
						</p>
					</div>
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{items.map((item) => (
							<TrashedMediaCard
								key={item.id}
								media={item}
								onRestore={restoreMedia}
								onDeletePermanently={deleteMediaPermanently}
							/>
						))}
					</div>

					<div className="flex items-center justify-center gap-4">
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
				</>
			)}
		</div>
	);
}
