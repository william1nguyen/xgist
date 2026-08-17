import { FileAudio } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type {
	TrashedMediaQuery,
	useDeleteMediaPermanentlyMutation,
	useRestoreMediaMutation,
} from "@/graphql/generated/graphql";
import { relativeTime } from "@/lib/format";

const TRASH_RETENTION_DAYS = 30;

type TrashedItem = TrashedMediaQuery["trashedMedia"]["items"][number];

function daysRemaining(trashedAt: string | null | undefined): number {
	if (!trashedAt) return TRASH_RETENTION_DAYS;
	const elapsedDays = Math.floor(
		(Date.now() - new Date(trashedAt).getTime()) / (24 * 60 * 60 * 1000),
	);
	return Math.max(TRASH_RETENTION_DAYS - elapsedDays, 0);
}

export function TrashedMediaCard({
	media,
	onRestore,
	onDeletePermanently,
}: {
	media: TrashedItem;
	onRestore: ReturnType<typeof useRestoreMediaMutation>[0];
	onDeletePermanently: ReturnType<typeof useDeleteMediaPermanentlyMutation>[0];
}) {
	const { t } = useTranslation();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [restoring, setRestoring] = useState(false);
	const [deleting, setDeleting] = useState(false);

	async function handleRestore() {
		setRestoring(true);
		try {
			await onRestore({
				variables: { id: media.id },
				// Restoring a trashed item removes it from trashedMedia's
				// cached list, same as trashing removes it from mediaList's —
				// evicting the entity is what actually drops it from any
				// list holding a reference, immediately.
				update(cache) {
					cache.evict({
						id: cache.identify({ __typename: "Media", id: media.id }),
					});
					cache.gc();
				},
				refetchQueries: ["MediaList"],
			});
			toast.success(t("trash.restoredToast"));
		} catch {
			toast.error(t("trash.restoreErrorToast"));
		} finally {
			setRestoring(false);
		}
	}

	async function handleDeletePermanently() {
		setDeleting(true);
		try {
			await onDeletePermanently({
				variables: { id: media.id },
				update(cache) {
					cache.evict({
						id: cache.identify({ __typename: "Media", id: media.id }),
					});
					cache.gc();
				},
			});
			toast.success(t("trash.deletedToast"));
			setConfirmOpen(false);
		} catch {
			toast.error(t("trash.deleteErrorToast"));
		} finally {
			setDeleting(false);
		}
	}

	return (
		<div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
			<div className="relative aspect-video w-full shrink-0 overflow-hidden bg-muted opacity-60">
				{media.thumbnailUrl ? (
					<img
						src={media.thumbnailUrl}
						alt=""
						loading="lazy"
						className="size-full object-cover"
					/>
				) : (
					<div className="flex size-full items-center justify-center text-muted-foreground">
						<FileAudio className="size-8" />
					</div>
				)}
			</div>
			<div className="flex flex-col gap-2 p-4">
				<p className="truncate font-medium text-sm" title={media.title}>
					{media.title}
				</p>
				<p className="text-muted-foreground text-xs">
					{media.trashedAt &&
						t("trash.trashedAt", { time: relativeTime(media.trashedAt) })}
				</p>
				<p className="text-destructive text-xs">
					{t("trash.purgesIn", { days: daysRemaining(media.trashedAt) })}
				</p>
				<div className="mt-1 flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleRestore}
						disabled={restoring}
						className="flex-1"
					>
						{t("trash.restore")}
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onClick={() => setConfirmOpen(true)}
						className="flex-1"
					>
						{t("trash.deletePermanently")}
					</Button>
				</div>
			</div>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("trash.confirmTitle")}</DialogTitle>
						<DialogDescription>
							{t("trash.confirmDescription")}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmOpen(false)}>
							{t("common.cancel")}
						</Button>
						<Button
							variant="destructive"
							onClick={handleDeletePermanently}
							disabled={deleting}
						>
							{deleting ? t("trash.deleting") : t("trash.deletePermanently")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
