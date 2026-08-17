"""gRPC client for content, per docs/architecture.md's gRPC boundaries:
conductor-worker reads transcript/summary inputs and commits structured
step output through content.
"""

from __future__ import annotations

from dataclasses import dataclass

import grpc
from media_notes.content.v1 import content_pb2, content_pb2_grpc


@dataclass
class TranscriptSegment:
    segment_index: int
    start_ms: int
    end_ms: int
    speaker: str
    text: str


@dataclass
class Transcript:
    media_id: str
    language: str
    text: str
    segments: list[TranscriptSegment]


@dataclass
class SummarySentence:
    sentence_index: int
    text: str
    cited_segment_indexes: list[int]


class ContentClient:
    """Wraps media_notes.content.v1.ContentService. Every Store* call is
    idempotent per idempotency_key and rejects an attempt lower than the
    highest already applied for that step (content.proto).
    """

    def __init__(self, addr: str) -> None:
        self._channel = grpc.insecure_channel(addr)
        self._stub = content_pb2_grpc.ContentServiceStub(self._channel)

    def close(self) -> None:
        self._channel.close()

    def get_transcript(self, media_id: str) -> Transcript:
        resp = self._stub.GetTranscript(content_pb2.GetTranscriptRequest(media_id=media_id))
        t = resp.transcript
        return Transcript(
            media_id=t.media_id,
            language=t.language,
            text=t.text,
            segments=[
                TranscriptSegment(
                    segment_index=s.segment_index, start_ms=s.start_ms, end_ms=s.end_ms,
                    speaker=s.speaker, text=s.text,
                )
                for s in t.segments
            ],
        )

    def get_summary_text(self, media_id: str, summary_type: str) -> str:
        """Reads committed summary text for the summary_audio step, per
        architecture.md's "summary audio" flow (worker reads content's
        committed summary, never text passed through Kafka).
        """
        resp = self._stub.GetContent(content_pb2.GetContentRequest(media_id=media_id))
        for summary in resp.content.summaries:
            if summary.summary_type == summary_type:
                return summary.text
        raise LookupError(f"no committed summary of type {summary_type!r} for media {media_id}")

    def store_transcript(
        self, *, idempotency_key: str, media_id: str, workflow_id: str, attempt: int,
        language: str, text: str, segments: list[TranscriptSegment],
    ) -> None:
        self._stub.StoreTranscript(content_pb2.StoreTranscriptRequest(
            idempotency_key=idempotency_key, media_id=media_id, workflow_id=workflow_id, attempt=attempt,
            language=language, text=text,
            segments=[
                content_pb2.TranscriptSegment(
                    segment_index=s.segment_index, start_ms=s.start_ms, end_ms=s.end_ms,
                    speaker=s.speaker, text=s.text,
                )
                for s in segments
            ],
        ))

    def store_summary(
        self, *, idempotency_key: str, media_id: str, workflow_id: str, attempt: int,
        summary_type: str, text: str, model: str, prompt_version: str, sentences: list[SummarySentence],
    ) -> None:
        self._stub.StoreSummary(content_pb2.StoreSummaryRequest(
            idempotency_key=idempotency_key, media_id=media_id, workflow_id=workflow_id, attempt=attempt,
            summary_type=summary_type, text=text, model=model, prompt_version=prompt_version,
            sentences=[
                content_pb2.SummarySentence(
                    sentence_index=s.sentence_index, text=s.text, cited_segment_indexes=s.cited_segment_indexes,
                )
                for s in sentences
            ],
        ))

    def store_keywords(
        self, *, idempotency_key: str, media_id: str, workflow_id: str, attempt: int,
        keywords: list[tuple[str, float, int]],
    ) -> None:
        """keywords is a list of (keyword, score, position)."""
        self._stub.StoreKeywords(content_pb2.StoreKeywordsRequest(
            idempotency_key=idempotency_key, media_id=media_id, workflow_id=workflow_id, attempt=attempt,
            keywords=[
                content_pb2.Keyword(keyword=k, score=score, position=position)
                for k, score, position in keywords
            ],
        ))

    def store_keypoints(
        self, *, idempotency_key: str, media_id: str, workflow_id: str, attempt: int,
        keypoints: list[tuple[int, str, int, int]],
    ) -> None:
        """keypoints is a list of (point_index, text, start_segment, end_segment)."""
        self._stub.StoreKeypoints(content_pb2.StoreKeypointsRequest(
            idempotency_key=idempotency_key, media_id=media_id, workflow_id=workflow_id, attempt=attempt,
            keypoints=[
                content_pb2.Keypoint(point_index=i, text=text, start_segment=start, end_segment=end)
                for i, text, start, end in keypoints
            ],
        ))

    def store_notes(
        self, *, idempotency_key: str, media_id: str, workflow_id: str, attempt: int, format: str, body: str,
    ) -> None:
        self._stub.StoreNotes(content_pb2.StoreNotesRequest(
            idempotency_key=idempotency_key, media_id=media_id, workflow_id=workflow_id, attempt=attempt,
            format=format, body=body,
        ))

    def store_summary_audio_metadata(
        self, *, idempotency_key: str, media_id: str, workflow_id: str, attempt: int,
        summary_type: str, object_key: str, mime_type: str, duration_ms: int, voice: str,
    ) -> None:
        self._stub.StoreSummaryAudioMetadata(content_pb2.StoreSummaryAudioMetadataRequest(
            idempotency_key=idempotency_key, media_id=media_id, workflow_id=workflow_id, attempt=attempt,
            summary_type=summary_type, object_key=object_key, mime_type=mime_type,
            duration_ms=duration_ms, voice=voice,
        ))

    def complete_script_draft(self, *, job_id: str, script_text: str) -> None:
        self._stub.CompleteScriptDraft(content_pb2.CompleteScriptDraftRequest(
            job_id=job_id, script_text=script_text,
        ))

    def complete_standalone_audio(
        self, *, job_id: str, object_key: str, mime_type: str, duration_ms: int, voice: str,
    ) -> None:
        self._stub.CompleteStandaloneAudio(content_pb2.CompleteStandaloneAudioRequest(
            job_id=job_id, object_key=object_key, mime_type=mime_type,
            duration_ms=duration_ms, voice=voice,
        ))

    def fail_standalone_audio_job(self, *, job_id: str, error_code: str) -> None:
        self._stub.FailStandaloneAudioJob(content_pb2.FailStandaloneAudioJobRequest(
            job_id=job_id, error_code=error_code,
        ))
