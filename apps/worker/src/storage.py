from __future__ import annotations

import io
import os
import urllib.request
import uuid

from minio import Minio


def get_minio() -> Minio:
    return Minio(
        endpoint=os.environ["MINIO_ENDPOINT"],
        access_key=os.environ["MINIO_ACCESS_KEY"],
        secret_key=os.environ["MINIO_SECRET_KEY"],
        secure=os.environ.get("MINIO_USE_SSL", "false").lower() == "true",
    )


def download_media(url: str) -> bytes:
    with urllib.request.urlopen(url) as response:
        return response.read()


def upload_audio(data: bytes, filename: str) -> str:
    client = get_minio()
    object_name = f"{uuid.uuid4()}-{filename}"
    client.put_object(
        bucket_name="summaries",
        object_name=object_name,
        data=io.BytesIO(data),
        length=len(data),
        content_type="audio/mpeg",
    )
    endpoint = os.environ["MINIO_ENDPOINT"]
    use_ssl = os.environ.get("MINIO_USE_SSL", "false").lower() == "true"
    protocol = "https" if use_ssl else "http"
    return f"{protocol}://{endpoint}/summaries/{object_name}"
