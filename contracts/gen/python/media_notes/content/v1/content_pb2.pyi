import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class SummaryAudioStatus(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    SUMMARY_AUDIO_STATUS_UNSPECIFIED: _ClassVar[SummaryAudioStatus]
    SUMMARY_AUDIO_STATUS_READY: _ClassVar[SummaryAudioStatus]
    SUMMARY_AUDIO_STATUS_FAILED: _ClassVar[SummaryAudioStatus]
SUMMARY_AUDIO_STATUS_UNSPECIFIED: SummaryAudioStatus
SUMMARY_AUDIO_STATUS_READY: SummaryAudioStatus
SUMMARY_AUDIO_STATUS_FAILED: SummaryAudioStatus

class ContentVersion(_message.Message):
    __slots__ = ("media_id", "version", "updated_at")
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    VERSION_FIELD_NUMBER: _ClassVar[int]
    UPDATED_AT_FIELD_NUMBER: _ClassVar[int]
    media_id: str
    version: int
    updated_at: _timestamp_pb2.Timestamp
    def __init__(self, media_id: _Optional[str] = ..., version: _Optional[int] = ..., updated_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class TranscriptSegment(_message.Message):
    __slots__ = ("segment_index", "start_ms", "end_ms", "speaker", "text")
    SEGMENT_INDEX_FIELD_NUMBER: _ClassVar[int]
    START_MS_FIELD_NUMBER: _ClassVar[int]
    END_MS_FIELD_NUMBER: _ClassVar[int]
    SPEAKER_FIELD_NUMBER: _ClassVar[int]
    TEXT_FIELD_NUMBER: _ClassVar[int]
    segment_index: int
    start_ms: int
    end_ms: int
    speaker: str
    text: str
    def __init__(self, segment_index: _Optional[int] = ..., start_ms: _Optional[int] = ..., end_ms: _Optional[int] = ..., speaker: _Optional[str] = ..., text: _Optional[str] = ...) -> None: ...

class Transcript(_message.Message):
    __slots__ = ("media_id", "language", "text", "segments", "version")
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    LANGUAGE_FIELD_NUMBER: _ClassVar[int]
    TEXT_FIELD_NUMBER: _ClassVar[int]
    SEGMENTS_FIELD_NUMBER: _ClassVar[int]
    VERSION_FIELD_NUMBER: _ClassVar[int]
    media_id: str
    language: str
    text: str
    segments: _containers.RepeatedCompositeFieldContainer[TranscriptSegment]
    version: int
    def __init__(self, media_id: _Optional[str] = ..., language: _Optional[str] = ..., text: _Optional[str] = ..., segments: _Optional[_Iterable[_Union[TranscriptSegment, _Mapping]]] = ..., version: _Optional[int] = ...) -> None: ...

class StoreTranscriptRequest(_message.Message):
    __slots__ = ("idempotency_key", "media_id", "workflow_id", "attempt", "language", "text", "segments")
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    WORKFLOW_ID_FIELD_NUMBER: _ClassVar[int]
    ATTEMPT_FIELD_NUMBER: _ClassVar[int]
    LANGUAGE_FIELD_NUMBER: _ClassVar[int]
    TEXT_FIELD_NUMBER: _ClassVar[int]
    SEGMENTS_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    media_id: str
    workflow_id: str
    attempt: int
    language: str
    text: str
    segments: _containers.RepeatedCompositeFieldContainer[TranscriptSegment]
    def __init__(self, idempotency_key: _Optional[str] = ..., media_id: _Optional[str] = ..., workflow_id: _Optional[str] = ..., attempt: _Optional[int] = ..., language: _Optional[str] = ..., text: _Optional[str] = ..., segments: _Optional[_Iterable[_Union[TranscriptSegment, _Mapping]]] = ...) -> None: ...

class StoreTranscriptResponse(_message.Message):
    __slots__ = ("version",)
    VERSION_FIELD_NUMBER: _ClassVar[int]
    version: ContentVersion
    def __init__(self, version: _Optional[_Union[ContentVersion, _Mapping]] = ...) -> None: ...

class GetTranscriptRequest(_message.Message):
    __slots__ = ("media_id",)
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    media_id: str
    def __init__(self, media_id: _Optional[str] = ...) -> None: ...

class GetTranscriptResponse(_message.Message):
    __slots__ = ("transcript",)
    TRANSCRIPT_FIELD_NUMBER: _ClassVar[int]
    transcript: Transcript
    def __init__(self, transcript: _Optional[_Union[Transcript, _Mapping]] = ...) -> None: ...

class SummarySentence(_message.Message):
    __slots__ = ("sentence_index", "text", "cited_segment_indexes")
    SENTENCE_INDEX_FIELD_NUMBER: _ClassVar[int]
    TEXT_FIELD_NUMBER: _ClassVar[int]
    CITED_SEGMENT_INDEXES_FIELD_NUMBER: _ClassVar[int]
    sentence_index: int
    text: str
    cited_segment_indexes: _containers.RepeatedScalarFieldContainer[int]
    def __init__(self, sentence_index: _Optional[int] = ..., text: _Optional[str] = ..., cited_segment_indexes: _Optional[_Iterable[int]] = ...) -> None: ...

class Summary(_message.Message):
    __slots__ = ("summary_type", "text", "model", "prompt_version", "sentences", "created_at")
    SUMMARY_TYPE_FIELD_NUMBER: _ClassVar[int]
    TEXT_FIELD_NUMBER: _ClassVar[int]
    MODEL_FIELD_NUMBER: _ClassVar[int]
    PROMPT_VERSION_FIELD_NUMBER: _ClassVar[int]
    SENTENCES_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    summary_type: str
    text: str
    model: str
    prompt_version: str
    sentences: _containers.RepeatedCompositeFieldContainer[SummarySentence]
    created_at: _timestamp_pb2.Timestamp
    def __init__(self, summary_type: _Optional[str] = ..., text: _Optional[str] = ..., model: _Optional[str] = ..., prompt_version: _Optional[str] = ..., sentences: _Optional[_Iterable[_Union[SummarySentence, _Mapping]]] = ..., created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class StoreSummaryRequest(_message.Message):
    __slots__ = ("idempotency_key", "media_id", "workflow_id", "attempt", "summary_type", "text", "model", "prompt_version", "sentences")
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    WORKFLOW_ID_FIELD_NUMBER: _ClassVar[int]
    ATTEMPT_FIELD_NUMBER: _ClassVar[int]
    SUMMARY_TYPE_FIELD_NUMBER: _ClassVar[int]
    TEXT_FIELD_NUMBER: _ClassVar[int]
    MODEL_FIELD_NUMBER: _ClassVar[int]
    PROMPT_VERSION_FIELD_NUMBER: _ClassVar[int]
    SENTENCES_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    media_id: str
    workflow_id: str
    attempt: int
    summary_type: str
    text: str
    model: str
    prompt_version: str
    sentences: _containers.RepeatedCompositeFieldContainer[SummarySentence]
    def __init__(self, idempotency_key: _Optional[str] = ..., media_id: _Optional[str] = ..., workflow_id: _Optional[str] = ..., attempt: _Optional[int] = ..., summary_type: _Optional[str] = ..., text: _Optional[str] = ..., model: _Optional[str] = ..., prompt_version: _Optional[str] = ..., sentences: _Optional[_Iterable[_Union[SummarySentence, _Mapping]]] = ...) -> None: ...

class StoreSummaryResponse(_message.Message):
    __slots__ = ("version",)
    VERSION_FIELD_NUMBER: _ClassVar[int]
    version: ContentVersion
    def __init__(self, version: _Optional[_Union[ContentVersion, _Mapping]] = ...) -> None: ...

class Keyword(_message.Message):
    __slots__ = ("keyword", "score", "position")
    KEYWORD_FIELD_NUMBER: _ClassVar[int]
    SCORE_FIELD_NUMBER: _ClassVar[int]
    POSITION_FIELD_NUMBER: _ClassVar[int]
    keyword: str
    score: float
    position: int
    def __init__(self, keyword: _Optional[str] = ..., score: _Optional[float] = ..., position: _Optional[int] = ...) -> None: ...

class StoreKeywordsRequest(_message.Message):
    __slots__ = ("idempotency_key", "media_id", "workflow_id", "attempt", "keywords")
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    WORKFLOW_ID_FIELD_NUMBER: _ClassVar[int]
    ATTEMPT_FIELD_NUMBER: _ClassVar[int]
    KEYWORDS_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    media_id: str
    workflow_id: str
    attempt: int
    keywords: _containers.RepeatedCompositeFieldContainer[Keyword]
    def __init__(self, idempotency_key: _Optional[str] = ..., media_id: _Optional[str] = ..., workflow_id: _Optional[str] = ..., attempt: _Optional[int] = ..., keywords: _Optional[_Iterable[_Union[Keyword, _Mapping]]] = ...) -> None: ...

class StoreKeywordsResponse(_message.Message):
    __slots__ = ("version",)
    VERSION_FIELD_NUMBER: _ClassVar[int]
    version: ContentVersion
    def __init__(self, version: _Optional[_Union[ContentVersion, _Mapping]] = ...) -> None: ...

class Keypoint(_message.Message):
    __slots__ = ("point_index", "text", "start_segment", "end_segment")
    POINT_INDEX_FIELD_NUMBER: _ClassVar[int]
    TEXT_FIELD_NUMBER: _ClassVar[int]
    START_SEGMENT_FIELD_NUMBER: _ClassVar[int]
    END_SEGMENT_FIELD_NUMBER: _ClassVar[int]
    point_index: int
    text: str
    start_segment: int
    end_segment: int
    def __init__(self, point_index: _Optional[int] = ..., text: _Optional[str] = ..., start_segment: _Optional[int] = ..., end_segment: _Optional[int] = ...) -> None: ...

class StoreKeypointsRequest(_message.Message):
    __slots__ = ("idempotency_key", "media_id", "workflow_id", "attempt", "keypoints")
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    WORKFLOW_ID_FIELD_NUMBER: _ClassVar[int]
    ATTEMPT_FIELD_NUMBER: _ClassVar[int]
    KEYPOINTS_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    media_id: str
    workflow_id: str
    attempt: int
    keypoints: _containers.RepeatedCompositeFieldContainer[Keypoint]
    def __init__(self, idempotency_key: _Optional[str] = ..., media_id: _Optional[str] = ..., workflow_id: _Optional[str] = ..., attempt: _Optional[int] = ..., keypoints: _Optional[_Iterable[_Union[Keypoint, _Mapping]]] = ...) -> None: ...

class StoreKeypointsResponse(_message.Message):
    __slots__ = ("version",)
    VERSION_FIELD_NUMBER: _ClassVar[int]
    version: ContentVersion
    def __init__(self, version: _Optional[_Union[ContentVersion, _Mapping]] = ...) -> None: ...

class Note(_message.Message):
    __slots__ = ("format", "body", "created_at")
    FORMAT_FIELD_NUMBER: _ClassVar[int]
    BODY_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    format: str
    body: str
    created_at: _timestamp_pb2.Timestamp
    def __init__(self, format: _Optional[str] = ..., body: _Optional[str] = ..., created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class StoreNotesRequest(_message.Message):
    __slots__ = ("idempotency_key", "media_id", "workflow_id", "attempt", "format", "body")
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    WORKFLOW_ID_FIELD_NUMBER: _ClassVar[int]
    ATTEMPT_FIELD_NUMBER: _ClassVar[int]
    FORMAT_FIELD_NUMBER: _ClassVar[int]
    BODY_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    media_id: str
    workflow_id: str
    attempt: int
    format: str
    body: str
    def __init__(self, idempotency_key: _Optional[str] = ..., media_id: _Optional[str] = ..., workflow_id: _Optional[str] = ..., attempt: _Optional[int] = ..., format: _Optional[str] = ..., body: _Optional[str] = ...) -> None: ...

class StoreNotesResponse(_message.Message):
    __slots__ = ("version",)
    VERSION_FIELD_NUMBER: _ClassVar[int]
    version: ContentVersion
    def __init__(self, version: _Optional[_Union[ContentVersion, _Mapping]] = ...) -> None: ...

class SummaryAudio(_message.Message):
    __slots__ = ("summary_type", "object_key", "mime_type", "duration_ms", "voice", "status", "url")
    SUMMARY_TYPE_FIELD_NUMBER: _ClassVar[int]
    OBJECT_KEY_FIELD_NUMBER: _ClassVar[int]
    MIME_TYPE_FIELD_NUMBER: _ClassVar[int]
    DURATION_MS_FIELD_NUMBER: _ClassVar[int]
    VOICE_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    URL_FIELD_NUMBER: _ClassVar[int]
    summary_type: str
    object_key: str
    mime_type: str
    duration_ms: int
    voice: str
    status: SummaryAudioStatus
    url: str
    def __init__(self, summary_type: _Optional[str] = ..., object_key: _Optional[str] = ..., mime_type: _Optional[str] = ..., duration_ms: _Optional[int] = ..., voice: _Optional[str] = ..., status: _Optional[_Union[SummaryAudioStatus, str]] = ..., url: _Optional[str] = ...) -> None: ...

class StoreSummaryAudioMetadataRequest(_message.Message):
    __slots__ = ("idempotency_key", "media_id", "workflow_id", "attempt", "summary_type", "object_key", "mime_type", "duration_ms", "voice")
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    WORKFLOW_ID_FIELD_NUMBER: _ClassVar[int]
    ATTEMPT_FIELD_NUMBER: _ClassVar[int]
    SUMMARY_TYPE_FIELD_NUMBER: _ClassVar[int]
    OBJECT_KEY_FIELD_NUMBER: _ClassVar[int]
    MIME_TYPE_FIELD_NUMBER: _ClassVar[int]
    DURATION_MS_FIELD_NUMBER: _ClassVar[int]
    VOICE_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    media_id: str
    workflow_id: str
    attempt: int
    summary_type: str
    object_key: str
    mime_type: str
    duration_ms: int
    voice: str
    def __init__(self, idempotency_key: _Optional[str] = ..., media_id: _Optional[str] = ..., workflow_id: _Optional[str] = ..., attempt: _Optional[int] = ..., summary_type: _Optional[str] = ..., object_key: _Optional[str] = ..., mime_type: _Optional[str] = ..., duration_ms: _Optional[int] = ..., voice: _Optional[str] = ...) -> None: ...

class StoreSummaryAudioMetadataResponse(_message.Message):
    __slots__ = ("version",)
    VERSION_FIELD_NUMBER: _ClassVar[int]
    version: ContentVersion
    def __init__(self, version: _Optional[_Union[ContentVersion, _Mapping]] = ...) -> None: ...

class GetContentRequest(_message.Message):
    __slots__ = ("media_id",)
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    media_id: str
    def __init__(self, media_id: _Optional[str] = ...) -> None: ...

class Content(_message.Message):
    __slots__ = ("media_id", "transcript", "summaries", "keywords", "keypoints", "notes", "summary_audios", "version")
    MEDIA_ID_FIELD_NUMBER: _ClassVar[int]
    TRANSCRIPT_FIELD_NUMBER: _ClassVar[int]
    SUMMARIES_FIELD_NUMBER: _ClassVar[int]
    KEYWORDS_FIELD_NUMBER: _ClassVar[int]
    KEYPOINTS_FIELD_NUMBER: _ClassVar[int]
    NOTES_FIELD_NUMBER: _ClassVar[int]
    SUMMARY_AUDIOS_FIELD_NUMBER: _ClassVar[int]
    VERSION_FIELD_NUMBER: _ClassVar[int]
    media_id: str
    transcript: Transcript
    summaries: _containers.RepeatedCompositeFieldContainer[Summary]
    keywords: _containers.RepeatedCompositeFieldContainer[Keyword]
    keypoints: _containers.RepeatedCompositeFieldContainer[Keypoint]
    notes: _containers.RepeatedCompositeFieldContainer[Note]
    summary_audios: _containers.RepeatedCompositeFieldContainer[SummaryAudio]
    version: int
    def __init__(self, media_id: _Optional[str] = ..., transcript: _Optional[_Union[Transcript, _Mapping]] = ..., summaries: _Optional[_Iterable[_Union[Summary, _Mapping]]] = ..., keywords: _Optional[_Iterable[_Union[Keyword, _Mapping]]] = ..., keypoints: _Optional[_Iterable[_Union[Keypoint, _Mapping]]] = ..., notes: _Optional[_Iterable[_Union[Note, _Mapping]]] = ..., summary_audios: _Optional[_Iterable[_Union[SummaryAudio, _Mapping]]] = ..., version: _Optional[int] = ...) -> None: ...

class GetContentResponse(_message.Message):
    __slots__ = ("content",)
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    content: Content
    def __init__(self, content: _Optional[_Union[Content, _Mapping]] = ...) -> None: ...
