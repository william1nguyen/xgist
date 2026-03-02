from __future__ import annotations

import logging
import os

import google.generativeai as genai

logger = logging.getLogger(__name__)


def generate_audio_summary(summary: str) -> bytes:
    client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
    response = client.models.generate_content(
        model="gemini-2.5-flash-preview-tts",
        contents=summary,
        config=genai.types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=genai.types.SpeechConfig(
                voice_config=genai.types.VoiceConfig(
                    prebuilt_voice_config=genai.types.PrebuiltVoiceConfig(voice_name="Kore")
                )
            ),
        ),
    )
    audio_data = response.candidates[0].content.parts[0].inline_data.data
    return audio_data
