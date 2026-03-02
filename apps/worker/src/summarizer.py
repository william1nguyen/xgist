from __future__ import annotations

import json
import logging

import google.generativeai as genai
from pydantic import ValidationError

from models import GeminiSummaryResponse, TranscriptSegment

logger = logging.getLogger(__name__)

_gemini_model: genai.GenerativeModel | None = None

MAX_RETRIES = 3


def set_model(model: genai.GenerativeModel) -> None:
    global _gemini_model
    _gemini_model = model


def _build_transcript_text(transcript: list[TranscriptSegment]) -> str:
    return "\n".join(
        f"[{i}] ({seg.start:.1f}s) {seg.text}"
        for i, seg in enumerate(transcript)
    )


def summarize(transcript: list[TranscriptSegment]) -> GeminiSummaryResponse:
    if _gemini_model is None:
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
            response = _gemini_model.generate_content(prompt)
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
