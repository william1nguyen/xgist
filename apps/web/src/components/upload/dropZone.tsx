import { Upload } from "lucide-react";
import { useRef, useState } from "react";

const ALLOWED_TYPES = new Set([
	"video/mp4",
	"video/quicktime",
	"video/x-matroska",
	"video/webm",
	"audio/mpeg",
	"audio/wav",
	"audio/x-wav",
	"audio/mp4",
	"audio/m4a",
	"audio/x-m4a",
]);

const MAX_SIZE = 500 * 1024 * 1024;

type DropZoneProps = {
	onFile: (file: File) => void;
	onError: (error: string) => void;
	error: string | null;
};

export default function DropZone({ onFile, onError, error }: DropZoneProps) {
	const [dragging, setDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const validate = (file: File): string | null => {
		if (!ALLOWED_TYPES.has(file.type))
			return "Unsupported format. Use MP4, MOV, MKV, WebM, MP3, WAV, or M4A.";
		if (file.size > MAX_SIZE) return "File exceeds 500MB limit.";
		return null;
	};

	const handleFile = (file: File) => {
		const err = validate(file);
		if (err) onError(err);
		else onFile(file);
	};

	const onDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragging(false);
		const file = e.dataTransfer.files[0];
		if (file) handleFile(file);
	};

	const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) handleFile(file);
	};

	return (
		<div className="space-y-2">
			<div
				onClick={() => inputRef.current?.click()}
				onDragOver={(e) => {
					e.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={onDrop}
				className={[
					"relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 transition-all",
					dragging
						? "border-primary bg-primary/5"
						: "border-border hover:border-primary/50 hover:bg-muted/30",
				].join(" ")}
			>
				<Upload className="h-8 w-8 text-muted-foreground" />
				<div className="text-center">
					<p className="font-medium">Drop video or audio here</p>
					<p className="text-muted-foreground text-sm">or click to browse</p>
				</div>
				<p className="text-muted-foreground text-xs">
					MP4 · MOV · MKV · WebM · MP3 · WAV · M4A · max 500MB
				</p>
				<input
					ref={inputRef}
					type="file"
					accept="video/mp4,video/quicktime,video/x-matroska,video/webm,audio/mpeg,audio/wav,audio/mp4,audio/m4a,audio/x-m4a"
					className="hidden"
					onChange={onInputChange}
				/>
			</div>
			{error && <p className="text-destructive text-sm">{error}</p>}
		</div>
	);
}
