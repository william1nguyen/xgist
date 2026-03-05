from __future__ import annotations

import io
import logging
import wave

import edge_tts

logger = logging.getLogger(__name__)

EDGE_TTS_VOICE = "en-US-AriaNeural"


def _pcm_to_wav(pcm_data: bytes, sample_rate: int = 24000) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)
    return buffer.getvalue()


async def _generate_edge_tts(text: str) -> bytes:
    communicate = edge_tts.Communicate(text, EDGE_TTS_VOICE)
    buffer = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buffer.write(chunk["data"])
    return buffer.getvalue()


async def generate_audio_summary(summary: str) -> bytes:
    logger.info("tts=edge_tts voice=%s chars=%d", EDGE_TTS_VOICE, len(summary))
    return await _generate_edge_tts(summary)
