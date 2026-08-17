"""handle_summary_audio: reads content's committed summary text, runs TTS,
writes the audio object, then commits its metadata through content — the
step completes only after both the object and its metadata are durable
(architecture.md, worker.md).
"""

from __future__ import annotations

import subprocess
import tempfile
import uuid

from deps import Deps
from errors import TerminalStepError
from events import StepCommand
from providers import tts

SUMMARY_TYPE = "short"


def _probe_duration_ms(mp3_bytes: bytes) -> int:
    with tempfile.NamedTemporaryFile(suffix=".mp3") as tmp:
        tmp.write(mp3_bytes)
        tmp.flush()
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", tmp.name],
            capture_output=True, check=False, timeout=30,
        )
    try:
        return round(float(result.stdout.decode().strip()) * 1000)
    except (ValueError, AttributeError):
        return 0


def handle(cmd: StepCommand, deps: Deps) -> None:
    try:
        summary_text = deps.content.get_summary_text(cmd.media_id, SUMMARY_TYPE)
    except LookupError as e:
        # The dependency graph (conductor's workflow.stepDependsOn)
        # guarantees the summary step commits before summary_audio is
        # dispatched, so a missing summary here means the input this step
        # needs will never appear — a data/graph inconsistency, not a
        # transient one.
        raise TerminalStepError("summary_not_found", str(e)) from e

    with deps.limits.for_step(cmd.step).acquire():
        audio_bytes = tts.generate_audio_summary(summary_text, deps.tts_voice)
        duration_ms = _probe_duration_ms(audio_bytes)

    object_key = f"media/{cmd.media_id}/summary-audio/{uuid.uuid4()}.mp3"
    deps.objects.put_object(object_key, audio_bytes, content_type="audio/mpeg")

    deps.content.store_summary_audio_metadata(
        idempotency_key=cmd.idempotency_key,
        media_id=cmd.media_id,
        workflow_id=cmd.workflow_id,
        attempt=cmd.attempt,
        summary_type=SUMMARY_TYPE,
        object_key=object_key,
        mime_type="audio/mpeg",
        duration_ms=duration_ms,
        voice=deps.tts_voice,
    )
