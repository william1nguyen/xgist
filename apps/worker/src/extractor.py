from __future__ import annotations

import json
import logging
from collections.abc import Callable

from google import genai
from pydantic import ValidationError

from models import GeminiNotesResponse, TranscriptSegment

logger = logging.getLogger(__name__)

_make_client: Callable[[], genai.Client] | None = None
_model_name: str = "gemini-2.5-flash-lite"

MAX_RETRIES = 3


def set_model(make_client: Callable[[], genai.Client], model_name: str) -> None:
    global _make_client, _model_name
    _make_client = make_client
    _model_name = model_name


def _transcript_text(transcript: list[TranscriptSegment]) -> str:
    return "\n".join(seg.text for seg in transcript)


def _call_gemini(prompt: str) -> str:
    if _make_client is None:
        raise RuntimeError("Gemini model not initialized")
    client = _make_client()
    response = client.models.generate_content(model=_model_name, contents=prompt)
    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw


def extract_keywords(transcript: list[TranscriptSegment]) -> list[str]:
    text = _transcript_text(transcript)
    prompt = (
        "Extract the top 10 keywords from the following transcript. "
        "Return a JSON array of strings only, no markdown.\n\n"
        f"Transcript:\n{text}"
    )
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            raw = _call_gemini(prompt)
            result = json.loads(raw)
            if not isinstance(result, list):
                raise ValueError("Expected a JSON array")
            return [str(k) for k in result[:10]]
        except (json.JSONDecodeError, ValueError) as e:
            last_error = e
            logger.warning("extract_keywords attempt %d failed: %s", attempt + 1, e)
    raise RuntimeError(f"extract_keywords failed after {MAX_RETRIES} attempts: {last_error}")


def extract_main_ideas(transcript: list[TranscriptSegment]) -> list[str]:
    text = _transcript_text(transcript)
    prompt = (
        "Identify 3 to 5 main ideas from the following transcript. "
        "Return a JSON array of strings only, no markdown.\n\n"
        f"Transcript:\n{text}"
    )
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            raw = _call_gemini(prompt)
            result = json.loads(raw)
            if not isinstance(result, list) or not (3 <= len(result) <= 5):
                raise ValueError(f"Expected 3-5 items, got {len(result)}")
            return [str(idea) for idea in result]
        except (json.JSONDecodeError, ValueError) as e:
            last_error = e
            logger.warning("extract_main_ideas attempt %d failed: %s", attempt + 1, e)
    raise RuntimeError(f"extract_main_ideas failed after {MAX_RETRIES} attempts: {last_error}")


def generate_notes(transcript: list[TranscriptSegment]) -> str:
    text = _transcript_text(transcript)
    prompt = (
        "Generate detailed notes from the following transcript in Markdown format. "
        'Return a JSON object with a single key "notes" containing the markdown string. '
        "No markdown code fences.\n\n"
        f"Transcript:\n{text}"
    )
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            raw = _call_gemini(prompt)
            data = json.loads(raw)
            result = GeminiNotesResponse.model_validate(data)
            return result.notes
        except (json.JSONDecodeError, ValidationError, ValueError) as e:
            last_error = e
            logger.warning("generate_notes attempt %d failed: %s", attempt + 1, e)
    raise RuntimeError(f"generate_notes failed after {MAX_RETRIES} attempts: {last_error}")
