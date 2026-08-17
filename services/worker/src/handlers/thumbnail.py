"""handle_thumbnail: generates a representative-frame WebP thumbnail for
video, registers it through media. Audio media has no video frame to
extract (see providers/thumbnail.py's module docstring on the deferred
cover-art/waveform fallback) and returns without registering a
derivative. Workers never publish a success signal directly (worker.md);
the only completion signal generate_thumbnail has is
mn.media.derivative.ready.v1 from media.RegisterDerivative, so for audio
media this step has no way to report done and instead expires on
conductor's step deadline. Since generate_thumbnail is not required
(workflow.PlanSteps), that expiry never fails the workflow — it only
leaves one inert failed workflow_steps row and one otherwise-unactionable
DLQ record per audio upload. Fixing this cleanly needs conductor to know
media_type at planning time (it already fetches Media for owner_id) and
skip the step outright for audio; deferred rather than done partially
here.
"""

from __future__ import annotations

from deps import Deps
from events import StepCommand
from providers import thumbnail

DERIVATIVE_TYPE = "thumbnail"
VERSION = 1


def handle(cmd: StepCommand, deps: Deps) -> None:
    media = deps.media.get_media(cmd.media_id)
    if media.media_type != "video":
        return

    source_url = deps.media.sign_playback_url(cmd.media_id)

    with deps.limits.for_step(cmd.step).acquire():
        webp_bytes = thumbnail.generate_thumbnail(source_url, media.duration_ms)

    object_key = f"media/{cmd.media_id}/thumbnail/v{VERSION}.webp"
    deps.objects.put_object(object_key, webp_bytes, content_type="image/webp")

    deps.media.register_derivative(
        media_id=cmd.media_id,
        derivative_type=DERIVATIVE_TYPE,
        version=VERSION,
        object_key=object_key,
        mime_type="image/webp",
        width=thumbnail.THUMBNAIL_WIDTH,
        height=thumbnail.THUMBNAIL_HEIGHT,
        size_bytes=len(webp_bytes),
        idempotency_key=cmd.idempotency_key,
    )
