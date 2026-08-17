# Worker

## Scope

Python Kafka consumer-group pool. It is stateless: executes Whisper, Gemini,
FFmpeg and TTS; it owns only bounded local execution. Durable results belong to
Media or Content service.

## Structure

```text
worker/
  consumer.py        # polling, decode, offset commit
  dispatch.py        # step-kind routing
  steps/             # transcribe, summary, keywords, keypoints, notes, audio, thumbnail
  clients/           # gRPC and object-storage clients
  providers/         # Whisper/Gemini/TTS adapters
  limits.py          # semaphore, timeout and quota admission
```

## Handlers

```text
handle_transcribe, handle_summary, handle_keywords, handle_keypoints
handle_notes, handle_summary_audio, handle_thumbnail
```

Each handler validates command IDs/attempt, acquires a bounded capability
semaphore, applies a deadline, reads only required object/content input, invokes
its provider, then calls the owner service to persist the durable result. Commit
the Kafka offset only after that call succeeds. On failure emit only classified
small metadata to `mn.processing.step.failed.v1`.

`handle_summary_audio` selects a voice by falling back through the command's
own `voice` field (conductor's workflow-level `audio_voice`, itself sourced
from the caller's `ConfirmUpload` request) to the pool-wide default in
`WORKER_TTS_VOICE`. There is no per-provider voice validation beyond what the
TTS provider itself rejects.

Workers never choose another worker, track workflow state, publish a successful
completion before persistence, or transfer media/text via Kafka. Before commit,
check authoritative deletion/media state. Test provider timeout, admission
denial, duplicate command, owner unavailable, late result and cancellation.

## Planned: standalone audio generation (not yet implemented)

Today `handle_summary_audio` only ever synthesizes a *derived* summary of an
existing media item's transcript — there is no path that takes arbitrary
user-supplied text and produces standalone audio unrelated to any media item.
A future "Audio" feature is planned on top of the same TTS provider
(`providers/tts.py`, the edge-tts adapter `handle_summary_audio` already
uses), decoupled from the transcribe → summarize → summary-audio pipeline:

- Input: the caller either pastes text directly, or reaches it through an
  AI-chat step that turns a loose description into a script (a new,
  separate LLM interaction from summarize/keywords/keypoints/notes — it
  drafts text to *speak*, not text that cites a transcript).
- The generation itself is asynchronous, tracked through the same two
  coarse states the rest of the app already exposes for jobs: `generating`
  and `completed` (plus `failed`, matching every other step's error path).
- Results are not nested under a source media item's content — they are
  their own first-class, listable thing, with a dedicated top-level nav
  entry ("Audio" or similar) to browse and replay past generations,
  independent of the media library and its trash.

Open questions this needs resolved before implementation: which service owns
the durable rows (content already owns summary-audio metadata but has no
`user_id`/media-independent model today; a new lightweight store may be
simpler than stretching content's ownership), what the worker command/step
shape looks like given there is no `media_id` to key off of, and what the
hermes GraphQL surface (submit + poll/list) looks like. See also
`docs/services/hermes.md`'s media-recommendations note for the same
"planned, not scheduled" treatment.
