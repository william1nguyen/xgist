type ProgressBarProps = {
  progress: number | null
  currentStep: string | null
}

export default function ProgressBar({ progress, currentStep }: ProgressBarProps) {
  const pct = progress !== null ? Math.min(100, Math.max(0, progress)) : null

  return (
    <div className="space-y-1.5">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {pct !== null ? (
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        )}
      </div>
      {currentStep && (
        <p className="animate-in fade-in text-xs text-muted-foreground">{currentStep}</p>
      )}
    </div>
  )
}
