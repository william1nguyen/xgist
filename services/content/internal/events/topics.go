// Package events relays content's transactional outbox to Kafka and
// consumes media's deletion-requested command, per ADR 0003, ADR 0006, and
// docs/services/content.md.
package events

// Topic names follow ADR 0003's mn.<domain>.<event>.v1 form, keyed by
// media_id.
const (
	// StepCompletedTopic advances a workflow after content durably
	// commits one step's output. Produced by content, consumed by
	// conductor.
	StepCompletedTopic = "mn.processing.step.completed.v1"
	// DeletionRequestedTopic starts one media item's deletion. Produced
	// by media (media/internal/events.DeletionRequestedTopic), consumed
	// by content and conductor.
	DeletionRequestedTopic = "mn.media.deletion.requested.v1"
	// DeletionCompletedTopic reports content's completion of one media
	// item's deletion back to media, keyed by media_id. Not yet in
	// ADR 0003's topic inventory, mirroring media's own
	// mn.media.deletion.completed.v1 (reported to identity): media does
	// not hardcode this name yet either, so this is a forward-compatible
	// definition rather than one negotiated against a live consumer.
	DeletionCompletedTopic = "mn.content.deletion.completed.v1"
	// AudioJobRequestedTopic starts one standalone script-draft or
	// audio-generation job. Produced by content (internal/audiojob),
	// consumed directly by conductor-worker — no conductor workflow is
	// ever involved, unlike every other processing step.
	AudioJobRequestedTopic = "mn.audio.job.requested.v1"

	eventsConsumerGroup = "content-events"
)
