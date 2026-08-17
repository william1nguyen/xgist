import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { AudioSummaryPanel } from "@/components/video/audio-summary-panel";
import {
	useContentDetailQuery,
	useMediaDetailQuery,
} from "@/graphql/generated/graphql";

export default function MediaAudioPage() {
	const { t } = useTranslation();
	const { id: rawId } = useParams<{ id: string }>();
	const id = rawId ?? "";

	const { data: mediaData, loading: mediaLoading } = useMediaDetailQuery({
		variables: { id },
		skip: !id,
	});
	const { data: contentData, loading: contentLoading } = useContentDetailQuery({
		variables: { mediaId: id },
		skip: !id,
	});

	const media = mediaData?.mediaDetail;
	const audios = contentData?.contentDetail.summaryAudios ?? [];

	if ((mediaLoading || contentLoading) && !media) {
		return (
			<div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6 md:px-6 lg:px-8">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-32 w-full" />
			</div>
		);
	}

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6 md:px-6 lg:px-8">
			<div className="flex items-center gap-3">
				<Link
					to={`/media/${id}`}
					className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					aria-label={t("mediaDetail.backToMedia")}
				>
					<ArrowLeft className="size-4" />
				</Link>
				<h1 className="truncate font-semibold text-xl tracking-tight">
					{media?.title ?? t("mediaDetail.listenToAudio")}
				</h1>
			</div>

			<AudioSummaryPanel audios={audios} />
		</div>
	);
}
