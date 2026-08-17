import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { ProcessingOptionId } from "@/lib/constants";
import { uploadWithProgress } from "@/lib/upload";

type Stage = "idle" | "creating-session" | "uploading" | "confirming";

const STAGE_LABEL: Record<Stage, string> = {
	idle: "",
	"creating-session": "Preparing upload…",
	uploading: "Uploading…",
	confirming: "Starting processing…",
};

export default function UploadPage() {
	const navigate = useNavigate();
	const [file, setFile] = useState<File | null>(null);
	const [title, setTitle] = useState("");
	const [options, setOptions] = useState<Set<ProcessingOptionId>>(
		new Set(["transcribe"]),
	);
	const [stage, setStage] = useState<Stage>("idle");
	const [uploadPercent, setUploadPercent] = useState(0);

	const [createUploadSession] = useCreateUploadSessionMutation();
	const [confirmUpload] = useConfirmUploadMutation();

	const busy = stage !== "idle";
	const optionsList = Array.from(options);

	function handleSelectFile(next: File | null) {
		setFile(next);
		if (next && !title) setTitle(next.name.replace(/\.[^/.]+$/, ""));
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
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
		<div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 md:px-6">
			<h1 className="font-semibold text-xl">Upload media</h1>
			<form onSubmit={handleSubmit} className="flex flex-col gap-6">
				<Dropzone file={file} onSelect={handleSelectFile} disabled={busy} />

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

				{file && (
					<Card>
						<CardHeader>
							<CardTitle>What should we generate?</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<OptionsPanel
								selected={options}
								onChange={busy ? () => {} : setOptions}
							/>
							<CreditPreview options={optionsList} />
						</CardContent>
					</Card>
				)}

				{busy && (
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between text-sm">
							<span>{STAGE_LABEL[stage]}</span>
							{stage === "uploading" && <span>{uploadPercent}%</span>}
						</div>
						<Progress value={stage === "uploading" ? uploadPercent : 100} />
					</div>
				)}

				<Button type="submit" disabled={!file || busy} size="lg">
					{busy ? STAGE_LABEL[stage] : "Start processing"}
				</Button>
			</form>
		</div>
	);
}
