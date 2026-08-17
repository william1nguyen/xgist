import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateMediaMutation } from "@/graphql/generated/graphql";

type EditMediaDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mediaId: string;
	initialTitle: string;
	initialDescription: string | null | undefined;
};

export function EditMediaDialog({
	open,
	onOpenChange,
	mediaId,
	initialTitle,
	initialDescription,
}: EditMediaDialogProps) {
	const { t } = useTranslation();
	const [title, setTitle] = useState(initialTitle);
	const [description, setDescription] = useState(initialDescription ?? "");
	const [updateMedia, { loading }] = useUpdateMediaMutation();

	useEffect(() => {
		if (open) {
			setTitle(initialTitle);
			setDescription(initialDescription ?? "");
		}
	}, [open, initialTitle, initialDescription]);

	async function handleSave() {
		if (!title.trim()) return;
		try {
			await updateMedia({
				variables: { id: mediaId, title, description },
			});
			toast.success(t("editMediaDialog.successToast"));
			onOpenChange(false);
		} catch {
			toast.error(t("editMediaDialog.errorToast"));
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("editMediaDialog.title")}</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="edit-media-title">
							{t("editMediaDialog.titleLabel")}
						</Label>
						<Input
							id="edit-media-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							required
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="edit-media-description">
							{t("editMediaDialog.descriptionLabel")}
						</Label>
						<Textarea
							id="edit-media-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder={t("editMediaDialog.descriptionPlaceholder")}
							rows={4}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t("common.cancel")}
					</Button>
					<Button onClick={handleSave} disabled={loading || !title.trim()}>
						{loading ? t("common.saving") : t("common.save")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
