import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
	StepIndicator,
	type WizardStep,
} from "@/components/create/step-indicator";
import { ThumbnailStep } from "@/components/create/thumbnail-step";
import { VoiceStep } from "@/components/create/voice-step";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CreditPreview } from "@/components/upload/credit-preview";
import { Dropzone } from "@/components/upload/dropzone";
import { OptionsPanel } from "@/components/upload/options-panel";
import {
	useConfirmUploadMutation,
	useCreateUploadSessionMutation,
} from "@/graphql/generated/graphql";
import { DEFAULT_TTS_VOICE, type ProcessingOptionId } from "@/lib/constants";
import { uploadWithProgress } from "@/lib/upload";

type Stage = "idle" | "creating-session" | "uploading" | "confirming";

const STAGE_LABEL: Record<Stage, string> = {
	idle: "",
	"creating-session": "Preparing upload…",
	uploading: "Uploading…",
	confirming: "Starting processing…",
};

export default function CreatePage() {
	const navigate = useNavigate();
	const [file, setFile] = useState<File | null>(null);
	const [title, setTitle] = useState("");
	const [options, setOptions] = useState<Set<ProcessingOptionId>>(
		new Set(["transcribe"]),
	);
	const [voice, setVoice] = useState(DEFAULT_TTS_VOICE);
	const [stepId, setStepId] = useState("upload");
	const [furthestIndex, setFurthestIndex] = useState(0);
	const [stage, setStage] = useState<Stage>("idle");
	const [uploadPercent, setUploadPercent] = useState(0);

	const [createUploadSession] = useCreateUploadSessionMutation();
	const [confirmUpload] = useConfirmUploadMutation();

	const wantsAudio = options.has("generate_audio_summary");
	const steps: WizardStep[] = useMemo(() => {
		const base: WizardStep[] = [
			{ id: "upload", label: "Upload" },
			{ id: "thumbnail", label: "Thumbnail" },
			{ id: "extract", label: "Extract" },
		];
		if (wantsAudio) base.push({ id: "voice", label: "Voice" });
		return base;
	}, [wantsAudio]);

	const stepIndex = Math.max(
		0,
		steps.findIndex((s) => s.id === stepId),
	);
	// If the audio step disappears (option unchecked) while it's selected,
	// land on the new last step instead of an id that no longer exists.
	const activeStepId = steps[stepIndex]?.id ?? steps[0].id;
	const isLastStep = stepIndex === steps.length - 1;
	const busy = stage !== "idle";
	const optionsList = Array.from(options);

	function goTo(id: string) {
		setStepId(id);
		const idx = steps.findIndex((s) => s.id === id);
		if (idx > furthestIndex) setFurthestIndex(idx);
	}

	function next() {
		const idx = steps.findIndex((s) => s.id === activeStepId);
		const nextStep = steps[idx + 1];
		if (nextStep) goTo(nextStep.id);
	}

	function back() {
		const idx = steps.findIndex((s) => s.id === activeStepId);
		const prevStep = steps[idx - 1];
		if (prevStep) goTo(prevStep.id);
	}

	function handleSelectFile(next: File | null) {
		setFile(next);
		if (next && !title) setTitle(next.name.replace(/\.[^/.]+$/, ""));
	}

	const canAdvance =
		activeStepId !== "upload" || (file != null && title.trim() !== "");

	async function handleSubmit() {
		if (!file) return;

		try {
			setStage("creating-session");
			const { data: sessionData } = await createUploadSession({
				variables: {
					title: title || file.name,
					mimeType: file.type,
					declaredSizeBytes: file.size,
				},
			});
			const session = sessionData?.createUploadSession;
			if (!session) throw new Error("Could not create an upload session");

			setStage("uploading");
			setUploadPercent(0);
			await uploadWithProgress(session.uploadUrl, file, setUploadPercent);

			setStage("confirming");
			const { data: confirmData } = await confirmUpload({
				variables: {
					uploadSessionId: session.id,
					options: optionsList,
					audioVoice: wantsAudio ? voice : undefined,
				},
			});
			const media = confirmData?.confirmUpload;
			if (!media) throw new Error("Could not start processing");

			toast.success("Upload started");
			navigate(`/media/${media.id}`);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Upload failed. Try again.",
			);
			setStage("idle");
		}
	}

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-8 md:px-10">
			<PageHeader
				title="Create"
				description="Turn a video or audio file into a transcript, summary, and more."
			/>

			<StepIndicator
				steps={steps}
				currentId={activeStepId}
				furthestIndex={furthestIndex}
				onJump={busy ? () => {} : goTo}
			/>

			<Card>
				<CardContent className="min-h-[320px] pt-5">
					{activeStepId === "upload" && (
						<div className="flex flex-col gap-5">
							<Dropzone
								file={file}
								onSelect={handleSelectFile}
								disabled={busy}
							/>
							{file && (
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="title">Title</Label>
									<Input
										id="title"
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										disabled={busy}
										required
									/>
								</div>
							)}
						</div>
					)}

					{activeStepId === "thumbnail" && file && (
						<ThumbnailStep
							fileName={file.name}
							mediaKind={file.type.startsWith("video/") ? "video" : "audio"}
						/>
					)}

					{activeStepId === "extract" && (
						<div className="flex flex-col gap-5">
							<div>
								<h3 className="font-medium text-sm">What should we extract?</h3>
								<p className="mt-1 text-muted-foreground text-sm">
									Transcript is always included. Pick anything else you want
									generated.
								</p>
							</div>
							<OptionsPanel
								selected={options}
								onChange={busy ? () => {} : setOptions}
							/>
							<CreditPreview options={optionsList} />
						</div>
					)}

					{activeStepId === "voice" && (
						<VoiceStep value={voice} onChange={setVoice} />
					)}
				</CardContent>
			</Card>

			{busy && (
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between text-sm">
						<span>{STAGE_LABEL[stage]}</span>
						{stage === "uploading" && <span>{uploadPercent}%</span>}
					</div>
					<Progress value={stage === "uploading" ? uploadPercent : 100} />
				</div>
			)}

			<div className="flex items-center justify-between">
				<Button
					type="button"
					variant="outline"
					onClick={back}
					disabled={busy || stepIndex === 0}
				>
					Back
				</Button>
				{isLastStep ? (
					<Button
						type="button"
						size="lg"
						onClick={handleSubmit}
						disabled={!file || busy}
					>
						{busy ? STAGE_LABEL[stage] : "Start processing"}
					</Button>
				) : (
					<Button type="button" onClick={next} disabled={busy || !canAdvance}>
						Next
					</Button>
				)}
			</div>
		</div>
	);
}
