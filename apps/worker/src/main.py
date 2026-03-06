from __future__ import annotations

import asyncio
import json
import logging
import os
import signal

import google.generativeai as genai
from dotenv import load_dotenv

import extractor
import summarizer
import transcriber
from models import GeminiSummaryResponse, JobMessage, ProcessingOptions, ResultMessage, SummaryRef
from redis_client import (
    ack_job,
    consume_jobs,
    ensure_consumer_group,
    get_redis,
    publish_result,
)
from storage import download_media, upload_audio
from tts import generate_audio_summary

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

MAX_RETRIES = 3
_running = True


def handle_sigterm(signum: int, frame: object) -> None:
    global _running
    logger.info("SIGTERM received, finishing current job then stopping")
    _running = False


signal.signal(signal.SIGTERM, handle_sigterm)


def _build_failed_result(job_id: str, video_id: str, error: str) -> dict[str, object]:
    return ResultMessage(
        job_id=job_id,
        video_id=video_id,
        status="failed",
        error=error,
    ).model_dump()


async def process_job(job: JobMessage) -> ResultMessage:
    logger.info("job_id=%s step=transcribe", job.job_id)
    media_bytes = download_media(job.media_url)
    segments = transcriber.transcribe(media_bytes, job.media_type)

    summary_text: str | None = None
    summary_refs: list[SummaryRef] = []
    keywords: list[str] = []
    main_ideas: list[str] = []
    notes: str | None = None
    audio_summary_url: str | None = None

    tasks: dict[str, asyncio.Future[object]] = {}

    if job.options.summarize:
        tasks["summarize"] = asyncio.to_thread(summarizer.summarize, segments)
    if job.options.extract_keywords:
        tasks["keywords"] = asyncio.to_thread(extractor.extract_keywords, segments)
    if job.options.extract_main_ideas:
        tasks["main_ideas"] = asyncio.to_thread(extractor.extract_main_ideas, segments)
    if job.options.generate_notes:
        tasks["notes"] = asyncio.to_thread(extractor.generate_notes, segments)

    if tasks:
        logger.info("job_id=%s step=gemini_parallel tasks=%s", job.job_id, list(tasks.keys()))
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        for key, result in zip(tasks.keys(), results):
            if isinstance(result, Exception):
                raise result
            if key == "summarize" and isinstance(result, GeminiSummaryResponse):
                summary_text = result.summary
                summary_refs = result.refs
            elif key == "keywords" and isinstance(result, list):
                keywords = result
            elif key == "main_ideas" and isinstance(result, list):
                main_ideas = result
            elif key == "notes" and isinstance(result, str):
                notes = result

    if job.options.generate_audio_summary and summary_text:
        logger.info("job_id=%s step=tts", job.job_id)
        audio_bytes = await generate_audio_summary(summary_text)
        audio_summary_url = upload_audio(audio_bytes, f"{job.video_id}-summary.mp3")

    return ResultMessage(
        job_id=job.job_id,
        video_id=job.video_id,
        status="completed",
        transcript=segments,
        summary=summary_text,
        summary_refs=summary_refs,
        keywords=keywords,
        main_ideas=main_ideas,
        notes=notes,
        audio_summary_url=audio_summary_url,
    )


async def run() -> None:
    r = get_redis()
    ensure_consumer_group(r)

    while _running:
        entries = consume_jobs(r)
        if not entries:
            continue

        for msg_id, fields in entries:
            job_id = fields.get("jobId", "unknown")
            logger.info("job_id=%s step=received", job_id)

            try:
                job = JobMessage(
                    job_id=fields["jobId"],
                    video_id=fields["videoId"],
                    user_id=fields["userId"],
                    media_url=fields["mediaUrl"],
                    media_type=fields["mediaType"],
                    options=ProcessingOptions.model_validate(
                        json.loads(fields.get("options", "{}"))
                    ),
                )
            except Exception as e:
                logger.error("job_id=%s step=parse_error error=%s", job_id, e)
                ack_job(r, msg_id)
                continue

            last_error: str | None = None
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    logger.info("job_id=%s step=processing attempt=%d", job.job_id, attempt)
                    result = await process_job(job)
                    publish_result(r, result.model_dump())
                    logger.info("job_id=%s step=completed", job.job_id)
                    last_error = None
                    break
                except Exception as e:
                    last_error = str(e)
                    logger.warning("job_id=%s attempt=%d error=%s", job.job_id, attempt, e)

            if last_error is not None:
                logger.error("job_id=%s step=failed error=%s", job.job_id, last_error)
                publish_result(r, _build_failed_result(job.job_id, job.video_id, last_error))

            ack_job(r, msg_id)

    logger.info("Worker stopped cleanly")


def main() -> None:
    transcriber.load_model()
    logger.info("Whisper model loaded")

    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
    gemini_model = genai.GenerativeModel(
        model_name=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite")
    )
    summarizer.set_model(gemini_model)
    extractor.set_model(gemini_model)
    logger.info("Gemini client initialized")

    asyncio.run(run())


if __name__ == "__main__":
    main()
