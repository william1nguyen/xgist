"""gRPC client for media, per docs/architecture.md's gRPC boundaries:
conductor-worker calls media to read media metadata/object access and to
register a derivative after writing it to object storage.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

import grpc
from media_notes.media.v1 import media_pb2, media_pb2_grpc


@dataclass
class Media:
    id: str
    owner_id: str
    title: str
    media_type: str  # "audio" | "video"
    mime_type: str
    size_bytes: int
    duration_ms: int


@dataclass
class Derivative:
    id: str
    media_id: str
    derivative_type: str
    version: int
    object_key: str


_MEDIA_TYPE_TO_STR = {
    media_pb2.MEDIA_TYPE_AUDIO: "audio",
    media_pb2.MEDIA_TYPE_VIDEO: "video",
}

_DERIVATIVE_TYPE_FROM_STR = {
    "thumbnail": media_pb2.DERIVATIVE_TYPE_THUMBNAIL,
    "cover": media_pb2.DERIVATIVE_TYPE_COVER,
    "waveform": media_pb2.DERIVATIVE_TYPE_WAVEFORM,
}


class MediaClient:
    """Wraps media_notes.media.v1.MediaService. Every write is idempotent
    per a caller-supplied idempotency key, matching media.proto.
    """

    def __init__(self, addr: str) -> None:
        self._channel = grpc.insecure_channel(addr)
        self._stub = media_pb2_grpc.MediaServiceStub(self._channel)

    def close(self) -> None:
        self._channel.close()

    def get_media(self, media_id: str) -> Media:
        resp = self._stub.GetMedia(media_pb2.GetMediaRequest(media_id=media_id))
        m = resp.media
        return Media(
            id=m.id,
            owner_id=m.owner_id,
            title=m.title,
            media_type=_MEDIA_TYPE_TO_STR.get(m.media_type, "audio"),
            mime_type=m.mime_type,
            size_bytes=m.size_bytes,
            duration_ms=m.duration_ms,
        )

    def sign_playback_url(self, media_id: str) -> str:
        """Returns a short-lived signed URL to read the source object.
        Workers never read a raw object key or bucket directly — media
        owns the object key inventory (docs/architecture.md).
        """
        resp = self._stub.SignPlaybackUrl(media_pb2.SignPlaybackUrlRequest(media_id=media_id))
        return resp.url

    def register_derivative(
        self,
        *,
        media_id: str,
        derivative_type: str,
        version: int,
        object_key: str,
        mime_type: str,
        width: int = 0,
        height: int = 0,
        size_bytes: int = 0,
        idempotency_key: str | None = None,
    ) -> Derivative:
        resp = self._stub.RegisterDerivative(
            media_pb2.RegisterDerivativeRequest(
                idempotency_key=idempotency_key or str(uuid.uuid4()),
                media_id=media_id,
                derivative_type=_DERIVATIVE_TYPE_FROM_STR[derivative_type],
                version=version,
                object_key=object_key,
                mime_type=mime_type,
                width=width,
                height=height,
                size_bytes=size_bytes,
            )
        )
        d = resp.derivative
        return Derivative(
            id=d.id, media_id=d.media_id, derivative_type=derivative_type,
            version=d.version, object_key=object_key,
        )
