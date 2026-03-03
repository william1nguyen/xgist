from __future__ import annotations

import json
import os
import redis

STREAM_JOBS = "stream:jobs"
STREAM_RESULTS = "stream:results"
CONSUMER_GROUP_WORKERS = "workers"
CONSUMER_NAME = "worker-1"
STALE_THRESHOLD_MS = 60_000


def get_redis() -> redis.Redis:
    return redis.from_url(os.environ["REDIS_URL"], decode_responses=True)


def ensure_consumer_group(r: redis.Redis) -> None:
    try:
        r.xgroup_create(STREAM_JOBS, CONSUMER_GROUP_WORKERS, id="0", mkstream=True)
    except redis.exceptions.ResponseError as e:
        if "BUSYGROUP" not in str(e):
            raise


def consume_jobs(r: redis.Redis) -> list[tuple[str, dict[str, str]]]:
    reclaimed = _reclaim_stale(r)
    if reclaimed:
        return reclaimed

    results = r.xreadgroup(
        CONSUMER_GROUP_WORKERS,
        CONSUMER_NAME,
        {STREAM_JOBS: ">"},
        count=1,
        block=5000,
    )
    if not results:
        return []

    entries: list[tuple[str, dict[str, str]]] = []
    for _, messages in results:
        for msg_id, fields in messages:
            entries.append((msg_id, fields))
    return entries


def _reclaim_stale(r: redis.Redis) -> list[tuple[str, dict[str, str]]]:
    pending = r.xpending_range(
        STREAM_JOBS,
        CONSUMER_GROUP_WORKERS,
        min="-",
        max="+",
        count=1,
        idle=STALE_THRESHOLD_MS,
    )
    if not pending:
        return []

    entries: list[tuple[str, dict[str, str]]] = []
    for item in pending:
        msg_id = item["message_id"]
        claimed = r.xclaim(
            STREAM_JOBS,
            CONSUMER_GROUP_WORKERS,
            CONSUMER_NAME,
            STALE_THRESHOLD_MS,
            [msg_id],
        )
        for claimed_id, fields in claimed:
            entries.append((claimed_id, fields))
    return entries


def ack_job(r: redis.Redis, msg_id: str) -> None:
    r.xack(STREAM_JOBS, CONSUMER_GROUP_WORKERS, msg_id)


def publish_result(r: redis.Redis, result: dict) -> None:
    key_map = {
        "job_id": "jobId",
        "video_id": "videoId",
        "audio_summary_url": "audioSummaryUrl",
        "summary_refs": "summaryRefs",
        "main_ideas": "mainIdeas",
    }
    fields: dict[str, str] = {}
    for key, value in result.items():
        out_key = key_map.get(key, key)
        if isinstance(value, (list, dict)):
            fields[out_key] = json.dumps(value)
        elif value is None:
            fields[out_key] = ""
        else:
            fields[out_key] = str(value)
    r.xadd(STREAM_RESULTS, fields)
