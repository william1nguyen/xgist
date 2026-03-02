# Spec: Media Detail View

## Route
`/video/:id` — protected route; only accessible when `status === "completed"`

## Requirements

### Media Player
- [ ] Video: render `<video>` with controls
- [ ] Audio: render `<audio>` player with waveform visualization (or styled fallback)
- [ ] Expose `currentTime` to sync with transcript

### Transcript Panel
- [ ] List all segments sorted by `index`
- [ ] Format timestamps as `MM:SS` from `start` value
- [ ] Highlight the currently playing segment (based on `currentTime >= start && currentTime < end`)
- [ ] Auto-scroll transcript to keep active segment visible
- [ ] Clicking a segment → seek media to `segment.start`
- [ ] Segments referenced by a summary citation glow subtly when citation is hovered

### Summary Panel (tab: "Summary")
- [ ] Full summary text, split into sentences
- [ ] Each sentence: hovering highlights the transcript segments referenced by `summaryRefs`
- [ ] Clicking a summary sentence → auto-scroll transcript to first referenced segment
- [ ] Keywords displayed as pill tags
- [ ] Main ideas displayed as a numbered list
- [ ] Notes displayed as rendered Markdown (if present)
- [ ] Audio summary player (if `audioSummaryUrl` present): compact player strip

### UI Layout
```
┌───────────────────────────────────────────────────────────────┐
│  ← Back    Interview Recording.mp4          Keywords: ai, ml  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                  [ VIDEO PLAYER ]                       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────────────┐   │
│  │  Transcript          │  │  Summary  │  Notes  │  Audio  │  │
│  │                      │  │                              │  │
│  │  00:00  Hello and    │  │  The speaker discusses...    │  │
│  │ ▶00:05  welcome to   │  │  [hover → highlights segs]  │  │
│  │  00:12  today's talk │  │                              │  │
│  │  00:18  We'll cover  │  │  Main Ideas                  │  │
│  │         ...          │  │  1. First key point          │  │
│  │                      │  │  2. Second key point         │  │
│  │                      │  │                              │  │
│  │                      │  │  Keywords                    │  │
│  │                      │  │  [ai] [ml] [research]        │  │
│  └──────────────────────┘  └──────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

### Visual Style
- Split layout: transcript left (scrollable), summary right (tabbed)
- Active transcript segment: highlighted background with left accent bar
- Referenced segments (on citation hover): subtle amber glow
- Summary sentences: each has a discrete hover zone; on hover, related transcript items glow
- Keywords: monospace pill tags, slightly tinted
- Smooth scroll behavior on seek/citation click
- Mobile: stack vertically (player → tabs: transcript | summary)

## oRPC Endpoints

```ts
video.getDetail // { videoId } → VideoDetail (video + transcript + summary)
```
