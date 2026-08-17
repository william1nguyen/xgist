"""handle_transcribe: reads the source object, runs Whisper, commits the
transcript through content. content publishes
mn.processing.step.completed.v1 only after the commit durably lands
(architecture.md); this handler never publishes success itself.
"""

from __future__ import annotations

import httpfetch
from clients.content_client import TranscriptSegment as ContentSegment
from deps import Deps
from events import StepCommand
from providers import whisper


def handle(cmd: StepCommand, deps: Deps) -> None:
    media = deps.media.get_media(cmd.media_id)
    source_url = deps.media.sign_playback_url(cmd.media_id)

    with deps.limits.for_step(cmd.step).acquire():
        media_bytes = httpfetch.download(source_url)
        text, segments = whisper.transcribe(media_bytes, media.media_type)

    deps.content.store_transcript(
        idempotency_key=cmd.idempotency_key,
        media_id=cmd.media_id,
        workflow_id=cmd.workflow_id,
        attempt=cmd.attempt,
        language="",
        text=text,
        segments=[
            ContentSegment(segment_index=s.segment_index, start_ms=s.start_ms, end_ms=s.end_ms, speaker="", text=s.text)
            for s in segments
        ],
    )
