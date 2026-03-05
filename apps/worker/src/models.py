from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class ProcessingOptions(BaseModel):
    transcribe: bool = True
    summarize: bool = False
    extract_keywords: bool = Field(False, alias="extractKeywords")
    extract_main_ideas: bool = Field(False, alias="extractMainIdeas")
    generate_notes: bool = Field(False, alias="generateNotes")
    generate_audio_summary: bool = Field(False, alias="generateAudioSummary")

    model_config = {"populate_by_name": True}


class JobMessage(BaseModel):
    job_id: str
    video_id: str
    user_id: str
    media_url: str
    media_type: Literal["video", "audio"]
    options: ProcessingOptions
    existing_transcript: list[TranscriptSegment] = Field(default_factory=list, alias="existingTranscript")

    model_config = {"populate_by_name": True}


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
