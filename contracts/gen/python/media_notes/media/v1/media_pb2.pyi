import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class MediaType(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    MEDIA_TYPE_UNSPECIFIED: _ClassVar[MediaType]
    MEDIA_TYPE_AUDIO: _ClassVar[MediaType]
    MEDIA_TYPE_VIDEO: _ClassVar[MediaType]

class MediaStatus(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    MEDIA_STATUS_UNSPECIFIED: _ClassVar[MediaStatus]
    MEDIA_STATUS_PENDING_UPLOAD: _ClassVar[MediaStatus]
    MEDIA_STATUS_PROCESSING: _ClassVar[MediaStatus]
    MEDIA_STATUS_COMPLETED: _ClassVar[MediaStatus]
    MEDIA_STATUS_FAILED: _ClassVar[MediaStatus]
    MEDIA_STATUS_DELETION_PENDING: _ClassVar[MediaStatus]

class UploadSessionStatus(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    UPLOAD_SESSION_STATUS_UNSPECIFIED: _ClassVar[UploadSessionStatus]
    UPLOAD_SESSION_STATUS_ACTIVE: _ClassVar[UploadSessionStatus]
    UPLOAD_SESSION_STATUS_COMPLETED: _ClassVar[UploadSessionStatus]
    UPLOAD_SESSION_STATUS_EXPIRED: _ClassVar[UploadSessionStatus]
    UPLOAD_SESSION_STATUS_CANCELED: _ClassVar[UploadSessionStatus]

class DerivativeType(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    DERIVATIVE_TYPE_UNSPECIFIED: _ClassVar[DerivativeType]
    DERIVATIVE_TYPE_THUMBNAIL: _ClassVar[DerivativeType]
    DERIVATIVE_TYPE_COVER: _ClassVar[DerivativeType]
    DERIVATIVE_TYPE_WAVEFORM: _ClassVar[DerivativeType]

class DerivativeStatus(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    DERIVATIVE_STATUS_UNSPECIFIED: _ClassVar[DerivativeStatus]
    DERIVATIVE_STATUS_PENDING: _ClassVar[DerivativeStatus]
    DERIVATIVE_STATUS_READY: _ClassVar[DerivativeStatus]
    DERIVATIVE_STATUS_FAILED: _ClassVar[DerivativeStatus]

class DeletionState(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    DELETION_STATE_UNSPECIFIED: _ClassVar[DeletionState]
    DELETION_STATE_PENDING: _ClassVar[DeletionState]
    DELETION_STATE_COMPLETED: _ClassVar[DeletionState]
    DELETION_STATE_FAILED_ATTENTION_REQUIRED: _ClassVar[DeletionState]

class ProcessingStatus(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    PROCESSING_STATUS_UNSPECIFIED: _ClassVar[ProcessingStatus]
    PROCESSING_STATUS_REQUESTED: _ClassVar[ProcessingStatus]
    PROCESSING_STATUS_ACCEPTED: _ClassVar[ProcessingStatus]
    PROCESSING_STATUS_COMPLETED: _ClassVar[ProcessingStatus]
    PROCESSING_STATUS_FAILED: _ClassVar[ProcessingStatus]
MEDIA_TYPE_UNSPECIFIED: MediaType
MEDIA_TYPE_AUDIO: MediaType
MEDIA_TYPE_VIDEO: MediaType
MEDIA_STATUS_UNSPECIFIED: MediaStatus
MEDIA_STATUS_PENDING_UPLOAD: MediaStatus
MEDIA_STATUS_PROCESSING: MediaStatus
MEDIA_STATUS_COMPLETED: MediaStatus
MEDIA_STATUS_FAILED: MediaStatus
MEDIA_STATUS_DELETION_PENDING: MediaStatus
UPLOAD_SESSION_STATUS_UNSPECIFIED: UploadSessionStatus
UPLOAD_SESSION_STATUS_ACTIVE: UploadSessionStatus
UPLOAD_SESSION_STATUS_COMPLETED: UploadSessionStatus
UPLOAD_SESSION_STATUS_EXPIRED: UploadSessionStatus
UPLOAD_SESSION_STATUS_CANCELED: UploadSessionStatus
DERIVATIVE_TYPE_UNSPECIFIED: DerivativeType
DERIVATIVE_TYPE_THUMBNAIL: DerivativeType
DERIVATIVE_TYPE_COVER: DerivativeType
DERIVATIVE_TYPE_WAVEFORM: DerivativeType
DERIVATIVE_STATUS_UNSPECIFIED: DerivativeStatus
DERIVATIVE_STATUS_PENDING: DerivativeStatus
DERIVATIVE_STATUS_READY: DerivativeStatus
DERIVATIVE_STATUS_FAILED: DerivativeStatus
DELETION_STATE_UNSPECIFIED: DeletionState
DELETION_STATE_PENDING: DeletionState
DELETION_STATE_COMPLETED: DeletionState
DELETION_STATE_FAILED_ATTENTION_REQUIRED: DeletionState
PROCESSING_STATUS_UNSPECIFIED: ProcessingStatus
PROCESSING_STATUS_REQUESTED: ProcessingStatus
PROCESSING_STATUS_ACCEPTED: ProcessingStatus
PROCESSING_STATUS_COMPLETED: ProcessingStatus
PROCESSING_STATUS_FAILED: ProcessingStatus

class UploadSession(_message.Message):
    __slots__ = ("id", "media_id", "owner_id", "object_key", "upload_url", "status", "expires_at")
    ID_FIELD_NUMBER: _ClassVar[int]
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    OWNER_ID_FIELD_NUMBER: _ClassVar[int]
    OBJECT_KEY_FIELD_NUMBER: _ClassVar[int]
    UPLOAD_URL_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    EXPIRES_AT_FIELD_NUMBER: _ClassVar[int]
    id: str
    media_id: str
    owner_id: str
    object_key: str
    upload_url: str
    status: UploadSessionStatus
    expires_at: _timestamp_pb2.Timestamp
    def __init__(self, id: _Optional[str] = ..., media_id: _Optional[str] = ..., owner_id: _Optional[str] = ..., object_key: _Optional[str] = ..., upload_url: _Optional[str] = ..., status: _Optional[_Union[UploadSessionStatus, str]] = ..., expires_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class CreateUploadSessionRequest(_message.Message):
    __slots__ = ("idempotency_key", "owner_id", "title", "media_type", "mime_type", "declared_size_bytes")
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    OWNER_ID_FIELD_NUMBER: _ClassVar[int]
    TITLE_FIELD_NUMBER: _ClassVar[int]
    MEDIA_TYPE_FIELD_NUMBER: _ClassVar[int]
    MIME_TYPE_FIELD_NUMBER: _ClassVar[int]
    DECLARED_SIZE_BYTES_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    owner_id: str
    title: str
    media_type: MediaType
    mime_type: str
    declared_size_bytes: int
    def __init__(self, idempotency_key: _Optional[str] = ..., owner_id: _Optional[str] = ..., title: _Optional[str] = ..., media_type: _Optional[_Union[MediaType, str]] = ..., mime_type: _Optional[str] = ..., declared_size_bytes: _Optional[int] = ...) -> None: ...

class CreateUploadSessionResponse(_message.Message):
    __slots__ = ("session",)
    SESSION_FIELD_NUMBER: _ClassVar[int]
    session: UploadSession
    def __init__(self, session: _Optional[_Union[UploadSession, _Mapping]] = ...) -> None: ...

class ConfirmUploadRequest(_message.Message):
    __slots__ = ("idempotency_key", "upload_session_id", "options", "audio_voice", "prompt_overrides")
    class PromptOverridesEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    UPLOAD_SESSION_ID_FIELD_NUMBER: _ClassVar[int]
    OPTIONS_FIELD_NUMBER: _ClassVar[int]
    AUDIO_VOICE_FIELD_NUMBER: _ClassVar[int]
    PROMPT_OVERRIDES_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    upload_session_id: str
    options: _containers.RepeatedScalarFieldContainer[str]
    audio_voice: str
    prompt_overrides: _containers.ScalarMap[str, str]
    def __init__(self, idempotency_key: _Optional[str] = ..., upload_session_id: _Optional[str] = ..., options: _Optional[_Iterable[str]] = ..., audio_voice: _Optional[str] = ..., prompt_overrides: _Optional[_Mapping[str, str]] = ...) -> None: ...

class ConfirmUploadResponse(_message.Message):
    __slots__ = ("media",)
    MEDIA_FIELD_NUMBER: _ClassVar[int]
    media: Media
    def __init__(self, media: _Optional[_Union[Media, _Mapping]] = ...) -> None: ...

class Media(_message.Message):
    __slots__ = ("id", "owner_id", "title", "media_type", "mime_type", "size_bytes", "duration_ms", "status", "thumbnail_url", "created_at", "updated_at", "description", "trashed_at")
    ID_FIELD_NUMBER: _ClassVar[int]
    OWNER_ID_FIELD_NUMBER: _ClassVar[int]
    TITLE_FIELD_NUMBER: _ClassVar[int]
    MEDIA_TYPE_FIELD_NUMBER: _ClassVar[int]
    MIME_TYPE_FIELD_NUMBER: _ClassVar[int]
    SIZE_BYTES_FIELD_NUMBER: _ClassVar[int]
    DURATION_MS_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    THUMBNAIL_URL_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    UPDATED_AT_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    TRASHED_AT_FIELD_NUMBER: _ClassVar[int]
    id: str
    owner_id: str
    title: str
    media_type: MediaType
    mime_type: str
    size_bytes: int
    duration_ms: int
    status: MediaStatus
    thumbnail_url: str
    created_at: _timestamp_pb2.Timestamp
    updated_at: _timestamp_pb2.Timestamp
    description: str
    trashed_at: _timestamp_pb2.Timestamp
    def __init__(self, id: _Optional[str] = ..., owner_id: _Optional[str] = ..., title: _Optional[str] = ..., media_type: _Optional[_Union[MediaType, str]] = ..., mime_type: _Optional[str] = ..., size_bytes: _Optional[int] = ..., duration_ms: _Optional[int] = ..., status: _Optional[_Union[MediaStatus, str]] = ..., thumbnail_url: _Optional[str] = ..., created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., updated_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., description: _Optional[str] = ..., trashed_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class GetMediaRequest(_message.Message):
    __slots__ = ("media_id",)
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    media_id: str
    def __init__(self, media_id: _Optional[str] = ...) -> None: ...

class GetMediaResponse(_message.Message):
    __slots__ = ("media",)
    MEDIA_FIELD_NUMBER: _ClassVar[int]
    media: Media
    def __init__(self, media: _Optional[_Union[Media, _Mapping]] = ...) -> None: ...

class ListMediaRequest(_message.Message):
    __slots__ = ("owner_id", "cursor", "page_size", "search")
    OWNER_ID_FIELD_NUMBER: _ClassVar[int]
    CURSOR_FIELD_NUMBER: _ClassVar[int]
    PAGE_SIZE_FIELD_NUMBER: _ClassVar[int]
    SEARCH_FIELD_NUMBER: _ClassVar[int]
    owner_id: str
    cursor: str
    page_size: int
    search: str
    def __init__(self, owner_id: _Optional[str] = ..., cursor: _Optional[str] = ..., page_size: _Optional[int] = ..., search: _Optional[str] = ...) -> None: ...

class ListMediaResponse(_message.Message):
    __slots__ = ("items", "next_cursor")
    ITEMS_FIELD_NUMBER: _ClassVar[int]
    NEXT_CURSOR_FIELD_NUMBER: _ClassVar[int]
    items: _containers.RepeatedCompositeFieldContainer[Media]
    next_cursor: str
    def __init__(self, items: _Optional[_Iterable[_Union[Media, _Mapping]]] = ..., next_cursor: _Optional[str] = ...) -> None: ...

class TrashMediaRequest(_message.Message):
    __slots__ = ("media_id",)
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    media_id: str
    def __init__(self, media_id: _Optional[str] = ...) -> None: ...

class TrashMediaResponse(_message.Message):
    __slots__ = ("media",)
    MEDIA_FIELD_NUMBER: _ClassVar[int]
    media: Media
    def __init__(self, media: _Optional[_Union[Media, _Mapping]] = ...) -> None: ...

class RestoreMediaRequest(_message.Message):
    __slots__ = ("media_id",)
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    media_id: str
    def __init__(self, media_id: _Optional[str] = ...) -> None: ...

class RestoreMediaResponse(_message.Message):
    __slots__ = ("media",)
    MEDIA_FIELD_NUMBER: _ClassVar[int]
    media: Media
    def __init__(self, media: _Optional[_Union[Media, _Mapping]] = ...) -> None: ...

class ListTrashedMediaRequest(_message.Message):
    __slots__ = ("owner_id", "cursor", "page_size")
    OWNER_ID_FIELD_NUMBER: _ClassVar[int]
    CURSOR_FIELD_NUMBER: _ClassVar[int]
    PAGE_SIZE_FIELD_NUMBER: _ClassVar[int]
    owner_id: str
    cursor: str
    page_size: int
    def __init__(self, owner_id: _Optional[str] = ..., cursor: _Optional[str] = ..., page_size: _Optional[int] = ...) -> None: ...

class ListTrashedMediaResponse(_message.Message):
    __slots__ = ("items", "next_cursor")
    ITEMS_FIELD_NUMBER: _ClassVar[int]
    NEXT_CURSOR_FIELD_NUMBER: _ClassVar[int]
    items: _containers.RepeatedCompositeFieldContainer[Media]
    next_cursor: str
    def __init__(self, items: _Optional[_Iterable[_Union[Media, _Mapping]]] = ..., next_cursor: _Optional[str] = ...) -> None: ...

class SignPlaybackUrlRequest(_message.Message):
    __slots__ = ("media_id",)
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    media_id: str
    def __init__(self, media_id: _Optional[str] = ...) -> None: ...

class SignPlaybackUrlResponse(_message.Message):
    __slots__ = ("url", "expires_at")
    URL_FIELD_NUMBER: _ClassVar[int]
    EXPIRES_AT_FIELD_NUMBER: _ClassVar[int]
    url: str
    expires_at: _timestamp_pb2.Timestamp
    def __init__(self, url: _Optional[str] = ..., expires_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class MediaProgress(_message.Message):
    __slots__ = ("media_id", "status", "processing_status", "completed_steps", "total_steps", "updated_at", "version")
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_STATUS_FIELD_NUMBER: _ClassVar[int]
    COMPLETED_STEPS_FIELD_NUMBER: _ClassVar[int]
    TOTAL_STEPS_FIELD_NUMBER: _ClassVar[int]
    UPDATED_AT_FIELD_NUMBER: _ClassVar[int]
    VERSION_FIELD_NUMBER: _ClassVar[int]
    media_id: str
    status: MediaStatus
    processing_status: ProcessingStatus
    completed_steps: int
    total_steps: int
    updated_at: _timestamp_pb2.Timestamp
    version: int
    def __init__(self, media_id: _Optional[str] = ..., status: _Optional[_Union[MediaStatus, str]] = ..., processing_status: _Optional[_Union[ProcessingStatus, str]] = ..., completed_steps: _Optional[int] = ..., total_steps: _Optional[int] = ..., updated_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., version: _Optional[int] = ...) -> None: ...

class GetMediaProgressRequest(_message.Message):
    __slots__ = ("owner_id", "media_ids")
    OWNER_ID_FIELD_NUMBER: _ClassVar[int]
    MEDIA_IDS_FIELD_NUMBER: _ClassVar[int]
    owner_id: str
    media_ids: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, owner_id: _Optional[str] = ..., media_ids: _Optional[_Iterable[str]] = ...) -> None: ...

class GetMediaProgressResponse(_message.Message):
    __slots__ = ("items",)
    ITEMS_FIELD_NUMBER: _ClassVar[int]
    items: _containers.RepeatedCompositeFieldContainer[MediaProgress]
    def __init__(self, items: _Optional[_Iterable[_Union[MediaProgress, _Mapping]]] = ...) -> None: ...

class Derivative(_message.Message):
    __slots__ = ("id", "media_id", "derivative_type", "version", "mime_type", "width", "height", "size_bytes", "status")
    ID_FIELD_NUMBER: _ClassVar[int]
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    DERIVATIVE_TYPE_FIELD_NUMBER: _ClassVar[int]
    VERSION_FIELD_NUMBER: _ClassVar[int]
    MIME_TYPE_FIELD_NUMBER: _ClassVar[int]
    WIDTH_FIELD_NUMBER: _ClassVar[int]
    HEIGHT_FIELD_NUMBER: _ClassVar[int]
    SIZE_BYTES_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    id: str
    media_id: str
    derivative_type: DerivativeType
    version: int
    mime_type: str
    width: int
    height: int
    size_bytes: int
    status: DerivativeStatus
    def __init__(self, id: _Optional[str] = ..., media_id: _Optional[str] = ..., derivative_type: _Optional[_Union[DerivativeType, str]] = ..., version: _Optional[int] = ..., mime_type: _Optional[str] = ..., width: _Optional[int] = ..., height: _Optional[int] = ..., size_bytes: _Optional[int] = ..., status: _Optional[_Union[DerivativeStatus, str]] = ...) -> None: ...

class RegisterDerivativeRequest(_message.Message):
    __slots__ = ("idempotency_key", "media_id", "derivative_type", "version", "object_key", "mime_type", "width", "height", "size_bytes")
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    DERIVATIVE_TYPE_FIELD_NUMBER: _ClassVar[int]
    VERSION_FIELD_NUMBER: _ClassVar[int]
    OBJECT_KEY_FIELD_NUMBER: _ClassVar[int]
    MIME_TYPE_FIELD_NUMBER: _ClassVar[int]
    WIDTH_FIELD_NUMBER: _ClassVar[int]
    HEIGHT_FIELD_NUMBER: _ClassVar[int]
    SIZE_BYTES_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    media_id: str
    derivative_type: DerivativeType
    version: int
    object_key: str
    mime_type: str
    width: int
    height: int
    size_bytes: int
    def __init__(self, idempotency_key: _Optional[str] = ..., media_id: _Optional[str] = ..., derivative_type: _Optional[_Union[DerivativeType, str]] = ..., version: _Optional[int] = ..., object_key: _Optional[str] = ..., mime_type: _Optional[str] = ..., width: _Optional[int] = ..., height: _Optional[int] = ..., size_bytes: _Optional[int] = ...) -> None: ...

class RegisterDerivativeResponse(_message.Message):
    __slots__ = ("derivative",)
    DERIVATIVE_FIELD_NUMBER: _ClassVar[int]
    derivative: Derivative
    def __init__(self, derivative: _Optional[_Union[Derivative, _Mapping]] = ...) -> None: ...

class DeletionOperation(_message.Message):
    __slots__ = ("deletion_id", "media_id", "state", "created_at", "completed_at")
    DELETION_ID_FIELD_NUMBER: _ClassVar[int]
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    STATE_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    COMPLETED_AT_FIELD_NUMBER: _ClassVar[int]
    deletion_id: str
    media_id: str
    state: DeletionState
    created_at: _timestamp_pb2.Timestamp
    completed_at: _timestamp_pb2.Timestamp
    def __init__(self, deletion_id: _Optional[str] = ..., media_id: _Optional[str] = ..., state: _Optional[_Union[DeletionState, str]] = ..., created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., completed_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class RequestDeletionRequest(_message.Message):
    __slots__ = ("idempotency_key", "media_id")
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    media_id: str
    def __init__(self, idempotency_key: _Optional[str] = ..., media_id: _Optional[str] = ...) -> None: ...

class RequestDeletionResponse(_message.Message):
    __slots__ = ("operation",)
    OPERATION_FIELD_NUMBER: _ClassVar[int]
    operation: DeletionOperation
    def __init__(self, operation: _Optional[_Union[DeletionOperation, _Mapping]] = ...) -> None: ...

class GetDeletionStatusRequest(_message.Message):
    __slots__ = ("deletion_id",)
    DELETION_ID_FIELD_NUMBER: _ClassVar[int]
    deletion_id: str
    def __init__(self, deletion_id: _Optional[str] = ...) -> None: ...

class GetDeletionStatusResponse(_message.Message):
    __slots__ = ("operation",)
    OPERATION_FIELD_NUMBER: _ClassVar[int]
    operation: DeletionOperation
    def __init__(self, operation: _Optional[_Union[DeletionOperation, _Mapping]] = ...) -> None: ...

class UpdateMediaRequest(_message.Message):
    __slots__ = ("media_id", "title", "description")
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    TITLE_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    media_id: str
    title: str
    description: str
    def __init__(self, media_id: _Optional[str] = ..., title: _Optional[str] = ..., description: _Optional[str] = ...) -> None: ...

class UpdateMediaResponse(_message.Message):
    __slots__ = ("media",)
    MEDIA_FIELD_NUMBER: _ClassVar[int]
    media: Media
    def __init__(self, media: _Optional[_Union[Media, _Mapping]] = ...) -> None: ...

class RequestProcessingRequest(_message.Message):
    __slots__ = ("idempotency_key", "media_id", "options", "audio_voice", "prompt_overrides")
    class PromptOverridesEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    OPTIONS_FIELD_NUMBER: _ClassVar[int]
    AUDIO_VOICE_FIELD_NUMBER: _ClassVar[int]
    PROMPT_OVERRIDES_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    media_id: str
    options: _containers.RepeatedScalarFieldContainer[str]
    audio_voice: str
    prompt_overrides: _containers.ScalarMap[str, str]
    def __init__(self, idempotency_key: _Optional[str] = ..., media_id: _Optional[str] = ..., options: _Optional[_Iterable[str]] = ..., audio_voice: _Optional[str] = ..., prompt_overrides: _Optional[_Mapping[str, str]] = ...) -> None: ...

class RequestProcessingResponse(_message.Message):
    __slots__ = ("media",)
    MEDIA_FIELD_NUMBER: _ClassVar[int]
    media: Media
    def __init__(self, media: _Optional[_Union[Media, _Mapping]] = ...) -> None: ...
