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
				<ul key={summary.summaryType} className="flex flex-col gap-1">
					{summary.sentences.length > 0 ? (
						summary.sentences.map((sentence) => {
							const first = sentence.citedSegmentIndexes[0];
							return (
								<li key={sentence.sentenceIndex} className="flex gap-2.5">
									<span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
									{first == null ? (
										<span className="py-1 text-sm leading-relaxed">
											{sentence.text}
										</span>
									) : (
										<button
											type="button"
											onMouseEnter={() =>
												onHoverIndices(sentence.citedSegmentIndexes)
											}
											onMouseLeave={() => onHoverIndices([])}
											onClick={() => onSeekToIndex(first)}
											className="-mx-1.5 flex-1 cursor-pointer rounded-md px-1.5 py-1 text-left text-sm leading-relaxed transition-colors hover:bg-amber-500/15"
										>
											{sentence.text}
										</button>
									)}
								</li>
							);
						})
					) : (
						<li className="text-sm leading-relaxed">{summary.text}</li>
					)}
				</ul>
			))}
		</div>
	);
}
