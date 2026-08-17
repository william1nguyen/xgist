import { FileAudio, ImagePlay, Info } from "lucide-react";

export function ThumbnailStep({
	fileName,
	mediaKind,
}: {
	fileName: string;
	mediaKind: "video" | "audio";
}) {
	return (
		<div className="flex flex-col gap-5">
			<div>
				<h3 className="font-medium text-sm">Thumbnail</h3>
				<p className="mt-1 text-muted-foreground text-sm">
					Nothing to configure here — we take care of it automatically.
				</p>
			</div>

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
							? "A thumbnail will be generated automatically from a representative frame after upload."
							: "Embedded cover art will be used if present, otherwise a default image."}
					</p>
				</div>
			</div>

			<div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-muted-foreground text-xs">
				<Info className="mt-0.5 size-3.5 shrink-0" />
				Custom thumbnail upload isn't available yet — this step will show a live
				preview here once it is.
			</div>
		</div>
	);
}
