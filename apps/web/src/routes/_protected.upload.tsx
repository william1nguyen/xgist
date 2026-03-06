import type { ProcessingOptions } from "@repo/types";
import { useQuery } from "@tanstack/react-query";
import { computeCreditCost } from "@xgist/config";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import CreditSummary from "@/components/upload/creditSummary";
import DropZone from "@/components/upload/dropZone";
import FilePreview from "@/components/upload/filePreview";
import OptionsPanel from "@/components/upload/optionsPanel";
import { client, orpc } from "@/utils/orpc";

const DEFAULT_OPTIONS: ProcessingOptions = {
	transcribe: true,
	summarize: true,
	extractKeywords: true,
	extractMainIdeas: false,
	generateNotes: false,
	generateAudioSummary: false,
};

function detectMediaType(file: File): "video" | "audio" {
	return file.type.startsWith("video/") ? "video" : "audio";
}

export default function UploadPage() {
	const navigate = useNavigate();
	const [file, setFile] = useState<File | null>(null);
	const [fileError, setFileError] = useState<string | null>(null);
	const [options, setOptions] = useState<ProcessingOptions>(DEFAULT_OPTIONS);
	const [uploading, setUploading] = useState(false);

	const { data: balanceData } = useQuery(
		orpc.credits.getBalance.queryOptions({ input: {} }),
	);
	const balance = balanceData?.balance ?? 0;
	const totalCost = computeCreditCost(options);
	const insufficient = totalCost > balance;

	const handleFile = (f: File) => {
		setFileError(null);
		setFile(f);
	};

	const handleDropError = (err: string) => {
		setFileError(err);
		setFile(null);
	};

	const handleSubmit = async () => {
		if (!file) return;
		setUploading(true);
		try {
			const { uploadUrl, publicUrl } = await client.video.getUploadUrl({
				filename: file.name,
				mimeType: file.type,
			});

			const putRes = await fetch(uploadUrl, {
				method: "PUT",
				body: file,
				headers: { "Content-Type": file.type },
			});

			if (!putRes.ok) {
				throw new Error("Upload to storage failed");
			}

			await client.video.upload({
				title: file.name,
				mediaType: detectMediaType(file),
				mimeType: file.type,
				fileSize: file.size,
				mediaUrl: publicUrl,
				options,
			});

			navigate("/queue");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Upload failed";
			toast.error(message, {
				action: {
					label: "Retry",
					onClick: handleSubmit,
				},
			});
		} finally {
			setUploading(false);
		}
	};

	const canSubmit = file !== null && !insufficient && !uploading;

	return (
		<div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
			<div className="flex items-center justify-between">
				<h1 className="font-semibold text-xl">Upload Media</h1>
				<span className="text-muted-foreground text-sm">
					Balance: {balance}c
				</span>
			</div>

			{file ? (
				<FilePreview file={file} onRemove={() => setFile(null)} />
			) : (
				<DropZone
					onFile={handleFile}
					onError={handleDropError}
					error={fileError}
				/>
			)}

			<OptionsPanel options={options} onChange={setOptions} />

			<CreditSummary totalCost={totalCost} balance={balance} />

			<Button className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
				{uploading ? "Uploading..." : "Start Processing"}
			</Button>
		</div>
	);
}
