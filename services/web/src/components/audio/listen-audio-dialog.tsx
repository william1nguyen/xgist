import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAudioJobQuery } from "@/graphql/generated/graphql";

// Fetches and plays exactly one job, only while this dialog is open — the
// Audio list never mounts an <audio> element itself (heavy, and every
// read signs a fresh playback URL, which would keep resetting whichever
// clip happens to be playing). Opening re-fetches network-only so the
// signed URL is never a stale one from the list's own cache entry.
export function ListenAudioDialog({
	jobId,
	open,
	onOpenChange,
}: {
	jobId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { t } = useTranslation();

	const { data, loading, startPolling, stopPolling } = useAudioJobQuery({
		variables: { id: jobId ?? "" },
		skip: !jobId || !open,
		fetchPolicy: "network-only",
	});
	const job = data?.audioJob;

	useEffect(() => {
		if (open && job?.status === "generating") {
			startPolling(2000);
		} else {
			stopPolling();
		}
		return () => stopPolling();
	}, [open, job?.status, startPolling, stopPolling]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("audio.listenTitle")}</DialogTitle>
					{job?.inputText && (
						<DialogDescription className="line-clamp-3">
							{job.inputText}
						</DialogDescription>
					)}
				</DialogHeader>

				{loading && !job ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="size-5 animate-spin text-muted-foreground" />
					</div>
				) : job?.status === "completed" && job.url ? (
					// biome-ignore lint/a11y/useMediaCaption: synthesized speech has no separate caption track to attach
					<audio controls autoPlay src={job.url} className="w-full" />
				) : job?.status === "failed" ? (
					<p className="flex items-center gap-1.5 text-destructive text-sm">
						<AlertCircle className="size-4 shrink-0" />
						{t("audio.generationFailed")}
					</p>
				) : (
					<div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
						<Loader2 className="size-4 animate-spin" />
						{t("audio.status.generating")}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
