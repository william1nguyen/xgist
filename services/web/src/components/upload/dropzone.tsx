import type { TFunction } from "i18next";
import { FileAudio, UploadCloud, X } from "lucide-react";
import { type DragEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	ACCEPTED_EXTENSIONS,
	ACCEPTED_MIME_TYPES,
	MAX_UPLOAD_BYTES,
} from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

type DropzoneProps = {
	file: File | null;
	onSelect: (file: File | null) => void;
	disabled?: boolean;
};

function validate(file: File, t: TFunction): string | null {
	const isAcceptedType =
		ACCEPTED_MIME_TYPES.includes(
			file.type as (typeof ACCEPTED_MIME_TYPES)[number],
		) ||
		ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
	if (!isAcceptedType) {
		return t("dropzone.unsupportedType", {
			extensions: ACCEPTED_EXTENSIONS.join(", "),
		});
	}
	if (file.size > MAX_UPLOAD_BYTES) {
		return t("dropzone.tooLarge", { size: formatBytes(MAX_UPLOAD_BYTES) });
	}
	if (file.size === 0) {
		return t("dropzone.empty");
	}
	return null;
}

export function Dropzone({ file, onSelect, disabled }: DropzoneProps) {
	const { t } = useTranslation();
	const [dragOver, setDragOver] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	function handleFiles(files: FileList | null) {
		const picked = files?.[0];
		if (!picked) return;
		const validationError = validate(picked, t);
		if (validationError) {
			setError(validationError);
			onSelect(null);
			return;
		}
		setError(null);
		onSelect(picked);
	}

	function handleDrop(e: DragEvent<HTMLButtonElement>) {
		e.preventDefault();
		setDragOver(false);
		if (disabled) return;
		handleFiles(e.dataTransfer.files);
	}

	if (file) {
		return (
			<div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<FileAudio className="size-5" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium text-sm">{file.name}</p>
					<p className="text-muted-foreground text-xs">
						{formatBytes(file.size)}
					</p>
				</div>
				{!disabled && (
					<button
						type="button"
						onClick={() => {
							onSelect(null);
							if (inputRef.current) inputRef.current.value = "";
						}}
						className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
					>
						<X className="size-4" />
					</button>
				)}
			</div>
		);
	}

	return (
		<div>
			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				onDragOver={(e) => {
					e.preventDefault();
					setDragOver(true);
				}}
				onDragLeave={() => setDragOver(false)}
				onDrop={handleDrop}
				className={cn(
					"flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
					dragOver
						? "border-primary bg-primary/5"
						: "border-border hover:border-primary/40",
				)}
			>
				<UploadCloud className="size-8 text-muted-foreground" />
				<p className="font-medium text-sm">{t("dropzone.dragDrop")}</p>
				<p className="text-muted-foreground text-xs">
					{t("dropzone.acceptedUpTo", {
						extensions: ACCEPTED_EXTENSIONS.join(", "),
						size: formatBytes(MAX_UPLOAD_BYTES),
					})}
				</p>
			</button>
			<input
				ref={inputRef}
				type="file"
				accept={ACCEPTED_EXTENSIONS.join(",")}
				className="hidden"
				onChange={(e) => handleFiles(e.target.files)}
			/>
			{error && <p className="mt-2 text-destructive text-sm">{error}</p>}
		</div>
	);
}
