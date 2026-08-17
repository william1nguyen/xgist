import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { MediaCard } from "@/components/media/media-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	type MediaListQuery,
	useMediaListQuery,
} from "@/graphql/generated/graphql";

type MediaItem = MediaListQuery["mediaList"]["items"][number];

const RECOMMENDED_COUNT = 10;

// No ranking signal exists yet (see hermes's schema.graphqls note next to
// mediaList) — this shuffles the caller's own recent media as a
// placeholder "recommended" shelf until a real endpoint lands.
function shuffled<T>(items: T[]): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

export function RecommendedMedia({ excludeId }: { excludeId: string }) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { data, loading } = useMediaListQuery({
		variables: { pageSize: 30 },
		fetchPolicy: "cache-and-network",
	});

	const items = useMemo(() => {
		const pool = (data?.mediaList.items ?? []).filter(
			(item) => item.id !== excludeId && item.status === "COMPLETED",
		);
		return shuffled(pool).slice(0, RECOMMENDED_COUNT);
	}, [data, excludeId]);

	function handleOpen(media: MediaItem) {
		navigate(`/media/${media.id}`);
	}

	if (!loading && items.length === 0) return null;

	return (
		<section className="flex flex-col gap-3">
			<h2 className="font-medium text-base">{t("mediaDetail.recommended")}</h2>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{loading && items.length === 0
					? Array.from({ length: 5 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered
							<Skeleton key={i} className="h-40" />
						))
					: items.map((item) => (
							<MediaCard key={item.id} media={item} onOpen={handleOpen} />
						))}
			</div>
		</section>
	);
}
