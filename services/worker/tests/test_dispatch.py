import dispatch
from errors import TerminalStepError
from events import StepCommand

CMD = StepCommand(
    event_id="e1", media_id="m1", workflow_id="w1", step_id="s1",
    step="transcribe", attempt=1, idempotency_key="s1:1",
)


def test_dispatch_routes_to_the_matching_handler(monkeypatch):
    calls = []
    monkeypatch.setitem(dispatch._HANDLERS, "transcribe", lambda cmd, deps: calls.append((cmd, deps)))

    outcome = dispatch.dispatch(CMD, deps="fake-deps")

    assert outcome.ok is True
    assert calls == [(CMD, "fake-deps")]


def test_dispatch_reports_unknown_step_as_terminal(monkeypatch):
    cmd = StepCommand(event_id="e", media_id="m", workflow_id="w", step_id="s",
                       step="not_a_real_step", attempt=1, idempotency_key="k")

    outcome = dispatch.dispatch(cmd, deps=None)

    assert outcome.ok is False
    assert outcome.error_code == "unknown_step"
    assert outcome.retriable is False


def test_dispatch_classifies_a_terminal_step_error(monkeypatch):
    def failing_handler(cmd, deps):
        raise TerminalStepError("summary_not_found")

    monkeypatch.setitem(dispatch._HANDLERS, "transcribe", failing_handler)

    outcome = dispatch.dispatch(CMD, deps=None)

    assert outcome.ok is False
    assert outcome.error_code == "summary_not_found"
    assert outcome.retriable is False


def test_dispatch_classifies_an_unexpected_exception_as_retriable(monkeypatch):
    def failing_handler(cmd, deps):
        raise ValueError("boom")

    monkeypatch.setitem(dispatch._HANDLERS, "transcribe", failing_handler)

    outcome = dispatch.dispatch(CMD, deps=None)

    assert outcome.ok is False
    assert outcome.error_code == "internal_error"
    assert outcome.retriable is True
