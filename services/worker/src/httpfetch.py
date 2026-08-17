"""Plain HTTP fetch for a media object's short-lived signed URL. Workers
never read a raw object key or bucket directly — media signs the URL
(clients.media_client.MediaClient.sign_playback_url), and this just
follows it, matching the source and derivative access described in
docs/architecture.md's gRPC boundaries.
"""

from __future__ import annotations

import urllib.request


def download(url: str) -> bytes:
    with urllib.request.urlopen(url) as response:  # noqa: S310 - signed, short-lived, internal URL
        return response.read()
