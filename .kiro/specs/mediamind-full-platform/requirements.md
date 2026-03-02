# Requirements Document

## Introduction

MediaMind is a video/audio transcription and AI summarization platform. Users upload media files (video or audio), the system transcribes them via Whisper, then runs configurable AI processing (summarize, extract keywords, extract main ideas, generate notes, generate audio summary) via Gemini. Results are viewable with a synced transcript player, citation highlights, and AI insights. The platform includes credit-based billing via Polar (sandbox), authentication via Better Auth, and a Redis Streams-based async processing pipeline.

## Glossary

- **System**: The MediaMind platform as a whole
- **Upload_Form**: The `/upload` page where users select a media file and AI options
- **Queue_Screen**: The `/queue` page showing all processing jobs for the current user
- **Media_Detail_View**: The `/video/:id` page showing the completed transcript, summary, and AI insights
- **Billing_Dashboard**: The `/billing` page showing credit balance, top-up options, and transaction history
- **Auth_System**: The Better Auth-powered login/register system
- **AI_Worker**: The Python worker process consuming Redis Stream jobs and running Whisper + Gemini
- **Fastify_Server**: The backend Fastify + oRPC server handling uploads, credit deduction, and result ingestion
- **Credit_System**: The credit balance and transaction tracking system
- **Polar**: The third-party payment provider used in sandbox mode for credit top-ups
- **MinIO**: The object storage service for uploaded media and generated audio summaries
- **Redis_Stream**: The Redis Streams-based job queue connecting Fastify_Server to AI_Worker
- **Drizzle_DB**: The PostgreSQL database accessed via Drizzle ORM
- **oRPC**: The type-safe RPC layer used for all client-server API calls (except auth and webhook routes)
- **ProcessingOptions**: The set of toggleable AI features: transcribe, summarize, extractKeywords, extractMainIdeas, generateNotes, generateAudioSummary
- **TranscriptSegment**: A timed segment of transcribed text with start/end timestamps and index
- **SummaryRef**: A citation linking a summary sentence index to one or more transcript segment indices
- **QueueJob**: A job entry in the queue with video metadata, enabled options, and credit cost
- **VideoDetail**: The combined response of a video record, its transcript segments, and its summary

---

## Requirements

### Requirement 1: Shared Types Package

**User Story:** As a developer, I want all shared TypeScript types in a single package, so that the frontend, backend, and API layer share one source of truth without duplication.

#### Acceptance Criteria

1. THE System SHALL export `VideoStatus`, `MediaType`, `ProcessingOptions`, `Video`, `TranscriptSegment`, `SummaryRef`, `Summary`, `Credit`, `CreditTransaction`, `JobPayload`, `ResultPayload`, `VideoDetail`, `VideoStatusResponse`, and `QueueJob` from `packages/types/src/index.ts`
2. THE System SHALL make all types importable via the `@repo/types` package alias
3. WHEN any package imports a shared type, THE System SHALL resolve it from `@repo/types` without redefinition

---

### Requirement 2: Config Package — Credit Costs and Stream Keys

**User Story:** As a developer, I want credit costs and Redis stream key constants in a shared config package, so that the server and frontend reference the same values without magic strings.

#### Acceptance Criteria

1. THE System SHALL export `CREDIT_COSTS` from `packages/config/src/credits.ts` with numeric values for `transcribe` (10), `summarize` (20), `extractKeywords` (5), `extractMainIdeas` (10), `generateNotes` (15), and `generateAudioSummary` (30)
2. THE System SHALL export `STREAM_KEYS` and `CONSUMER_GROUPS` constants from `packages/config/src/streams.ts`
3. WHEN a server handler computes a job's total credit cost, THE System SHALL derive it by summing `CREDIT_COSTS` values for each enabled option

---

### Requirement 3: Database Schema

**User Story:** As a developer, I want a complete Drizzle ORM schema for all MediaMind tables, so that the database structure matches the architecture specification.

#### Acceptance Criteria

1. THE Drizzle_DB SHALL contain a `videos` table with columns: `id` (uuid pk), `userId` (text fk → user), `title` (text), `status` (enum: pending/processing/completed/failed), `mediaUrl` (text), `mediaType` (enum: video/audio), `options` (jsonb), `createdAt` (timestamp)
2. THE Drizzle_DB SHALL contain a `transcript_segments` table with columns: `id` (uuid pk), `videoId` (uuid fk → videos), `index` (integer), `start` (real), `end` (real), `text` (text)
3. THE Drizzle_DB SHALL contain a `summaries` table with columns: `id` (uuid pk), `videoId` (uuid fk → videos, unique), `summary` (text), `keywords` (text[]), `mainIdeas` (text[]), `notes` (text nullable), `audioSummaryUrl` (text nullable)
4. THE Drizzle_DB SHALL contain a `summary_refs` table with columns: `id` (uuid pk), `summaryId` (uuid fk → summaries), `sentenceIndex` (integer), `transcriptIndices` (integer[])
5. THE Drizzle_DB SHALL contain a `credits` table with columns: `userId` (text pk fk → user), `balance` (integer default 0), `updatedAt` (timestamp)
6. THE Drizzle_DB SHALL contain a `credit_transactions` table with columns: `id` (uuid pk), `userId` (text fk → user), `delta` (integer), `reason` (text), `metadata` (jsonb nullable), `createdAt` (timestamp)
7. WHEN a new user signs up via Better Auth, THE Auth_System SHALL insert a `credits` row with `balance: 50` as a welcome bonus

---

### Requirement 4: Docker Compose Infrastructure

**User Story:** As a developer, I want a single `docker-compose.yml` at the project root that starts all required services, so that the development environment is reproducible with one command.

#### Acceptance Criteria

1. THE System SHALL define a `postgres` service using image `postgres:16` on port `5432`
2. THE System SHALL define a `redis` service using image `redis:7-alpine` on port `6379`
3. THE System SHALL define a `minio` service using image `minio/minio` on ports `9000` (API) and `9001` (console)
4. THE System SHALL define a `worker` service built from `apps/worker/Dockerfile`
5. IF Kafka, Elasticsearch, Kibana, or Keycloak services are present in any compose file, THEN THE System SHALL exclude them from the new `docker-compose.yml`

---

### Requirement 5: Server — Environment Variables

**User Story:** As a developer, I want all server environment variables validated at startup, so that missing configuration fails fast with a clear error.

#### Acceptance Criteria

1. THE Fastify_Server SHALL validate the following env vars at startup: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `REDIS_URL`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_PORT`, `MINIO_USE_SSL`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SUCCESS_URL`, `CORS_ORIGIN`, `NODE_ENV`
2. IF any required env var is missing at startup, THEN THE Fastify_Server SHALL throw an error and exit before accepting requests

---

### Requirement 6: Server — MinIO Bucket Initialization

**User Story:** As a developer, I want MinIO buckets created automatically on server startup, so that uploads work without manual bucket setup.

#### Acceptance Criteria

1. WHEN THE Fastify_Server starts, THE System SHALL create the `media` bucket in MinIO if it does not exist and set a public read policy
2. WHEN THE Fastify_Server starts, THE System SHALL create the `summaries` bucket in MinIO if it does not exist and set a public read policy

---

### Requirement 7: Server — Video Upload oRPC Endpoint

**User Story:** As a user, I want to upload a media file with selected AI options, so that the system processes it and returns a job ID.

#### Acceptance Criteria

1. WHEN an authenticated user calls `video.upload` with a valid file and ProcessingOptions, THE Fastify_Server SHALL create a `videos` DB record with `status: "pending"`
2. WHEN THE Fastify_Server creates a video record, THE System SHALL upload the file to MinIO bucket `media` and store the public URL in `videos.mediaUrl`
3. WHEN THE Fastify_Server has stored the file, THE System SHALL deduct the computed credit cost from the user's `credits.balance` in a single DB transaction
4. IF the user's `credits.balance` is less than the computed credit cost, THEN THE Fastify_Server SHALL return an `INSUFFICIENT_CREDITS` error and SHALL NOT create a video record or enqueue a job
5. WHEN credits are successfully deducted, THE Fastify_Server SHALL publish a `JobPayload` to Redis Stream `stream:jobs` (consumer group: `workers`)
6. WHEN the job is enqueued, THE Fastify_Server SHALL return `{ jobId, videoId, status: "pending" }` to the client
7. IF the uploaded file exceeds 500MB, THEN THE Fastify_Server SHALL return a `FILE_TOO_LARGE` error
8. IF the uploaded file's MIME type is not one of mp4, mov, mkv, webm, mp3, wav, m4a, THEN THE Fastify_Server SHALL return an `UNSUPPORTED_FORMAT` error

---

### Requirement 8: Server — Queue and Status oRPC Endpoints

**User Story:** As a user, I want to see all my processing jobs and their current status, so that I can track progress and navigate to completed results.

#### Acceptance Criteria

1. WHEN an authenticated user calls `queue.list`, THE Fastify_Server SHALL return all `QueueJob` entries for that user ordered by `createdAt` descending
2. WHEN an authenticated user calls `video.getStatus` with a `videoId`, THE Fastify_Server SHALL return `{ status, progress, currentStep }` for that video
3. IF the `videoId` does not belong to the authenticated user, THEN THE Fastify_Server SHALL return an `UNAUTHORIZED` error

---

### Requirement 9: Server — Media Detail oRPC Endpoint

**User Story:** As a user, I want to retrieve the full transcript, summary, and AI insights for a completed video, so that I can view and interact with the results.

#### Acceptance Criteria

1. WHEN an authenticated user calls `video.getDetail` with a `videoId`, THE Fastify_Server SHALL return a `VideoDetail` object containing the video record, all transcript segments sorted by `index`, and the summary with refs
2. IF the video's `status` is not `"completed"`, THEN THE Fastify_Server SHALL return a `NOT_READY` error
3. IF the `videoId` does not belong to the authenticated user, THEN THE Fastify_Server SHALL return an `UNAUTHORIZED` error

---

### Requirement 10: Server — Credits and Billing oRPC Endpoints

**User Story:** As a user, I want to view my credit balance, transaction history, and purchase more credits, so that I can manage my account spending.

#### Acceptance Criteria

1. WHEN an authenticated user calls `credits.getBalance`, THE Fastify_Server SHALL return `{ balance, totalSpent }` where `totalSpent` is the sum of all negative `credit_transactions.delta` values for that user
2. WHEN an authenticated user calls `credits.getHistory` with `{ limit, cursor? }`, THE Fastify_Server SHALL return a paginated list of `CreditTransaction` records and a `nextCursor`
3. WHEN an authenticated user calls `billing.getProducts`, THE Fastify_Server SHALL return available Polar products
4. WHEN an authenticated user calls `billing.createCheckout` with a `productId`, THE Fastify_Server SHALL return a Polar sandbox checkout URL

---

### Requirement 11: Server — Polar Webhook

**User Story:** As the system, I want to handle Polar webhook events to grant credits after a successful purchase, so that credit balances are updated reliably server-side.

#### Acceptance Criteria

1. WHEN THE Fastify_Server receives a `POST /webhooks/polar` request, THE System SHALL validate the request signature using `POLAR_WEBHOOK_SECRET`
2. IF the signature is invalid, THEN THE Fastify_Server SHALL return HTTP 401
3. WHEN a valid `order.created` event is received, THE System SHALL add the purchased credit amount to the user's `credits.balance` and insert a `credit_transactions` row with `reason: "polar_purchase"`

---

### Requirement 12: Server — Redis Result Consumer

**User Story:** As the system, I want a background consumer that reads AI processing results from Redis Streams and persists them to the database, so that completed jobs are reflected in the UI.

#### Acceptance Criteria

1. WHEN THE Fastify_Server starts, THE System SHALL start a background XREADGROUP consumer on `stream:results` (consumer group: `server`)
2. WHEN a `ResultPayload` with `status: "completed"` is consumed, THE System SHALL insert transcript segments, summary, and summary refs into the DB and update `videos.status` to `"completed"`
3. WHEN a `ResultPayload` with `status: "failed"` is consumed, THE System SHALL update `videos.status` to `"failed"` and store the error
4. WHEN a result message is successfully processed, THE System SHALL acknowledge it with XACK

---

### Requirement 13: AI Worker — Stream Consumer

**User Story:** As the system, I want a Python worker that reliably consumes jobs from Redis Streams and processes them with Whisper and Gemini, so that media files are transcribed and analyzed.

#### Acceptance Criteria

1. WHEN THE AI_Worker starts, THE System SHALL load the Whisper model once and initialize the Gemini client once
2. THE AI_Worker SHALL consume jobs from `stream:jobs` using XREADGROUP (consumer group: `workers`) with XCLAIM for stale message recovery
3. WHEN a job is consumed, THE AI_Worker SHALL download the media file from the MinIO public URL
4. WHEN the media file is downloaded, THE AI_Worker SHALL run Whisper to produce timestamped `TranscriptSegment` records
5. WHEN transcription is complete, THE AI_Worker SHALL run enabled Gemini tasks in parallel: summarize, extractKeywords, extractMainIdeas, generateNotes
6. WHEN `generateAudioSummary` is enabled, THE AI_Worker SHALL generate TTS audio, upload it to MinIO bucket `summaries`, and include the public URL in the result
7. WHEN all tasks complete, THE AI_Worker SHALL publish a `ResultPayload` with `status: "completed"` to `stream:results`
8. IF any step fails after 3 retry attempts, THE AI_Worker SHALL publish a `ResultPayload` with `status: "failed"` and the error message to `stream:results`
9. WHEN THE AI_Worker receives SIGTERM, THE System SHALL finish the current job before stopping

---

### Requirement 14: AI Worker — Gemini JSON Validation

**User Story:** As the system, I want all Gemini responses parsed and validated with Pydantic, so that malformed AI output is caught before being stored.

#### Acceptance Criteria

1. WHEN THE AI_Worker calls Gemini for summarization, THE System SHALL parse the response as `{ summary: str, refs: list[SummaryRef] }` using a Pydantic model
2. WHEN THE AI_Worker calls Gemini for keywords, THE System SHALL parse the response as a JSON array of strings with a maximum of 10 items
3. WHEN THE AI_Worker calls Gemini for main ideas, THE System SHALL parse the response as a JSON array of 3–5 strings
4. WHEN THE AI_Worker calls Gemini for notes, THE System SHALL parse the response as `{ notes: str }` where the value is a markdown-formatted string
5. IF a Gemini response fails Pydantic validation, THEN THE AI_Worker SHALL retry the Gemini call up to 3 times before marking the job as failed

---

### Requirement 15: Frontend — Authentication

**User Story:** As a user, I want to register and log in with email/password, so that my uploads and credits are tied to my account.

#### Acceptance Criteria

1. THE Auth_System SHALL provide a `/login` route with email/password sign-in form
2. THE Auth_System SHALL provide a `/register` route with name, email, and password sign-up form
3. WHEN a user submits valid credentials on `/login`, THE Auth_System SHALL create a session cookie and redirect to `/upload`
4. WHEN a user submits valid registration data on `/register`, THE Auth_System SHALL create the account, grant 50 welcome credits, and redirect to `/upload`
5. IF a user navigates to a protected route without a valid session, THEN THE Auth_System SHALL redirect to `/login`
6. WHEN a user signs out, THE Auth_System SHALL clear the session cookie and redirect to `/login`

---

### Requirement 16: Frontend — Upload Form

**User Story:** As a user, I want to upload a video or audio file and select AI processing options, so that I can submit a job for processing.

#### Acceptance Criteria

1. THE Upload_Form SHALL accept video or audio files via drag-and-drop or file picker
2. WHEN a file is selected, THE Upload_Form SHALL display the file name, size, and type icon
3. IF the selected file exceeds 500MB, THEN THE Upload_Form SHALL display an inline error and SHALL NOT enable the submit button
4. IF the selected file's type is not one of mp4, mov, mkv, webm, mp3, wav, m4a, THEN THE Upload_Form SHALL display an inline error
5. THE Upload_Form SHALL display AI option toggles for: Transcribe (10c, always on), Summarize (20c), Extract Keywords (5c), Extract Main Ideas (10c), Generate Notes (15c), Generate Audio Summary (30c)
6. WHEN the user toggles an AI option, THE Upload_Form SHALL update the total credit cost display immediately
7. WHEN the total credit cost exceeds the user's current balance, THE Upload_Form SHALL display a warning and disable the submit button
8. WHEN the user clicks the submit button, THE Upload_Form SHALL POST the file and options to `video.upload` and redirect to `/queue` on success
9. IF a network error occurs during upload, THEN THE Upload_Form SHALL display a retry button

---

### Requirement 17: Frontend — Queue Screen

**User Story:** As a user, I want to see all my processing jobs with live status updates, so that I know when my media is ready to view.

#### Acceptance Criteria

1. THE Queue_Screen SHALL display all jobs for the current user with: title, status badge, enabled options, credit cost, and relative time
2. WHEN any visible job has `status: "pending"` or `status: "processing"`, THE Queue_Screen SHALL poll `video.getStatus` every 3 seconds
3. WHEN all visible jobs have `status: "completed"` or `status: "failed"`, THE Queue_Screen SHALL stop polling
4. WHEN a job has `status: "processing"`, THE Queue_Screen SHALL display a progress bar and the current step name
5. WHEN a job has `status: "completed"`, THE Queue_Screen SHALL display a "View" button that navigates to `/video/:id`
6. WHEN a job has `status: "failed"`, THE Queue_Screen SHALL display the error message and a "Retry" button
7. WHEN no jobs exist, THE Queue_Screen SHALL display an empty state with a link to `/upload`

---

### Requirement 18: Frontend — Media Detail View

**User Story:** As a user, I want to view the transcript synced to the media player and explore AI-generated insights, so that I can navigate and understand the content.

#### Acceptance Criteria

1. THE Media_Detail_View SHALL render a `<video>` element for video media and an `<audio>` element for audio media
2. WHEN the media player's `currentTime` changes, THE Media_Detail_View SHALL highlight the transcript segment where `currentTime >= segment.start && currentTime < segment.end`
3. WHEN the active transcript segment changes, THE Media_Detail_View SHALL auto-scroll the transcript panel to keep it visible
4. WHEN a user clicks a transcript segment, THE Media_Detail_View SHALL seek the media player to `segment.start`
5. THE Media_Detail_View SHALL display the summary text split into sentences, with keywords as pill tags and main ideas as a numbered list
6. WHEN a user hovers over a summary sentence, THE Media_Detail_View SHALL highlight the transcript segments referenced by that sentence's `SummaryRef` entries
7. WHEN a user clicks a summary sentence, THE Media_Detail_View SHALL scroll the transcript panel to the first referenced segment
8. WHERE `notes` is present, THE Media_Detail_View SHALL render the notes as formatted Markdown
9. WHERE `audioSummaryUrl` is present, THE Media_Detail_View SHALL display a compact audio player for the audio summary

---

### Requirement 19: Frontend — Billing Dashboard

**User Story:** As a user, I want to view my credit balance, purchase history, and buy more credits, so that I can manage my account.

#### Acceptance Criteria

1. THE Billing_Dashboard SHALL display the user's current credit balance and total credits spent
2. THE Billing_Dashboard SHALL display available Polar products with name, credit amount, and price
3. WHEN a user clicks "Buy" on a product, THE Billing_Dashboard SHALL call `billing.createCheckout` and redirect to the Polar sandbox checkout URL
4. THE Billing_Dashboard SHALL display a paginated transaction history with date, reason label, and delta (green for positive, red for negative)
5. WHEN the transaction reason is `"polar_purchase"`, THE Billing_Dashboard SHALL display the label "Credit top-up"
6. WHEN the transaction reason is `"job_deduction"`, THE Billing_Dashboard SHALL display the label "Processing: {videoTitle}" using metadata
