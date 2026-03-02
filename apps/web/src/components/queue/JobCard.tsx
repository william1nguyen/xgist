import { NavLink } from "react-router"
import type { QueueJob, VideoStatus } from "@repo/types"
import { computeCreditCost } from "@xgist/config"
import StatusBadge from "./StatusBadge"
import ProgressBar from "./ProgressBar"

type JobCardProps = {
  job: QueueJob
  status: VideoStatus
  progress: number | null
  currentStep: string | null
  onRetry: (jobId: string) => void
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return `${hours} hour${hours > 1 ? "s" : ""} ago`
}

function enabledOptionLabels(options: QueueJob["video"]["options"]): string[] {
  const labels: Record<keyof typeof options, string> = {
    transcribe: "Transcribe",
    summarize: "Summarize",
    extractKeywords: "Keywords",
    extractMainIdeas: "Main Ideas",
    generateNotes: "Notes",
    generateAudioSummary: "Audio Summary",
  }
  return (Object.keys(options) as Array<keyof typeof options>)
    .filter((k) => options[k])
    .map((k) => labels[k])
}

export default function JobCard({ job, status, progress, currentStep, onRetry }: JobCardProps) {
  const isProcessing = status === "processing"
  const isCompleted = status === "completed"
  const isFailed = status === "failed"
  const creditCost = computeCreditCost(job.video.options)
  const optionLabels = enabledOptionLabels(job.video.options)

  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl border bg-card px-4 py-4 transition-colors",
        isProcessing ? "border-blue-500/40" : "border-border",
        isFailed ? "bg-red-500/5" : "",
      ].join(" ")}
    >
      {isProcessing && (
        <div className="absolute inset-y-0 left-0 w-0.5 animate-pulse bg-blue-500" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <p className="truncate text-sm font-medium">{job.video.title}</p>
          </div>
          <p className="text-xs text-muted-foreground">{optionLabels.join(" · ")}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {isCompleted && (
            <NavLink
              to={`/video/${job.video.id}`}
              className="text-xs font-medium text-primary hover:underline"
            >
              View →
            </NavLink>
          )}
          {isFailed && (
            <button
              type="button"
              onClick={() => onRetry(job.jobId)}
              className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted"
            >
              Retry
            </button>
          )}
          <span className="text-xs text-muted-foreground">{creditCost}c used</span>
        </div>
      </div>

      {isProcessing && (
        <div className="mt-3">
          <ProgressBar progress={progress} currentStep={currentStep} />
        </div>
      )}

      {isFailed && (
        <p className="mt-2 text-xs text-red-400">Processing failed. You can retry this job.</p>
      )}

      <p className="mt-2 text-right text-xs text-muted-foreground">
        {timeAgo(new Date(job.video.createdAt))}
      </p>
    </div>
  )
}
