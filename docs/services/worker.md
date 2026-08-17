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
