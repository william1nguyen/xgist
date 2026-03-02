# Architecture

## System Overview

```
┌─────────┐   upload file   ┌──────────────┐   Redis Stream    ┌──────────────┐
│  React  │ ─────────────▶  │   Fastify    │ ─────────────────▶│  Python AI   │
│  Web    │                 │   + oRPC     │                   │   Worker     │
│  App    │ ◀───────────── │   + Drizzle  │ ◀─────────────────│  (Whisper +  │
│         │   poll status   │   + MinIO    │   Redis Stream    │   Gemini)    │
└─────────┘                 └──────────────┘                   └──────────────┘
                                   │                                   │
                              PostgreSQL                            MinIO
                              (via Docker)                    (audio summaries)
```

## Upload & Processing Flow

1. Client uploads file → Fastify receives multipart
2. Fastify creates `videos` DB record (`status: "pending"`)
3. Fastify uploads file to MinIO bucket `media` → gets public URL
4. Fastify deducts credits atomically (fail if insufficient)
5. Fastify publishes job to Redis Stream `stream:jobs`
6. Returns `{ jobId, videoId, status: "pending" }` to client

## AI Worker Flow

1. Worker consumes `stream:jobs` via XREADGROUP (consumer group: `workers`)
2. Downloads media from MinIO public URL
3. Runs Whisper → timestamped transcript segments
4. Runs Gemini calls in parallel based on `options`:
   - summarize → summary text + citation refs
   - extractKeywords → string[]
   - extractMainIdeas → string[]
   - generateNotes → markdown string
   - generateAudioSummary → TTS → upload to MinIO `summaries` bucket
5. Publishes result to Redis Stream `stream:results`

## Result Ingestion Flow

1. Fastify background consumer reads `stream:results` (group: `server`)
2. Saves transcript segments, summary, refs to DB
3. Updates `videos.status` to `"completed"` or `"failed"`

## Client Polling

- Client polls `GET /api/video/:id/status` every 3s
- Backend returns `{ status, progress }`
- On `"completed"`: navigate to `/video/:id`
- On `"failed"`: show error with retry option

## Redis Stream Schemas

### `stream:jobs` payload
```json
{
  "jobId": "uuid",
  "videoId": "uuid",
  "userId": "uuid",
  "mediaUrl": "https://minio.host/media/file.mp4",
  "mediaType": "video | audio",
  "options": {
    "transcribe": true,
    "summarize": true,
    "extractKeywords": true,
    "extractMainIdeas": false,
    "generateNotes": false,
    "generateAudioSummary": false
  }
}
```

### `stream:results` payload
```json
{
  "jobId": "uuid",
  "videoId": "uuid",
  "status": "completed | failed",
  "error": null,
  "transcript": [{ "start": 0.0, "end": 2.4, "text": "Hello world" }],
  "summary": "string | null",
  "summaryRefs": [{ "sentenceIndex": 0, "transcriptIndices": [2, 3] }],
  "keywords": ["string"],
  "mainIdeas": ["string"],
  "notes": "string | null",
  "audioSummaryUrl": "string | null"
}
```

## Database Schema (Drizzle, PostgreSQL)

```
users               ← managed by Better Auth
videos              (id, userId, title, status, mediaUrl, mediaType, options, createdAt)
transcript_segments (id, videoId, index, start, end, text)
summaries           (id, videoId, summary, keywords[], mainIdeas[], notes, audioSummaryUrl)
summary_refs        (id, summaryId, sentenceIndex, transcriptIndices[])
credits             (id, userId, balance, updatedAt)
credit_transactions (id, userId, delta, reason, metadata, createdAt)
```

## MinIO Buckets

| Bucket | Content | Access |
|--------|---------|--------|
| `media` | User-uploaded video/audio | Public read |
| `summaries` | Generated TTS audio | Public read |

## Polar Integration (Sandbox)

- Webhook endpoint: `POST /webhooks/polar`
- On `order.created`: parse product → credit amount → `addCredits()`
- Products defined in Polar sandbox dashboard
- Checkout URL generated via Polar API on demand

## Credit Deduction (Atomic)

```ts
// packages/config/src/credits.ts
export const CREDIT_COSTS = {
  transcribe: 10,
  summarize: 20,
  extractKeywords: 5,
  extractMainIdeas: 10,
  generateNotes: 15,
  generateAudioSummary: 30,
}
```

Deduction happens in a DB transaction before job is enqueued. If balance is insufficient, return error immediately — no job is created.
