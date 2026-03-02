# Spec: AI Pipeline (Python Worker)

## Location
`apps/worker/`

## Structure

```
apps/worker/
  src/
    main.py          # Stream consumer loop + startup
    models.py        # Pydantic models (JobMessage, ResultMessage, etc.)
    transcriber.py   # Whisper wrapper
    summarizer.py    # Gemini: summary + citation refs
    extractor.py     # Gemini: keywords, main ideas, notes
    tts.py           # Google TTS / Gemini audio (audio summary)
    storage.py       # MinIO upload helper
    redis_client.py  # Stream publish/consume helpers
  requirements.txt
  Dockerfile
```

## Pydantic Models

```python
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
```

## Gemini Prompts

### Summary + Citation Refs
Ask Gemini to return JSON:
```json
{
  "summary": "Full summary split into sentences as a single string.",
  "refs": [{ "sentence_index": 0, "transcript_indices": [2, 3, 4] }]
}
```

### Keywords
Return JSON array of strings: top 10 keywords.

### Main Ideas
Return JSON array of 3-5 main idea strings.

### Notes
Return JSON with `"notes"` key containing a markdown-formatted string.

## Requirements Checklist

- [ ] XREADGROUP consumer with `XCLAIM` for reliability (retry stale messages)
- [ ] Whisper model loaded once at startup (`whisper.load_model`)
- [ ] Gemini client initialized once at startup
- [ ] All Gemini calls return validated JSON; parse with Pydantic
- [ ] MinIO upload for generated TTS audio
- [ ] Max 3 retry attempts per job before publishing `status: "failed"`
- [ ] Graceful shutdown on SIGTERM (finish current job, stop consuming)
- [ ] Log job_id and step on each transition (no print, use `logging`)
