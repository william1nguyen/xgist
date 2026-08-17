import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { VoiceStep } from "@/components/create/voice-step";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { CreditPreview } from "@/components/upload/credit-preview";
import { OptionsPanel } from "@/components/upload/options-panel";
import { useRequestProcessingMutation } from "@/graphql/generated/graphql";
import { DEFAULT_TTS_VOICE, type ProcessingOptionId } from "@/lib/constants";

type RegenerateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mediaId: string;
	missingOptions: ProcessingOptionId[];
	existingOptions?: Set<ProcessingOptionId>;
};

export function RegenerateDialog({
	open,
	onOpenChange,
	mediaId,
	missingOptions,
	existingOptions,
}: RegenerateDialogProps) {
	const { t } = useTranslation();
	const [options, setOptions] = useState<Set<ProcessingOptionId>>(
		new Set(["transcribe", ...missingOptions]),
	);
	const [voice, setVoice] = useState(DEFAULT_TTS_VOICE);
	const [requestProcessing, { loading }] = useRequestProcessingMutation();

	// biome-ignore lint/correctness/useExhaustiveDependencies: missingOptions is derived fresh each render from content state; only re-seed selection when the dialog transitions open, not on every parent re-render.
	useEffect(() => {
		if (open) {
			setOptions(new Set(["transcribe", ...missingOptions]));
			setVoice(DEFAULT_TTS_VOICE);
		}
	}, [open]);

	const wantsAudio = options.has("generate_audio_summary");
	const optionsList = Array.from(options);

	async function handleSubmit() {
		try {
			await requestProcessing({
				variables: {
					mediaId,
					options: optionsList,
					audioVoice: wantsAudio ? voice : undefined,
				},
			});
			toast.success(t("regenerateDialog.successToast"));
			onOpenChange(false);
		} catch {
			toast.error(t("regenerateDialog.errorToast"));
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("regenerateDialog.title")}</DialogTitle>
					<DialogDescription>
						{t("regenerateDialog.description")}
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-5">
					<OptionsPanel
						selected={options}
						onChange={setOptions}
						existingOptions={existingOptions}
					/>
					{wantsAudio && <VoiceStep value={voice} onChange={setVoice} />}
					<CreditPreview options={optionsList} />
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t("common.cancel")}
					</Button>
					<Button onClick={handleSubmit} disabled={loading}>
						{loading
							? t("regenerateDialog.starting")
							: t("regenerateDialog.start")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
