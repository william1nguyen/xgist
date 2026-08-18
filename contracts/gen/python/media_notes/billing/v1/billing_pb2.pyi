import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class SubscriptionStatus(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    SUBSCRIPTION_STATUS_UNSPECIFIED: _ClassVar[SubscriptionStatus]
    SUBSCRIPTION_STATUS_NONE: _ClassVar[SubscriptionStatus]
    SUBSCRIPTION_STATUS_ACTIVE: _ClassVar[SubscriptionStatus]
    SUBSCRIPTION_STATUS_CANCELED: _ClassVar[SubscriptionStatus]
    SUBSCRIPTION_STATUS_PAST_DUE: _ClassVar[SubscriptionStatus]
SUBSCRIPTION_STATUS_UNSPECIFIED: SubscriptionStatus
SUBSCRIPTION_STATUS_NONE: SubscriptionStatus
SUBSCRIPTION_STATUS_ACTIVE: SubscriptionStatus
SUBSCRIPTION_STATUS_CANCELED: SubscriptionStatus
SUBSCRIPTION_STATUS_PAST_DUE: SubscriptionStatus

class QuoteItem(_message.Message):
    __slots__ = ("item_id", "credits")
    ITEM_ID_FIELD_NUMBER: _ClassVar[int]
    CREDITS_FIELD_NUMBER: _ClassVar[int]
    item_id: str
    credits: int
    def __init__(self, item_id: _Optional[str] = ..., credits: _Optional[int] = ...) -> None: ...

class Quote(_message.Message):
    __slots__ = ("id", "user_id", "catalog_version", "items", "total_credits", "expires_at", "created_at")
    ID_FIELD_NUMBER: _ClassVar[int]
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    CATALOG_VERSION_FIELD_NUMBER: _ClassVar[int]
    ITEMS_FIELD_NUMBER: _ClassVar[int]
    TOTAL_CREDITS_FIELD_NUMBER: _ClassVar[int]
    EXPIRES_AT_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    id: str
    user_id: str
    catalog_version: str
    items: _containers.RepeatedCompositeFieldContainer[QuoteItem]
    total_credits: int
    expires_at: _timestamp_pb2.Timestamp
    created_at: _timestamp_pb2.Timestamp
    def __init__(self, id: _Optional[str] = ..., user_id: _Optional[str] = ..., catalog_version: _Optional[str] = ..., items: _Optional[_Iterable[_Union[QuoteItem, _Mapping]]] = ..., total_credits: _Optional[int] = ..., expires_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class GetQuoteRequest(_message.Message):
    __slots__ = ("idempotency_key", "user_id", "options")
    IDEMPOTENCY_KEY_FIELD_NUMBER: _ClassVar[int]
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    OPTIONS_FIELD_NUMBER: _ClassVar[int]
    idempotency_key: str
    user_id: str
    options: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, idempotency_key: _Optional[str] = ..., user_id: _Optional[str] = ..., options: _Optional[_Iterable[str]] = ...) -> None: ...

class GetQuoteResponse(_message.Message):
    __slots__ = ("quote",)
    QUOTE_FIELD_NUMBER: _ClassVar[int]
    quote: Quote
    def __init__(self, quote: _Optional[_Union[Quote, _Mapping]] = ...) -> None: ...

class GetPriceCatalogRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class GetPriceCatalogResponse(_message.Message):
    __slots__ = ("catalog_version", "items")
    CATALOG_VERSION_FIELD_NUMBER: _ClassVar[int]
    ITEMS_FIELD_NUMBER: _ClassVar[int]
    catalog_version: str
    items: _containers.RepeatedCompositeFieldContainer[QuoteItem]
    def __init__(self, catalog_version: _Optional[str] = ..., items: _Optional[_Iterable[_Union[QuoteItem, _Mapping]]] = ...) -> None: ...

class Subscription(_message.Message):
    __slots__ = ("id", "plan", "status", "period_start", "period_end")
    ID_FIELD_NUMBER: _ClassVar[int]
    PLAN_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    PERIOD_START_FIELD_NUMBER: _ClassVar[int]
    PERIOD_END_FIELD_NUMBER: _ClassVar[int]
    id: str
    plan: str
    status: SubscriptionStatus
    period_start: _timestamp_pb2.Timestamp
    period_end: _timestamp_pb2.Timestamp
    def __init__(self, id: _Optional[str] = ..., plan: _Optional[str] = ..., status: _Optional[_Union[SubscriptionStatus, str]] = ..., period_start: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., period_end: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class BillingSummary(_message.Message):
    __slots__ = ("user_id", "available_credits", "reserved_credits", "subscription")
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    AVAILABLE_CREDITS_FIELD_NUMBER: _ClassVar[int]
    RESERVED_CREDITS_FIELD_NUMBER: _ClassVar[int]
    SUBSCRIPTION_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    available_credits: int
    reserved_credits: int
    subscription: Subscription
    def __init__(self, user_id: _Optional[str] = ..., available_credits: _Optional[int] = ..., reserved_credits: _Optional[int] = ..., subscription: _Optional[_Union[Subscription, _Mapping]] = ...) -> None: ...

class GetBillingSummaryRequest(_message.Message):
    __slots__ = ("user_id",)
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    def __init__(self, user_id: _Optional[str] = ...) -> None: ...

class GetBillingSummaryResponse(_message.Message):
    __slots__ = ("summary",)
    SUMMARY_FIELD_NUMBER: _ClassVar[int]
    summary: BillingSummary
    def __init__(self, summary: _Optional[_Union[BillingSummary, _Mapping]] = ...) -> None: ...

class LedgerEntry(_message.Message):
    __slots__ = ("id", "delta", "entry_type", "item_id", "created_at")
    ID_FIELD_NUMBER: _ClassVar[int]
    DELTA_FIELD_NUMBER: _ClassVar[int]
    ENTRY_TYPE_FIELD_NUMBER: _ClassVar[int]
    ITEM_ID_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    id: str
    delta: int
    entry_type: str
    item_id: str
    created_at: _timestamp_pb2.Timestamp
    def __init__(self, id: _Optional[str] = ..., delta: _Optional[int] = ..., entry_type: _Optional[str] = ..., item_id: _Optional[str] = ..., created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class ListCreditLedgerRequest(_message.Message):
    __slots__ = ("user_id", "cursor", "page_size")
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    CURSOR_FIELD_NUMBER: _ClassVar[int]
    PAGE_SIZE_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    cursor: str
    page_size: int
    def __init__(self, user_id: _Optional[str] = ..., cursor: _Optional[str] = ..., page_size: _Optional[int] = ...) -> None: ...

class ListCreditLedgerResponse(_message.Message):
    __slots__ = ("entries", "next_cursor")
    ENTRIES_FIELD_NUMBER: _ClassVar[int]
    NEXT_CURSOR_FIELD_NUMBER: _ClassVar[int]
    entries: _containers.RepeatedCompositeFieldContainer[LedgerEntry]
    next_cursor: str
    def __init__(self, entries: _Optional[_Iterable[_Union[LedgerEntry, _Mapping]]] = ..., next_cursor: _Optional[str] = ...) -> None: ...
