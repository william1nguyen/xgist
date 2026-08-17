// Package events relays conductor's transactional outbox to Kafka and
// consumes the processing, step-result, derivative, credit-result, and
// deletion topics conductor owns, per ADR 0003 and
// docs/services/conductor.md.
package events

// Topic names follow ADR 0003's mn.<domain>.<event>.v1 form.
const (
	// --- consumed ---

	// ProcessingRequestedTopic starts one processing workflow, keyed by
	// media_id. Produced by media.
	ProcessingRequestedTopic = "mn.media.processing.requested.v1"
	// DeletionRequestedTopic starts one media item's deletion, keyed by
	// media_id. Produced by media, also consumed by content.
	DeletionRequestedTopic = "mn.media.deletion.requested.v1"
	// StepCompletedTopic advances a workflow after a step's output is
	// durably committed, keyed by media_id. Produced by content (and, for
	// generate_thumbnail, implicitly via DerivativeReadyTopic instead).
	StepCompletedTopic = "mn.processing.step.completed.v1"
	// StepFailedTopic reports a step failure, keyed by media_id. Produced
	// by conductor-worker.
	StepFailedTopic = "mn.processing.step.failed.v1"
	// DerivativeReadyTopic records a durable derivative result, keyed by
	// media_id. Produced by media, after conductor-worker registers a
	// derivative object.
	DerivativeReadyTopic = "mn.media.derivative.ready.v1"
	// CreditReservedTopic reports a reservation outcome, keyed by
	// user_id. Produced by billing.
	CreditReservedTopic = "mn.billing.credit.reserved.v1"
	// CreditSettledTopic reports a settlement or release outcome, keyed
	// by user_id. Produced by billing. Not yet in ADR 0003's topic
	// inventory (billing defined it "forward-compatible" before conductor
	// existed); conductor consumes it for inbox/logging completeness but
	// does not gate workflow progression on it, since HandleStepCompleted
	// already advances the workflow before this confirmation arrives.
	CreditSettledTopic = "mn.billing.credit.settled.v1"

	// --- published ---

	// StepRequestedTopic dispatches an executable workflow step, keyed by
	// media_id. Consumed by conductor-worker.
	StepRequestedTopic = "mn.processing.step.requested.v1"
	// StatusChangedTopic projects workflow state into media state, keyed
	// by media_id. Consumed by media.
	StatusChangedTopic = "mn.media.status.changed.v1"
	// CreditReserveCommandTopic requests a credit reservation, keyed by
	// user_id. Consumed by billing.
	CreditReserveCommandTopic = "mn.billing.credit.reserve.v1"
	// CreditSettleCommandTopic captures or releases reserved credit,
	// keyed by user_id. Consumed by billing.
	CreditSettleCommandTopic = "mn.billing.credit.settle.v1"
	// DLQTopic retains an exhausted or non-decodable record, keyed by the
	// original record's key.
	DLQTopic = "mn.processing.dlq.v1"
	// DeletionCompletedTopic reports conductor's completion of one media
	// item's deletion back to media, keyed by media_id. Not yet in
	// ADR 0003's topic inventory: media does not consume it yet either
	// (its RequiredParticipants lists "conductor" but nothing drives
	// RecordCompletion for it today) — the same "forward-compatible, no
	// live consumer yet" posture content already took for its own
	// mn.content.deletion.completed.v1.
	DeletionCompletedTopic = "mn.conductor.deletion.completed.v1"

	processingConsumerGroup    = "conductor-processing"
	stepResultsConsumerGroup   = "conductor-step-results"
	derivativesConsumerGroup   = "conductor-derivatives"
	creditResultsConsumerGroup = "conductor-credit-results"
)

// ConsumerGroups are conductor's four Kafka reader groups, per ADR 0003.
// main.go runs one RunConsumer goroutine per group.
var ConsumerGroups = []ConsumerGroup{
	{GroupID: processingConsumerGroup, Topics: []string{ProcessingRequestedTopic, DeletionRequestedTopic}},
	{GroupID: stepResultsConsumerGroup, Topics: []string{StepCompletedTopic, StepFailedTopic}},
	{GroupID: derivativesConsumerGroup, Topics: []string{DerivativeReadyTopic}},
	{GroupID: creditResultsConsumerGroup, Topics: []string{CreditReservedTopic, CreditSettledTopic}},
}
