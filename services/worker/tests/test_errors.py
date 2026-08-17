import grpc

from errors import RetriableStepError, TerminalStepError, classify
from limits import CapacityUnavailable


class FakeRpcError(grpc.RpcError):
    def __init__(self, code: grpc.StatusCode, details: str = "") -> None:
        self._code = code
        self._details = details

    def code(self) -> grpc.StatusCode:
        return self._code

    def details(self) -> str:
        return self._details


def test_retriable_step_error_is_retriable():
    error_code, retriable = classify(RetriableStepError("provider_timeout"))
    assert error_code == "provider_timeout"
    assert retriable is True


def test_terminal_step_error_is_not_retriable():
    error_code, retriable = classify(TerminalStepError("safety_rejected"))
    assert error_code == "safety_rejected"
    assert retriable is False


def test_capacity_unavailable_is_retriable():
    error_code, retriable = classify(CapacityUnavailable("no capacity"))
    assert error_code == "capacity_unavailable"
    assert retriable is True


def test_grpc_unavailable_is_retriable():
    error_code, retriable = classify(FakeRpcError(grpc.StatusCode.UNAVAILABLE))
    assert error_code == "grpc_unavailable"
    assert retriable is True


def test_grpc_deadline_exceeded_is_retriable():
    _, retriable = classify(FakeRpcError(grpc.StatusCode.DEADLINE_EXCEEDED))
    assert retriable is True


def test_grpc_failed_precondition_is_terminal():
    error_code, retriable = classify(FakeRpcError(grpc.StatusCode.FAILED_PRECONDITION))
    assert error_code == "grpc_failed_precondition"
    assert retriable is False


def test_grpc_invalid_argument_is_terminal():
    _, retriable = classify(FakeRpcError(grpc.StatusCode.INVALID_ARGUMENT))
    assert retriable is False


def test_timeout_error_is_retriable():
    _, retriable = classify(TimeoutError("took too long"))
    assert retriable is True


def test_unclassified_exception_defaults_to_retriable():
    error_code, retriable = classify(ValueError("something unexpected"))
    assert error_code == "internal_error"
    assert retriable is True
