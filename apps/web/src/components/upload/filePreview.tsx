import { FileAudio, FileVideo, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type FilePreviewProps = {
	file: File;
	onRemove: () => void;
};

function formatBytes(bytes: number): string {
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isVideoType(type: string): boolean {
	return type.startsWith("video/");
}

export default function FilePreview({ file, onRemove }: FilePreviewProps) {
	const Icon = isVideoType(file.type) ? FileVideo : FileAudio;

	return (
		<div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
			<Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-sm">{file.name}</p>
				<p className="text-muted-foreground text-xs">
					{formatBytes(file.size)}
				</p>
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7 shrink-0"
				onClick={onRemove}
			>
				<X className="h-4 w-4" />
			</Button>
		</div>
	);
}
