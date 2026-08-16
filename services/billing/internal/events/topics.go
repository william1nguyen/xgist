// Package events relays billing's transactional outbox to Kafka and
// consumes conductor's credit-reservation and settlement commands, per
// ADR 0003 and docs/services/billing.md.
package events

// Topic names follow ADR 0003's mn.<domain>.<event>.v1 form, keyed by
// user_id.
const (
	// ReserveCommandTopic carries reservation requests from conductor.
	ReserveCommandTopic = "mn.billing.credit.reserve.v1"
	// SettleCommandTopic carries per-item settlement and terminal
	// remainder-release requests from conductor. One topic serves both,
	// distinguished by the envelope's Action field, matching ADR 0003's
	// stated purpose for this topic: "Capture or release reserved
	// credit."
	SettleCommandTopic = "mn.billing.credit.settle.v1"
	// ReservedResultTopic reports a reservation outcome back to conductor.
	ReservedResultTopic = "mn.billing.credit.reserved.v1"
	// SettledResultTopic reports a settlement or release outcome back to
	// conductor. Not yet in ADR 0003's topic inventory; conductor does
	// not exist yet to depend on it, so this is a forward-compatible
	// definition rather than one negotiated against a live consumer.
	SettledResultTopic = "mn.billing.credit.settled.v1"

	commandsConsumerGroup = "billing-credit-commands"
)
