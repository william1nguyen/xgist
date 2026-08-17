import json

import events


def test_parse_step_command_decodes_every_field():
    raw = json.dumps({
        "event_id": "e1", "media_id": "m1", "workflow_id": "w1",
        "step_id": "s1", "step": "transcribe", "attempt": 2, "idempotency_key": "s1:2",
    }).encode()

    cmd = events.parse_step_command(raw)

    assert cmd.event_id == "e1"
    assert cmd.media_id == "m1"
    assert cmd.workflow_id == "w1"
    assert cmd.step == "transcribe"
    assert cmd.attempt == 2
    assert cmd.idempotency_key == "s1:2"


class FakeProducer:
    def __init__(self):
        self.sent = []

    def send(self, topic, key=None, value=None):
        self.sent.append((topic, key, value))

    def flush(self):
        pass


def test_publish_step_failed_sends_classified_metadata_only():
    producer = FakeProducer()

    events.publish_step_failed(
        producer,
        media_id="media-1", workflow_id="workflow-1", step="summary",
        attempt=2, error_code="provider_timeout", retriable=True,
    )

    assert len(producer.sent) == 1
    topic, key, value = producer.sent[0]
    assert topic == events.STEP_FAILED_TOPIC
    assert key == b"media-1"

    payload = json.loads(value)
    assert payload["media_id"] == "media-1"
    assert payload["workflow_id"] == "workflow-1"
    assert payload["step"] == "summary"
    assert payload["attempt"] == 2
    assert payload["error_code"] == "provider_timeout"
    assert payload["retriable"] is True
    assert "event_id" in payload
    # Never text, media bytes, or a provider response (ADR 0003).
    assert set(payload.keys()) == {"event_id", "media_id", "workflow_id", "step", "attempt", "error_code", "retriable"}


def test_run_consumer_commits_after_each_message_and_stops_on_should_stop():
    handled = []
    committed = []
    stop_after_handling_b = {"flag": False}

    def handle(msg):
        handled.append(msg)
        if msg == "b":
            stop_after_handling_b["flag"] = True

    class FakeConsumer:
        def __init__(self):
            self._polls = iter([
                {"tp0": ["a", "b"]},  # one poll cycle can yield several messages
                {"tp0": ["c"]},  # never reached: should_stop() fires right after "b"
            ])

        def poll(self, timeout_ms):
            return next(self._polls, {})

        def commit(self):
            committed.append(len(handled))

    events.run_consumer(FakeConsumer(), handle, should_stop=lambda: stop_after_handling_b["flag"])

    assert handled == ["a", "b"]
    assert committed == [1, 2]


def test_run_consumer_exits_promptly_when_idle_and_asked_to_stop():
    """The bug this guards against: a plain `for message in consumer`
    loop blocks forever when idle and never re-checks a stop signal, so
    SIGTERM can't end the process until a message arrives. Polling with a
    timeout must check should_stop() even on an empty poll.
    """
    poll_calls = []

    class FakeConsumer:
        def poll(self, timeout_ms):
            poll_calls.append(timeout_ms)
            return {}  # idle: no messages, ever

        def commit(self):
            raise AssertionError("commit must not be called when no message was handled")

    calls = {"n": 0}

    def should_stop():
        calls["n"] += 1
        return calls["n"] >= 3  # stop after a few idle poll cycles

    events.run_consumer(FakeConsumer(), handle=lambda msg: None, should_stop=should_stop, poll_timeout_ms=10)

    assert len(poll_calls) == 2  # should_stop() is checked before each poll
    assert calls["n"] == 3
