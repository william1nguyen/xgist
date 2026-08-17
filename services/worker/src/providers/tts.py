"""Text-to-speech for the summary_audio step, adapted from
apps/worker/src/tts.py. edge-tts has no authenticated project quota or
production SLA (ADR 0007) — it is a local-development/test provider only;
swapping in a production TTS provider is a separate, explicitly deferred
piece of work, matching ADR 0007's own rollout gate ("TTS cannot be
enabled in production while only edge-tts is configured").
"""

from __future__ import annotations

import asyncio
import io
import logging

import edge_tts

logger = logging.getLogger(__name__)


async def _generate(text: str, voice: str) -> bytes:
    communicate = edge_tts.Communicate(text, voice)
    buffer = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buffer.write(chunk["data"])
    return buffer.getvalue()


def generate_audio_summary(text: str, voice: str) -> bytes:
    """Synthesizes text to MP3 bytes. Synchronous wrapper so step handlers
    (dispatch.py) don't need their own event loop.
    """
    logger.info("tts=edge_tts voice=%s chars=%d", voice, len(text))
    return asyncio.run(_generate(text, voice))
