type AudioSummaryPlayerProps = {
  src: string
}

export default function AudioSummaryPlayer({ src }: AudioSummaryPlayerProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Audio Summary</p>
      <audio src={src} controls className="w-full h-8" />
    </div>
  )
}
