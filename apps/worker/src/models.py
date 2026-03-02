from __future__ import annotations

from typing import Literal
from pydantic import BaseModel


class ProcessingOptions(BaseModel):
    transcribe: bool = True
    summarize: bool = False
    extract_keywords: bool = False
    extract_main_ideas: bool = False
    generate_notes: bool = False
    generate_audio_summary: bool = False


class JobMessage(BaseModel):
    job_id: str
    video_id: str
    user_id: str
    media_url: str
    media_type: Literal["video", "audio"]
    options: ProcessingOptions


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


class SummaryRef(BaseModel):
    sentence_index: int
    transcript_indices: list[int]


class GeminiSummaryResponse(BaseModel):
    summary: str
    refs: list[SummaryRef]


class GeminiNotesResponse(BaseModel):
    notes: str


class ResultMessage(BaseModel):
    job_id: str
    video_id: str
    status: Literal["completed", "failed"]
    error: str | None = None
    transcript: list[TranscriptSegment] = []
    summary: str | None = None
    summary_refs: list[SummaryRef] = []
    keywords: list[str] = []
    main_ideas: list[str] = []
    notes: str | None = None
    audio_summary_url: str | None = None
