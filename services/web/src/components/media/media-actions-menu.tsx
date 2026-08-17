import { MoreVertical } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EditMediaDialog } from "@/components/media/edit-media-dialog";
import { RegenerateDialog } from "@/components/media/regenerate-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	type MediaStatus,
	useContentDetailQuery,
} from "@/graphql/generated/graphql";
import type { ProcessingOptionId } from "@/lib/constants";

const OPTIONAL_CONTENT_OPTIONS: Extract<
	ProcessingOptionId,
	| "summarize"
	| "extract_keywords"
	| "extract_keypoints"
	| "generate_notes"
	| "generate_audio_summary"
>[] = [
	"summarize",
	"extract_keywords",
	"extract_keypoints",
	"generate_notes",
	"generate_audio_summary",
];

type MediaActionsMenuProps = {
	mediaId: string;
	title: string;
	description: string | null | undefined;
	status: MediaStatus | string;
	className?: string;
};

export function MediaActionsMenu({
	mediaId,
	title,
	description,
	status,
	className,
}: MediaActionsMenuProps) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [regenerateOpen, setRegenerateOpen] = useState(false);

	const { data } = useContentDetailQuery({
		variables: { mediaId },
		skip: !open && !regenerateOpen,
	});
	const content = data?.contentDetail;

	const present: Record<(typeof OPTIONAL_CONTENT_OPTIONS)[number], boolean> = {
		summarize: (content?.summaries.length ?? 0) > 0,
		extract_keywords: (content?.keywords.length ?? 0) > 0,
		extract_keypoints: (content?.keypoints.length ?? 0) > 0,
		generate_notes: (content?.notes.length ?? 0) > 0,
		generate_audio_summary: (content?.summaryAudios.length ?? 0) > 0,
	};
	const missingOptions: ProcessingOptionId[] = OPTIONAL_CONTENT_OPTIONS.filter(
		(id) => !present[id],
	);
	const existingOptions = new Set<ProcessingOptionId>(
		OPTIONAL_CONTENT_OPTIONS.filter((id) => present[id]),
	);
	const canRegenerate = status === "COMPLETED" || status === "FAILED";

	return (
		<>
			<DropdownMenu open={open} onOpenChange={setOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						aria-label={t("mediaActions.moreOptions")}
						className={className}
						onClick={(e) => e.stopPropagation()}
					>
						<MoreVertical className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					onClick={(e) => e.stopPropagation()}
					onCloseAutoFocus={(e) => e.preventDefault()}
				>
					<DropdownMenuItem onSelect={() => setEditOpen(true)}>
						{t("mediaActions.editDetails")}
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={!canRegenerate}
						onSelect={() => setRegenerateOpen(true)}
					>
						{t("mediaActions.generateMore")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<EditMediaDialog
				open={editOpen}
				onOpenChange={setEditOpen}
				mediaId={mediaId}
				initialTitle={title}
				initialDescription={description}
			/>
			<RegenerateDialog
				open={regenerateOpen}
				onOpenChange={setRegenerateOpen}
				mediaId={mediaId}
				missingOptions={missingOptions}
				existingOptions={existingOptions}
			/>
		</>
	);
}
