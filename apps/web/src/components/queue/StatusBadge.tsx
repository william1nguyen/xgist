import type { VideoStatus } from "@repo/types"

type StatusBadgeProps = {
  status: VideoStatus
}

const CONFIG: Record<VideoStatus, { label: string; className: string }> = {
  pending: {
    label: "Waiting",
    className: "bg-muted text-muted-foreground",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-500/15 text-blue-400 animate-pulse",
  },
  completed: {
    label: "Done",
    className: "bg-green-500/15 text-green-400",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/15 text-red-400",
  },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = CONFIG[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
