import { useState } from "react"
import { NavLink, useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { orpc } from "@/utils/orpc"
import MediaPlayer from "@/components/video/MediaPlayer"
import TranscriptPanel from "@/components/video/TranscriptPanel"
import SummaryPanel from "@/components/video/SummaryPanel"
import NotesPanel from "@/components/video/NotesPanel"
import AudioSummaryPlayer from "@/components/video/AudioSummaryPlayer"

type Tab = "summary" | "notes" | "audio"

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [currentTime, setCurrentTime] = useState(0)
  const [seekTo, setSeekTo] = useState<number | null>(null)
  const [hoveredIndices, setHoveredIndices] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState<Tab>("summary")

  const { data, isLoading, isError } = useQuery(
    orpc.video.getDetail.queryOptions({ input: { videoId: id ?? "" } }),
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Video not found or not ready.</p>
        <NavLink to="/queue" className="text-sm text-primary hover:underline">
          ← Back to queue
        </NavLink>
      </div>
    )
  }

  const { video, transcript, summary } = data

  const handleSeekToIndex = (segmentIndex: number) => {
    const seg = transcript.find((s) => s.index === segmentIndex)
    if (seg) setSeekTo(seg.start)
  }

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "summary", label: "Summary", show: summary !== null },
    { id: "notes", label: "Notes", show: summary?.notes !== null && summary?.notes !== undefined },
    { id: "audio", label: "Audio", show: summary?.audioSummaryUrl !== null && summary?.audioSummaryUrl !== undefined },
  ]

  const visibleTabs = tabs.filter((t) => t.show)

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden px-4 py-6 md:px-6">
      <div className="flex items-center gap-3">
        <NavLink to="/queue" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </NavLink>
        <h1 className="truncate text-base font-semibold">{video.title}</h1>
        {summary && summary.keywords.length > 0 && (
          <div className="ml-auto hidden items-center gap-1 md:flex">
            <span className="text-xs text-muted-foreground">Keywords:</span>
            {summary.keywords.slice(0, 4).map((kw) => (
              <span key={kw} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>

      <MediaPlayer
        src={video.mediaUrl}
        mediaType={video.mediaType}
        onTimeUpdate={setCurrentTime}
        seekTo={seekTo}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex min-h-0 flex-col rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5">
            <p className="text-sm font-medium">Transcript</p>
          </div>
          <div className="min-h-0 flex-1 p-3">
            <TranscriptPanel
              segments={transcript}
              currentTime={currentTime}
              hoveredIndices={hoveredIndices}
              onSeek={(t) => setSeekTo(t)}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-xl border border-border bg-card">
          {visibleTabs.length > 0 && (
            <div className="flex border-b border-border">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "px-4 py-2.5 text-sm transition-colors",
                    activeTab === tab.id
                      ? "border-b-2 border-primary font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className="min-h-0 flex-1 p-4">
            {activeTab === "summary" && summary && (
              <SummaryPanel
                summary={summary}
                onHoverIndices={setHoveredIndices}
                onSeekToIndex={handleSeekToIndex}
              />
            )}
            {activeTab === "notes" && summary?.notes && (
              <NotesPanel notes={summary.notes} />
            )}
            {activeTab === "audio" && summary?.audioSummaryUrl && (
              <AudioSummaryPlayer src={summary.audioSummaryUrl} />
            )}
            {visibleTabs.length === 0 && (
              <p className="text-sm text-muted-foreground">No AI results available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
