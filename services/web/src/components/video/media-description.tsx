import { FileText, Loader2, Volume2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { KeypointsPanel } from "@/components/video/keypoints-panel";
import { KeywordsPanel } from "@/components/video/keywords-panel";
import { NotesPanel } from "@/components/video/notes-panel";
import { SummaryPanel } from "@/components/video/summary-panel";
import type { ContentDetailQuery } from "@/graphql/generated/graphql";
import { relativeTime } from "@/lib/format";

type Content = ContentDetailQuery["contentDetail"];

type MediaDescriptionProps = {
	mediaId: string;
	mediaTitle: string;
	createdAt: string;
	description: string | null | undefined;
	summaries: Content["summaries"];
	keywords: Content["keywords"];
	keypoints: Content["keypoints"];
	notes: Content["notes"];
	hasAudio: boolean;
	// True while an audio summary looks like it's being generated: the
	// media item is processing and already has a summary (audio always
	// depends on one) but no audio yet. There's no per-step signal from
	// the backend to know for certain audio specifically is the step in
	// flight, but this narrows it enough to be a useful hint rather than
	// a guess that's just as often wrong.
	audioGenerating: boolean;
	onHoverIndices: (indices: number[]) => void;
	onSeekToIndex: (index: number) => void;
};

export function MediaDescription({
	mediaId,
	mediaTitle,
	createdAt,
	description,
	summaries,
	keywords,
	keypoints,
	notes,
	hasAudio,
	audioGenerating,
	onHoverIndices,
	onSeekToIndex,
}: MediaDescriptionProps) {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(false);
	const [notesOpen, setNotesOpen] = useState(false);
	const text = description?.trim();

	return (
		<div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
			<div className="flex flex-col gap-2">
				<p className="text-muted-foreground text-xs">
					{relativeTime(createdAt)}
				</p>
				{text ? (
					<div className="flex flex-col items-start gap-1.5">
						<p
							className={
								expanded
									? "whitespace-pre-wrap text-sm"
									: "line-clamp-3 text-sm"
							}
						>
							{text}
						</p>
						<button
							type="button"
							onClick={() => setExpanded((prev) => !prev)}
							className="font-medium text-muted-foreground text-xs hover:text-foreground"
						>
							{expanded ? t("mediaDetail.showLess") : t("mediaDetail.showMore")}
						</button>
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						{t("mediaDetail.noDescription")}
					</p>
				)}
			</div>

			{summaries.length > 0 && (
				<div className="flex flex-col gap-2 border-border border-t pt-3">
					<p className="font-medium text-xs">{t("mediaDetail.tabSummary")}</p>
					<SummaryPanel
						summaries={summaries}
						onHoverIndices={onHoverIndices}
						onSeekToIndex={onSeekToIndex}
					/>
				</div>
			)}

			{keywords.length > 0 && (
				<div className="flex flex-col gap-2 border-border border-t pt-3">
					<p className="font-medium text-xs">{t("mediaDetail.tabKeywords")}</p>
					<KeywordsPanel keywords={keywords} />
				</div>
			)}

			{keypoints.length > 0 && (
				<div className="flex flex-col gap-2 border-border border-t pt-3">
					<p className="font-medium text-xs">{t("mediaDetail.tabKeypoints")}</p>
					<KeypointsPanel keypoints={keypoints} onSeekToIndex={onSeekToIndex} />
				</div>
			)}

			{(notes.length > 0 || hasAudio || audioGenerating) && (
				<div className="flex flex-wrap items-center gap-2 border-border border-t pt-3">
					{notes.length > 0 && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setNotesOpen(true)}
						>
							<FileText className="size-3.5" />
							{t("mediaDetail.viewNotes")}
						</Button>
					)}
					{hasAudio ? (
						<Button variant="outline" size="sm" asChild>
							<Link to={`/media/${mediaId}/audio`}>
								<Volume2 className="size-3.5" />
								{t("mediaDetail.listenToAudio")}
							</Link>
						</Button>
					) : (
						audioGenerating && (
							<span className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-muted-foreground text-sm">
								<Loader2 className="size-3.5 animate-spin" />
								{t("mediaDetail.audioGenerating")}
							</span>
						)
					)}
				</div>
			)}

			<Dialog open={notesOpen} onOpenChange={setNotesOpen}>
				<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{t("mediaDetail.tabNotes")}</DialogTitle>
					</DialogHeader>
					<NotesPanel notes={notes} mediaTitle={mediaTitle} />
				</DialogContent>
			</Dialog>
		</div>
	);
}
