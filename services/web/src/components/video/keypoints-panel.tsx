import { useTranslation } from "react-i18next";
import type { ContentDetailQuery } from "@/graphql/generated/graphql";

type Keypoint = ContentDetailQuery["contentDetail"]["keypoints"][number];

type KeypointsPanelProps = {
	keypoints: Keypoint[];
	onSeekToIndex: (index: number) => void;
};

export function KeypointsPanel({
	keypoints,
	onSeekToIndex,
}: KeypointsPanelProps) {
	const { t } = useTranslation();
	if (keypoints.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">{t("video.noKeypoints")}</p>
		);
	}

	const sorted = [...keypoints].sort((a, b) => a.pointIndex - b.pointIndex);

	return (
		<ol className="flex flex-col gap-2">
			{sorted.map((kp) => (
				<li key={kp.pointIndex}>
					<button
						type="button"
						onClick={() => onSeekToIndex(kp.startSegment)}
						className="w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
					>
						<span className="mr-2 text-muted-foreground">
							{kp.pointIndex + 1}.
						</span>
						{kp.text}
					</button>
				</li>
			))}
		</ol>
	);
}
