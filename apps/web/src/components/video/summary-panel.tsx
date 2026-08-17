import type { ContentDetailQuery } from "@/graphql/generated/graphql";

type Summary = ContentDetailQuery["contentDetail"]["summaries"][number];

type SummaryPanelProps = {
	summaries: Summary[];
	onHoverIndices: (indices: number[]) => void;
	onSeekToIndex: (index: number) => void;
};

export function SummaryPanel({
	summaries,
	onHoverIndices,
	onSeekToIndex,
}: SummaryPanelProps) {
	if (summaries.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">No summary available yet.</p>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			{summaries.map((summary) => (
				<div key={summary.summaryType} className="flex flex-col gap-2">
					{summary.sentences.length > 0 ? (
						<p className="text-sm leading-relaxed">
							{summary.sentences.map((sentence) => {
								const first = sentence.citedSegmentIndexes[0];
								if (first == null) {
									return (
										<span key={sentence.sentenceIndex}>{sentence.text} </span>
									);
								}
								return (
									<button
										key={sentence.sentenceIndex}
										type="button"
										onMouseEnter={() =>
											onHoverIndices(sentence.citedSegmentIndexes)
										}
										onMouseLeave={() => onHoverIndices([])}
										onClick={() => onSeekToIndex(first)}
										className="inline cursor-pointer rounded border-0 bg-transparent p-0 px-0.5 text-left text-inherit transition-colors hover:bg-amber-500/15"
									>
										{sentence.text}{" "}
									</button>
								);
							})}
						</p>
					) : (
						<p className="text-sm leading-relaxed">{summary.text}</p>
					)}
				</div>
			))}
		</div>
	);
}
