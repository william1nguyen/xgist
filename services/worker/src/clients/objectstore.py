"""MinIO client for the write side of the derivative/summary-audio flow:
worker uploads the object, then registers its key through media or content
(never the reverse — object storage never stores generated text, per
docs/architecture.md's storage boundary).
"""

from __future__ import annotations

import io

from minio import Minio


class ObjectStore:
    def __init__(self, *, endpoint: str, access_key: str, secret_key: str, secure: bool, bucket: str) -> None:
        self._client = Minio(endpoint=endpoint, access_key=access_key, secret_key=secret_key, secure=secure)
        self._bucket = bucket

    def put_object(self, object_key: str, data: bytes, content_type: str) -> str:
        """Writes data under object_key and returns it unchanged, so
        callers can chain straight into media.RegisterDerivative or
        content.StoreSummaryAudioMetadata.
        """
        self._client.put_object(
            bucket_name=self._bucket,
            object_name=object_key,
            data=io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return object_key
