import { useEffect, useState } from "react"
import { NavLink } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import type { QueueJob, VideoStatus } from "@repo/types"
import { orpc, client } from "@/utils/orpc"
import JobCard from "@/components/queue/JobCard"

type JobStatus = {
  status: VideoStatus
  progress: number | null
  currentStep: string | null
}

const TERMINAL: Set<VideoStatus> = new Set(["completed", "failed"])

export default function QueuePage() {
  const { data, refetch } = useQuery(orpc.queue.list.queryOptions({ input: {} }))
  const jobs = data?.jobs ?? []

  const [statusMap, setStatusMap] = useState<Record<string, JobStatus>>({})

  const hasActive = jobs.some((j) => !TERMINAL.has(statusMap[j.video.id]?.status ?? j.video.status))

  useEffect(() => {
    if (!hasActive) return
    const id = setInterval(async () => {
      await refetch()
      const active = jobs.filter((j) => !TERMINAL.has(statusMap[j.video.id]?.status ?? j.video.status))
      const results = await Promise.allSettled(
        active.map((j) => client.video.getStatus({ videoId: j.video.id })),
      )
      setStatusMap((prev) => {
        const next = { ...prev }
        active.forEach((j, i) => {
          const r = results[i]
          if (r.status === "fulfilled") {
            next[j.video.id] = r.value
          }
        })
        return next
      })
    }, 3000)
    return () => clearInterval(id)
  }, [hasActive, jobs, refetch, statusMap])

  const handleRetry = async (videoId: string) => {
    try {
      await client.video.retry({ videoId })
      await refetch()
      toast.success("Job re-queued")
    } catch {
      toast.error("Retry failed — check your credit balance")
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-muted-foreground">No jobs yet.</p>
        <NavLink to="/upload" className="text-sm font-medium text-primary hover:underline">
          Upload your first file →
        </NavLink>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Processing Queue</h1>
        <NavLink
          to="/upload"
          className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          + New Upload
        </NavLink>
      </div>

      <div className="space-y-3">
        {jobs.map((job: QueueJob) => {
          const liveStatus = statusMap[job.video.id]
          const status = liveStatus?.status ?? job.video.status
          const progress = liveStatus?.progress ?? null
          const currentStep = liveStatus?.currentStep ?? null

          return (
            <JobCard
              key={job.jobId}
              job={job}
              status={status}
              progress={progress}
              currentStep={currentStep}
              onRetry={handleRetry}
            />
          )
        })}
      </div>
    </div>
  )
}
