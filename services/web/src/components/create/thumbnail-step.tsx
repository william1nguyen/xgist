import { FileAudio, ImagePlay, Info, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	ACCEPTED_THUMBNAIL_MIME_TYPES,
	MAX_THUMBNAIL_UPLOAD_BYTES,
} from "@/lib/constants";
import { formatBytes } from "@/lib/format";

type ThumbnailStepProps = {
	fileName: string;
	mediaKind: "video" | "audio";
	thumbnailFile: File | null;
	onThumbnailFileChange: (file: File | null) => void;
};

export function ThumbnailStep({
	fileName,
	mediaKind,
	thumbnailFile,
	onThumbnailFileChange,
}: ThumbnailStepProps) {
	const { t } = useTranslation();
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!thumbnailFile) {
			setPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(thumbnailFile);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [thumbnailFile]);

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;

		if (
			!ACCEPTED_THUMBNAIL_MIME_TYPES.includes(
				file.type as (typeof ACCEPTED_THUMBNAIL_MIME_TYPES)[number],
			)
		) {
			setError(t("thumbnailStep.unsupportedType"));
			return;
		}
		if (file.size > MAX_THUMBNAIL_UPLOAD_BYTES) {
			setError(
				t("thumbnailStep.tooLarge", {
					max: formatBytes(MAX_THUMBNAIL_UPLOAD_BYTES),
				}),
			);
			return;
		}
		setError(null);
		onThumbnailFileChange(file);
	}

	return (
		<div className="flex flex-col gap-5">
			<div>
				<h3 className="font-medium text-sm">{t("thumbnailStep.title")}</h3>
				<p className="mt-1 text-muted-foreground text-sm">
					{t("thumbnailStep.description")}
				</p>
			</div>

			{previewUrl ? (
				<div className="relative overflow-hidden rounded-xl border border-border">
					<img
						src={previewUrl}
						alt={t("thumbnailStep.customPreviewAlt")}
						className="aspect-video w-full object-cover"
					/>
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="absolute top-2 right-2 bg-background/90"
						onClick={() => onThumbnailFileChange(null)}
						aria-label={t("thumbnailStep.removeCustom")}
					>
						<X className="size-4" />
					</Button>
				</div>
			) : (
				<div className="flex items-center gap-4 rounded-xl border border-border border-dashed bg-muted/30 p-6">
					<div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
						{mediaKind === "video" ? (
							<ImagePlay className="size-6" />
						) : (
							<FileAudio className="size-6" />
						)}
					</div>
					<div className="min-w-0">
						<p className="truncate font-medium text-sm">{fileName}</p>
						<p className="mt-0.5 text-muted-foreground text-sm">
							{mediaKind === "video"
								? t("thumbnailStep.videoDescription")
								: t("thumbnailStep.audioDescription")}
						</p>
					</div>
				</div>
			)}

			<div>
				<input
					ref={inputRef}
					type="file"
					accept={ACCEPTED_THUMBNAIL_MIME_TYPES.join(",")}
					onChange={handleFileChange}
					className="hidden"
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => inputRef.current?.click()}
				>
					<Upload className="size-3.5" />
					{previewUrl
						? t("thumbnailStep.replaceCustom")
						: t("thumbnailStep.uploadCustom")}
				</Button>
				{error && <p className="mt-2 text-destructive text-xs">{error}</p>}
			</div>

			{!previewUrl && (
				<div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-muted-foreground text-xs">
					<Info className="mt-0.5 size-3.5 shrink-0" />
					{t("thumbnailStep.note")}
				</div>
			)}
		</div>
	);
}
