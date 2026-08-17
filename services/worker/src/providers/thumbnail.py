"""Video thumbnail generation, per docs/architecture.md's "media list and
thumbnail delivery" algorithm: read only the media range FFmpeg needs,
pick a representative frame rather than always the first, resize to
320x180, encode as WebP.

Audio media prefers embedded cover art, falling back to a waveform
preview or a default image, per architecture.md — that fallback chain is
not implemented yet; audio media simply completes generate_thumbnail
without registering a derivative (see handlers/thumbnail.py), which content's
GetContent/media's SignThumbnailURL already treat as a normal "no
thumbnail yet" state, not an error.
"""

from __future__ import annotations

import io
import logging
import subprocess

from PIL import Image

logger = logging.getLogger(__name__)

THUMBNAIL_WIDTH = 320
THUMBNAIL_HEIGHT = 180


def extract_representative_frame(source_url: str, duration_ms: int) -> bytes:
    """Extracts one PNG frame from source_url at the video's midpoint (a
    representative frame, per architecture.md, instead of always frame 0).
    Passing -ss before -i lets FFmpeg seek via HTTP range requests instead
    of downloading the whole object, satisfying architecture.md's "reads
    only the media range required by FFmpeg."
    """
    seek_seconds = max(duration_ms, 0) / 2000.0

    cmd = [
        "ffmpeg", "-y",
        "-ss", f"{seek_seconds:.3f}",
        "-i", source_url,
        "-frames:v", "1",
        "-f", "image2pipe",
        "-vcodec", "png",
        "-",
    ]
    result = subprocess.run(cmd, capture_output=True, check=False, timeout=60)
    if result.returncode != 0 or not result.stdout:
        raise RuntimeError(f"ffmpeg frame extraction failed: {result.stderr.decode(errors='replace')[-2000:]}")
    return result.stdout


def resize_to_thumbnail(png_bytes: bytes) -> bytes:
    """Resizes/crops png_bytes to a fixed 320x180 WebP thumbnail,
    covering the target box (resize to fill, then center-crop) rather
    than letterboxing.
    """
    with Image.open(io.BytesIO(png_bytes)) as img:
        img = img.convert("RGB")
        src_ratio = img.width / img.height
        dst_ratio = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT

        if src_ratio > dst_ratio:
            new_height = THUMBNAIL_HEIGHT
            new_width = round(new_height * src_ratio)
        else:
            new_width = THUMBNAIL_WIDTH
            new_height = round(new_width / src_ratio)
        img = img.resize((new_width, new_height), Image.LANCZOS)

        left = (new_width - THUMBNAIL_WIDTH) // 2
        top = (new_height - THUMBNAIL_HEIGHT) // 2
        img = img.crop((left, top, left + THUMBNAIL_WIDTH, top + THUMBNAIL_HEIGHT))

        out = io.BytesIO()
        img.save(out, format="WEBP", quality=80)
        return out.getvalue()


def generate_thumbnail(source_url: str, duration_ms: int) -> bytes:
    frame = extract_representative_frame(source_url, duration_ms)
    return resize_to_thumbnail(frame)
