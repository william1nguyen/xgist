import os
import io
import pytest
from fastapi.testclient import TestClient
from app import app

@pytest.fixture(autouse=True)
def set_api_key_env(monkeypatch):
    monkeypatch.setenv("X_API_KEY", "test-key")


def _client():
    client = TestClient(app)
    client.headers.update({"x-api-key": "test-key"})
    return client


def test_health_transcribe_form_upload():
    client = _client()
    # Small fake mp4 bytes; whisper will likely fail if executed, so we mock later if needed.
    # Here we just ensure routing and auth work, so we expect 500 if model fails deeply.
    response = client.post(
        "/transcribe/",
        files={"file": ("tiny.mp4", b"\x00\x00\x00\x18ftypmp42", "video/mp4")},
    )
    # Accept either 200 with structure or 500 from model; route shouldn't 401/404
    assert response.status_code in (200, 500)


def test_health_transcribe_stream_raw():
    client = _client()
    response = client.post(
        "/transcribe-stream/",
        data=b"\x00\x00\x00\x18ftypmp42",
        headers={"Content-Type": "video/mp4"},
    )
    assert response.status_code in (200, 400, 500)


