from __future__ import annotations

import os
import tempfile

from faster_whisper import WhisperModel

from models import TranscriptSegment

_model: WhisperModel | None = None


def load_model() -> None:
    global _model
    _model = WhisperModel(
        os.environ.get("WHISPER_MODEL", "base"),
        device="auto",
        compute_type="auto",
    )


def transcribe(media_bytes: bytes, media_type: str) -> list[TranscriptSegment]:
    if _model is None:
        raise RuntimeError("Whisper model not loaded")

    suffix = ".mp4" if media_type == "video" else ".mp3"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(media_bytes)
        tmp_path = tmp.name

    try:
        segments_iter, _ = _model.transcribe(tmp_path)
        segments = [
            TranscriptSegment(
                start=seg.start,
                end=seg.end,
                text=seg.text.strip(),
            )
            for seg in segments_iter
        ]
    finally:
        os.unlink(tmp_path)

    return segments
