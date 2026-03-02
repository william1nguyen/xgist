import type { Summary, SummaryRef } from "@repo/types"

type SummaryPanelProps = {
  summary: Summary
  onHoverIndices: (indices: number[]) => void
  onSeekToIndex: (segmentIndex: number) => void
}

function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [text]
}

function refsForSentence(refs: SummaryRef[], sentenceIndex: number): number[] {
  return refs
    .filter((r) => r.sentenceIndex === sentenceIndex)
    .flatMap((r) => r.transcriptIndices)
}

export default function SummaryPanel({ summary, onHoverIndices, onSeekToIndex }: SummaryPanelProps) {
  const sentences = splitSentences(summary.summary)

  const handleSentenceClick = (sentenceIndex: number) => {
    const indices = refsForSentence(summary.refs, sentenceIndex)
    if (indices.length > 0) {
      onSeekToIndex(indices[0])
    }
  }

  return (
    <div className="space-y-6 overflow-y-auto pr-1">
      <div className="space-y-1">
        {sentences.map((sentence, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSentenceClick(i)}
            onMouseEnter={() => onHoverIndices(refsForSentence(summary.refs, i))}
            onMouseLeave={() => onHoverIndices([])}
            className="block w-full rounded px-2 py-1 text-left text-sm leading-relaxed hover:bg-muted/50 transition-colors"
          >
            {sentence}
          </button>
        ))}
      </div>

      {summary.mainIdeas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Main Ideas
          </p>
          <ol className="space-y-1.5 list-none">
            {summary.mainIdeas.map((idea, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="shrink-0 font-mono text-xs text-muted-foreground pt-0.5">
                  {i + 1}.
                </span>
                <span>{idea}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {summary.keywords.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Keywords
          </p>
          <div className="flex flex-wrap gap-1.5">
            {summary.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
