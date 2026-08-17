import { MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { EditMediaDialog } from "@/components/media/edit-media-dialog";
import { RegenerateDialog } from "@/components/media/regenerate-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	type MediaStatus,
	useContentDetailQuery,
	useTrashMediaMutation,
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

// transcribe isn't "optional content" the way the others are, but a
// regenerate-eligible media item (COMPLETED or FAILED after transcribe)
// usually already has one — treating it the same as the other options
// lets OptionsPanel/RegenerateDialog stop forcing it into every
// regenerate request when it's already there.
const ALL_CONTENT_OPTIONS: ProcessingOptionId[] = [
	"transcribe",
	...OPTIONAL_CONTENT_OPTIONS,
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
	const navigate = useNavigate();
	const location = useLocation();
	const [open, setOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [regenerateOpen, setRegenerateOpen] = useState(false);
	const [trashMedia, { loading: trashing }] = useTrashMediaMutation();

	const { data } = useContentDetailQuery({
		variables: { mediaId },
		skip: !open && !regenerateOpen,
	});
	const content = data?.contentDetail;

	const present: Record<ProcessingOptionId, boolean> = {
		transcribe: content?.transcript != null,
		summarize: (content?.summaries.length ?? 0) > 0,
		extract_keywords: (content?.keywords.length ?? 0) > 0,
		extract_keypoints: (content?.keypoints.length ?? 0) > 0,
		generate_notes: (content?.notes.length ?? 0) > 0,
		generate_audio_summary: (content?.summaryAudios.length ?? 0) > 0,
	};
	const missingOptions: ProcessingOptionId[] = ALL_CONTENT_OPTIONS.filter(
		(id) => !present[id],
	);
	const existingOptions = new Set<ProcessingOptionId>(
		ALL_CONTENT_OPTIONS.filter((id) => present[id]),
	);
	const canRegenerate = status === "COMPLETED" || status === "FAILED";

	async function handleTrash() {
		try {
			await trashMedia({
				variables: { id: mediaId },
				// A field-level cache merge (Media already normalizes by id)
				// updates status/trashedAt on the cached item just fine, but
				// it doesn't remove the item from mediaList's cached items
				// array — nothing re-runs the server's "exclude trashed"
				// filter client-side. Evicting the entity outright removes
				// its reference from every list that held it, immediately,
				// without waiting on a refetch.
				update(cache) {
					cache.evict({
						id: cache.identify({ __typename: "Media", id: mediaId }),
					});
					cache.gc();
				},
			});
			toast.success(t("mediaActions.trashedToast"));
			if (location.pathname === `/media/${mediaId}`) {
				navigate("/");
			}
		} catch {
			toast.error(t("mediaActions.trashErrorToast"));
		}
	}

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
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						disabled={trashing}
						onSelect={handleTrash}
					>
						<Trash2 className="size-4" />
						{t("mediaActions.moveToTrash")}
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
