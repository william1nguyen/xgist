// Package events relays media's transactional outbox to Kafka and
// consumes conductor's workflow-status transitions and identity's
// account-deletion requests, per ADR 0003, ADR 0006, and
// docs/services/media.md.
package events

// Topic names follow ADR 0003's mn.<domain>.<event>.v1 form, keyed by
// media_id unless noted otherwise.
const (
	// ProcessingRequestedTopic starts one processing workflow. Produced by
	// media, consumed by conductor.
	ProcessingRequestedTopic = "mn.media.processing.requested.v1"
	// DerivativeReadyTopic records a durable derivative result. Produced
	// by media, consumed by conductor.
	DerivativeReadyTopic = "mn.media.derivative.ready.v1"
	// DeletionRequestedTopic starts one media item's deletion. Produced by
	// media, consumed by content and conductor.
	DeletionRequestedTopic = "mn.media.deletion.requested.v1"
	// DeletionCompletedTopic reports media's completion of one account's
	// deletion cascade back to identity, keyed by user_id. Not yet in
	// ADR 0003's topic inventory: identity does not hardcode this name (it
	// reads IDENTITY_DELETION_COMPLETION_TOPICS), so this is a
	// forward-compatible definition rather than one negotiated against a
	// live consumer.
	DeletionCompletedTopic = "mn.media.deletion.completed.v1"

	// StatusChangedTopic projects workflow state into media state.
	// Produced by conductor, consumed by media.
	StatusChangedTopic = "mn.media.status.changed.v1"
	// AccountDeletionRequestedTopic is identity's outbox topic
	// (identity/internal/events.DeletionRequestedTopic, keyed by user_id).
	// media is a required participant in the account-deletion flow it
	// starts.
	AccountDeletionRequestedTopic = "mn.identity.account.deletion.requested.v1"

	eventsConsumerGroup = "media-events"
)
