"""Whisper transcription, adapted from apps/worker/src/transcriber.py for
the transcribe step: same faster-whisper usage, but segments are shaped
for content.proto's TranscriptSegment (segment_index/start_ms/end_ms)
instead of the v1 API's start/end-in-seconds shape.
"""

from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass

from faster_whisper import WhisperModel

_model: WhisperModel | None = None


@dataclass
class Segment:
    segment_index: int
    start_ms: int
    end_ms: int
    text: str


def load_model(model_name: str) -> None:
    global _model
    _model = WhisperModel(model_name, device="auto", compute_type="auto")


def transcribe(media_bytes: bytes, media_type: str) -> tuple[str, list[Segment]]:
    """Returns (full_text, ordered_segments). Raises RuntimeError if the
    model hasn't been loaded yet (main.py loads it at startup, matching
    worker.md's stateless-but-warm-model executor).
    """
    if _model is None:
        raise RuntimeError("Whisper model not loaded")

    suffix = ".mp4" if media_type == "video" else ".mp3"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(media_bytes)
        tmp_path = tmp.name

    try:
        segments_iter, _ = _model.transcribe(tmp_path)
        segments = [
            Segment(
                segment_index=i,
                start_ms=round(seg.start * 1000),
                end_ms=round(seg.end * 1000),
                text=seg.text.strip(),
            )
            for i, seg in enumerate(segments_iter)
        ]
    finally:
        os.unlink(tmp_path)

    full_text = " ".join(s.text for s in segments)
    return full_text, segments
