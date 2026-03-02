# Spec: Upload Form + AI Options

## Route
`/upload` — protected route (requires auth)

## Requirements

### Functional
- [ ] Accept video or audio file via drag-and-drop or file picker
- [ ] Validate file type (mp4, mov, mkv, webm, mp3, wav, m4a) and max size (500MB)
- [ ] Show file preview: name, size, duration (if detectable), type icon
- [ ] AI options selector with credit cost preview per option:
  - Transcribe (always on, required, 10 credits)
  - Summarize (+20 credits)
  - Extract Keywords (+5 credits)
  - Extract Main Ideas (+10 credits)
  - Generate Notes (+15 credits)
  - Generate Audio Summary (+30 credits)
- [ ] Show total credit cost dynamically as options are toggled
- [ ] Show user's current balance; warn if insufficient
- [ ] Confirm button disabled if: no file selected, or insufficient credits
- [ ] On confirm: POST multipart to `/api/video/upload` → redirect to `/queue`

### Error States
- File too large → inline error
- Unsupported format → inline error
- Insufficient credits → show top-up CTA linking to `/billing`
- Network error → retry button

## UI Design

### Layout
```
┌─────────────────────────────────────────────────────┐
│  Upload Media                          Balance: 120c │
├─────────────────────────────────────────────────────┤
│                                                     │
│   ┌─────────────────────────────────────────────┐  │
│   │                                             │  │
│   │       Drop video or audio here              │  │
│   │       or click to browse                    │  │
│   │                                             │  │
│   │       Supports: MP4, MOV, MP3, WAV          │  │
│   └─────────────────────────────────────────────┘  │
│                                                     │
│  AI Processing Options                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  ✓ Transcribe                      10 credits│  │
│  │  ✓ Summarize                       20 credits│  │
│  │  ✓ Extract Keywords                 5 credits│  │
│  │  □ Extract Main Ideas              10 credits│  │
│  │  □ Generate Notes                  15 credits│  │
│  │  □ Generate Audio Summary          30 credits│  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Total cost: 35 credits    [Your balance: 120c]     │
│                                                     │
│                      [Start Processing]             │
└─────────────────────────────────────────────────────┘
```

### Visual Style
- Dark theme; deep charcoal background (`#0f0f11`)
- Drop zone: dashed border with subtle glow on hover, animated gradient border on drag-over
- Option rows: toggle switches (not checkboxes), credit cost shown right-aligned in muted text
- Credit total: prominent, color shifts to amber when approaching balance, red when exceeded
- CTA button: full-width gradient, disabled state is clearly muted
- Smooth transitions on option toggle (credit total animates with count-up)

## oRPC Endpoint

```ts
video.upload // input: FormData (file + options) → { jobId, videoId, status: "pending" }
credits.getBalance // {} → { balance: number }
```
