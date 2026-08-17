"""dispatch.py routes a decoded step command to its handler by step kind,
classifies any failure, and reports it — the shared plumbing every
handle_* in handlers/ sits behind (docs/services/worker.md).
"""

from __future__ import annotations

import logging

from deps import Deps
from errors import classify
from events import StepCommand
from handlers import keypoints, keywords, notes, summary, summary_audio, thumbnail, transcribe

logger = logging.getLogger(__name__)

_HANDLERS = {
    "transcribe": transcribe.handle,
    "summary": summary.handle,
    "keywords": keywords.handle,
    "keypoints": keypoints.handle,
    "notes": notes.handle,
    "summary_audio": summary_audio.handle,
    "generate_thumbnail": thumbnail.handle,
}


class Outcome:
    """Result of dispatching one command: either it succeeded (the owning
    service already committed the durable result and its own completion
    event) or it failed with a classified (error_code, retriable) pair to
    publish on mn.processing.step.failed.v1.
    """

    def __init__(self, ok: bool, error_code: str = "", retriable: bool = False) -> None:
        self.ok = ok
        self.error_code = error_code
        self.retriable = retriable


def dispatch(cmd: StepCommand, deps: Deps) -> Outcome:
    handler = _HANDLERS.get(cmd.step)
    if handler is None:
        logger.error("no handler for step=%s, treating as a terminal failure", cmd.step)
        return Outcome(ok=False, error_code="unknown_step", retriable=False)

    try:
        handler(cmd, deps)
    except Exception as e:  # noqa: BLE001 - every exception must be classified and reported, not raised
        error_code, retriable = classify(e)
        logger.warning(
            "step=%s media_id=%s attempt=%d failed error_code=%s retriable=%s: %s",
            cmd.step, cmd.media_id, cmd.attempt, error_code, retriable, e,
        )
        return Outcome(ok=False, error_code=error_code, retriable=retriable)

    logger.info("step=%s media_id=%s attempt=%d completed", cmd.step, cmd.media_id, cmd.attempt)
    return Outcome(ok=True)
