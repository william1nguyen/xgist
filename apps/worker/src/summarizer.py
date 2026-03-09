from __future__ import annotations

import json
import logging
from collections.abc import Callable
from typing import Any

from google import genai
from pydantic import ValidationError

from models import GeminiSummaryResponse, TranscriptSegment

logger = logging.getLogger(__name__)

_make_client: Callable[[], genai.Client] | None = None
_model_name: str = "gemini-2.5-flash-lite"

MAX_RETRIES = 3


def set_model(make_client: Callable[[], genai.Client], model_name: str) -> None:
    global _make_client, _model_name
    _make_client = make_client
    _model_name = model_name


def _build_transcript_text(transcript: list[TranscriptSegment]) -> str:
    return "\n".join(
        f"[{i}] ({seg.start:.1f}s) {seg.text}"
        for i, seg in enumerate(transcript)
    )


def summarize(transcript: list[TranscriptSegment]) -> GeminiSummaryResponse:
    if _make_client is None:
        raise RuntimeError("Gemini model not initialized")

    transcript_text = _build_transcript_text(transcript)
    prompt = (
        "You are a summarization assistant. Given the following transcript with segment indices, "
        "produce a JSON object with:\n"
        '- "summary": a single string containing the full summary split into sentences\n'
        '- "refs": an array of objects, each with "sentence_index" (0-based index of the sentence '
        'in the summary) and "transcript_indices" (array of transcript segment indices that sentence references)\n\n'
        f"Transcript:\n{transcript_text}\n\n"
        "Respond with valid JSON only, no markdown."
    )

    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            client = _make_client()
            response = client.models.generate_content(model=_model_name, contents=prompt)
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw)
            return GeminiSummaryResponse.model_validate(data)
        except (ValidationError, json.JSONDecodeError, ValueError) as e:
            last_error = e
            logger.warning("summarize attempt %d failed: %s", attempt + 1, e)

    raise RuntimeError(f"summarize failed after {MAX_RETRIES} attempts: {last_error}")
