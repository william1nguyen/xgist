import { FileAudio, ImagePlay, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ThumbnailStep({
	fileName,
	mediaKind,
}: {
	fileName: string;
	mediaKind: "video" | "audio";
}) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col gap-5">
			<div>
				<h3 className="font-medium text-sm">{t("thumbnailStep.title")}</h3>
				<p className="mt-1 text-muted-foreground text-sm">
					{t("thumbnailStep.description")}
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
							? t("thumbnailStep.videoDescription")
							: t("thumbnailStep.audioDescription")}
					</p>
				</div>
			</div>

			<div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-muted-foreground text-xs">
				<Info className="mt-0.5 size-3.5 shrink-0" />
				{t("thumbnailStep.note")}
			</div>
		</div>
	);
}
