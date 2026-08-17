import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class AccountState(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    ACCOUNT_STATE_UNSPECIFIED: _ClassVar[AccountState]
    ACCOUNT_STATE_ACTIVE: _ClassVar[AccountState]
    ACCOUNT_STATE_DELETION_PENDING: _ClassVar[AccountState]
    ACCOUNT_STATE_TOMBSTONED: _ClassVar[AccountState]

class DeletionState(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    DELETION_STATE_UNSPECIFIED: _ClassVar[DeletionState]
    DELETION_STATE_PENDING: _ClassVar[DeletionState]
    DELETION_STATE_COMPLETED: _ClassVar[DeletionState]
    DELETION_STATE_FAILED_ATTENTION_REQUIRED: _ClassVar[DeletionState]
ACCOUNT_STATE_UNSPECIFIED: AccountState
ACCOUNT_STATE_ACTIVE: AccountState
ACCOUNT_STATE_DELETION_PENDING: AccountState
ACCOUNT_STATE_TOMBSTONED: AccountState
DELETION_STATE_UNSPECIFIED: DeletionState
DELETION_STATE_PENDING: DeletionState
DELETION_STATE_COMPLETED: DeletionState
DELETION_STATE_FAILED_ATTENTION_REQUIRED: DeletionState

class User(_message.Message):
    __slots__ = ("id", "email", "name", "image_url", "email_verified", "state", "created_at")
    ID_FIELD_NUMBER: _ClassVar[int]
    EMAIL_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    IMAGE_URL_FIELD_NUMBER: _ClassVar[int]
    EMAIL_VERIFIED_FIELD_NUMBER: _ClassVar[int]
    STATE_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    id: str
    email: str
    name: str
    image_url: str
    email_verified: bool
    state: AccountState
    created_at: _timestamp_pb2.Timestamp
    def __init__(self, id: _Optional[str] = ..., email: _Optional[str] = ..., name: _Optional[str] = ..., image_url: _Optional[str] = ..., email_verified: _Optional[bool] = ..., state: _Optional[_Union[AccountState, str]] = ..., created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class DeletionOperation(_message.Message):
    __slots__ = ("deletion_id", "user_id", "state", "created_at", "completed_at")
    DELETION_ID_FIELD_NUMBER: _ClassVar[int]
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    STATE_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    COMPLETED_AT_FIELD_NUMBER: _ClassVar[int]
    deletion_id: str
    user_id: str
    state: DeletionState
    created_at: _timestamp_pb2.Timestamp
    completed_at: _timestamp_pb2.Timestamp
    def __init__(self, deletion_id: _Optional[str] = ..., user_id: _Optional[str] = ..., state: _Optional[_Union[DeletionState, str]] = ..., created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., completed_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class RegisterAccountRequest(_message.Message):
    __slots__ = ("idempotency_key", "email", "password", "name")
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    EMAIL_FIELD_NUMBER: _ClassVar[int]
    PASSWORD_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    email: str
    password: str
    name: str
    def __init__(self, idempotency_key: _Optional[str] = ..., email: _Optional[str] = ..., password: _Optional[str] = ..., name: _Optional[str] = ...) -> None: ...

class RegisterAccountResponse(_message.Message):
    __slots__ = ("user",)
    USER_FIELD_NUMBER: _ClassVar[int]
    user: User
    def __init__(self, user: _Optional[_Union[User, _Mapping]] = ...) -> None: ...

class AuthenticateRequest(_message.Message):
    __slots__ = ("idempotency_key", "email", "password")
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    EMAIL_FIELD_NUMBER: _ClassVar[int]
    PASSWORD_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    email: str
    password: str
    def __init__(self, idempotency_key: _Optional[str] = ..., email: _Optional[str] = ..., password: _Optional[str] = ...) -> None: ...

class AuthenticateResponse(_message.Message):
    __slots__ = ("user", "session_token", "expires_at")
    USER_FIELD_NUMBER: _ClassVar[int]
    SESSION_TOKEN_FIELD_NUMBER: _ClassVar[int]
    EXPIRES_AT_FIELD_NUMBER: _ClassVar[int]
    user: User
    session_token: str
    expires_at: _timestamp_pb2.Timestamp
    def __init__(self, user: _Optional[_Union[User, _Mapping]] = ..., session_token: _Optional[str] = ..., expires_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class ValidateSessionRequest(_message.Message):
    __slots__ = ("session_token",)
    SESSION_TOKEN_FIELD_NUMBER: _ClassVar[int]
    session_token: str
    def __init__(self, session_token: _Optional[str] = ...) -> None: ...

class ValidateSessionResponse(_message.Message):
    __slots__ = ("user", "session_id")
    USER_FIELD_NUMBER: _ClassVar[int]
    SESSION_ID_FIELD_NUMBER: _ClassVar[int]
    user: User
    session_id: str
    def __init__(self, user: _Optional[_Union[User, _Mapping]] = ..., session_id: _Optional[str] = ...) -> None: ...

class RevokeSessionRequest(_message.Message):
    __slots__ = ("session_id",)
    SESSION_ID_FIELD_NUMBER: _ClassVar[int]
    session_id: str
    def __init__(self, session_id: _Optional[str] = ...) -> None: ...

class RevokeSessionResponse(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class GetUserRequest(_message.Message):
    __slots__ = ("user_id",)
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    def __init__(self, user_id: _Optional[str] = ...) -> None: ...

class GetUserResponse(_message.Message):
    __slots__ = ("user",)
    USER_FIELD_NUMBER: _ClassVar[int]
    user: User
    def __init__(self, user: _Optional[_Union[User, _Mapping]] = ...) -> None: ...

class UpdateUserRequest(_message.Message):
    __slots__ = ("idempotency_key", "user_id", "name", "image_url")
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    IMAGE_URL_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    user_id: str
    name: str
    image_url: str
    def __init__(self, idempotency_key: _Optional[str] = ..., user_id: _Optional[str] = ..., name: _Optional[str] = ..., image_url: _Optional[str] = ...) -> None: ...

class UpdateUserResponse(_message.Message):
    __slots__ = ("user",)
    USER_FIELD_NUMBER: _ClassVar[int]
    user: User
    def __init__(self, user: _Optional[_Union[User, _Mapping]] = ...) -> None: ...

class RequestAccountDeletionRequest(_message.Message):
    __slots__ = ("idempotency_key", "user_id")
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    user_id: str
    def __init__(self, idempotency_key: _Optional[str] = ..., user_id: _Optional[str] = ...) -> None: ...

class RequestAccountDeletionResponse(_message.Message):
    __slots__ = ("operation",)
    OPERATION_FIELD_NUMBER: _ClassVar[int]
    operation: DeletionOperation
    def __init__(self, operation: _Optional[_Union[DeletionOperation, _Mapping]] = ...) -> None: ...

class GetAccountDeletionStatusRequest(_message.Message):
    __slots__ = ("deletion_id",)
    DELETION_ID_FIELD_NUMBER: _ClassVar[int]
    deletion_id: str
    def __init__(self, deletion_id: _Optional[str] = ...) -> None: ...

class GetAccountDeletionStatusResponse(_message.Message):
    __slots__ = ("operation",)
    OPERATION_FIELD_NUMBER: _ClassVar[int]
    operation: DeletionOperation
    def __init__(self, operation: _Optional[_Union[DeletionOperation, _Mapping]] = ...) -> None: ...
