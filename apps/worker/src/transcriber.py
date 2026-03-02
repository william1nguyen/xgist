from __future__ import annotations

import io
import tempfile
import os

import whisper

from models import TranscriptSegment

_model: whisper.Whisper | None = None


def load_model() -> None:
    global _model
    _model = whisper.load_model(os.environ.get("WHISPER_MODEL", "base"))


def transcribe(media_bytes: bytes, media_type: str) -> list[TranscriptSegment]:
    if _model is None:
        raise RuntimeError("Whisper model not loaded")

    suffix = ".mp4" if media_type == "video" else ".mp3"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(media_bytes)
        tmp_path = tmp.name

    try:
        result = _model.transcribe(tmp_path, verbose=False)
    finally:
        os.unlink(tmp_path)

    segments: list[TranscriptSegment] = []
    for seg in result.get("segments", []):
        segments.append(
            TranscriptSegment(
                start=float(seg["start"]),
                end=float(seg["end"]),
                text=seg["text"].strip(),
            )
        )
    return segments
