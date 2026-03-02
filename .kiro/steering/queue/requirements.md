# Spec: Queue / Processing Screen

## Route
`/queue` — protected route

## Requirements

### Functional
- [ ] List all jobs for current user (pending, processing, completed, failed)
- [ ] Auto-poll every 3s for jobs with status `pending` or `processing`
- [ ] Stop polling when all visible jobs are terminal (completed/failed)
- [ ] Show per-job info: title, status badge, options enabled, credit cost, time ago
- [ ] Progress indicator for `processing` jobs (step name: "Transcribing..." / "Summarizing..." etc.)
- [ ] On completed: "View" button → navigates to `/video/:id`
- [ ] On failed: "Retry" button (creates new job, re-deducts credits) + error message
- [ ] Empty state when no jobs exist → link to `/upload`

### Status Badges
- `pending` → gray "Waiting"
- `processing` → blue pulsing "Processing"
- `completed` → green "Done"
- `failed` → red "Failed"

## UI Design

### Layout
```
┌───────────────────────────────────────────────────┐
│  Processing Queue                    [+ New Upload]│
├───────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ ● Interview Recording.mp4                   │  │
│  │   Transcribe · Summarize · Keywords         │  │
│  │   ████████░░░░  Summarizing...     35c used │  │
│  │                              2 min ago      │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ ✓ Podcast Episode 12.mp3          [View →]  │  │
│  │   Transcribe · Summarize · Main Ideas       │  │
│  │   Completed                        55c used │  │
│  │                             10 min ago      │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ ✕ Meeting Notes.mp4           [Retry]       │  │
│  │   Transcription failed: timeout             │  │
│  │                              1 hour ago     │  │
│  └─────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
```

### Visual Style
- Cards with subtle border; processing card has animated left-border glow (blue pulse)
- Progress bar fills left-to-right with shimmer animation
- Step text ("Transcribing...", "Summarizing...") fades in/out as step changes
- Failed card has muted red tint on background
- "View" button is subtle arrow-link; "Retry" is outlined

## oRPC Endpoints

```ts
queue.list      // {} → { jobs: QueueJob[] }
video.getStatus // { videoId } → { status: VideoStatus, progress: number | null, currentStep: string | null }
```
