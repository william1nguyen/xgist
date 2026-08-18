// Package provider verifies and applies inbound payment-provider webhooks.
// Polar is the only provider today. Polar's signing follows the shape of
// the Standard Webhooks specification (https://www.standardwebhooks.com/):
// three headers (WebhookIDHeader, WebhookTimestampHeader,
// WebhookSignatureHeader), a signed payload of "{id}.{timestamp}.{body}",
// HMAC-SHA256, and a base64-encoded, space-delimited, "v1,<sig>"-tagged
// signature list (supports zero-downtime key rotation — verify passes if
// any tagged signature matches). It departs from the spec on one point,
// confirmed against a live Polar account's real webhook deliveries: the
// HMAC key is the whsec_-prefixed secret's literal bytes, not the
// base64-decoded payload after stripping that prefix (see verify's
// comment).
package provider

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/billing/internal/credit"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/subscription"
)

// Standard Webhooks headers Polar sends signature material in.
const (
	WebhookIDHeader        = "webhook-id"
	WebhookTimestampHeader = "webhook-timestamp"
	WebhookSignatureHeader = "webhook-signature"
)

// webhookTimestampTolerance rejects a webhook whose webhook-timestamp is
// further from the server's clock than this in either direction, per the
// Standard Webhooks spec's replay-attack guidance.
const webhookTimestampTolerance = 5 * time.Minute

var ErrInvalidSignature = errors.New("provider: invalid webhook signature")

// Crediter applies a verified purchase to a user's balance. credit.Service
// implements it.
type Crediter interface {
	ApplyPurchase(ctx context.Context, userID uuid.UUID, amount int64, idempotencyKey string, metadata map[string]any) (credit.Balance, error)
}

// Subscriber projects a verified subscription lifecycle event into local
// state. subscription.Service implements it.
type Subscriber interface {
	ApplyEvent(ctx context.Context, in subscription.Event) error
}

// EventRepository records raw provider events for audit and replay
// inspection. It is implemented by internal/store. Recording is
// best-effort bookkeeping, not the idempotency gate: Crediter.ApplyPurchase
// is, through the ledger's unique idempotency key, so a failed or skipped
// audit insert never risks a lost or duplicated credit.
type EventRepository interface {
	Record(ctx context.Context, providerEventID, eventType string, payload []byte) error
}

// PolarHandler verifies and applies Polar webhook deliveries.
type PolarHandler struct {
	secret        string
	events        EventRepository
	credits       Crediter
	subscriptions Subscriber
	logger        *slog.Logger
}

// NewPolarHandler returns a PolarHandler. secret is the shared HMAC key
// configured with Polar.
func NewPolarHandler(secret string, events EventRepository, credits Crediter, subscriptions Subscriber, logger *slog.Logger) *PolarHandler {
	return &PolarHandler{secret: secret, events: events, credits: credits, subscriptions: subscriptions, logger: logger}
}

// envelope is decoded first, from every webhook delivery, just to learn
// its type and to audit-record the raw payload before dispatching to a
// type-specific struct: Polar's event types share no common data shape
// beyond {type, data}.
type envelope struct {
	Type string `json:"type"`
}

// metadata is Polar's free-form key/value bag, attached both to checkouts
// (where this service always writes string values, e.g. "userId") and to
// products, configured directly by the merchant through Polar's dashboard
// — which stores a value as whatever JSON type was typed in, a number for
// something like "credits": 2000, not necessarily a string. Decoding into
// map[string]string fails the entire payload the instant any one value is
// non-string, so map[string]any is required here; metadataString below
// coerces a value back to a string regardless of its underlying JSON type.
type metadata map[string]any

// metadataString reads key from m as a string, accepting a JSON string or
// number (Go decodes any JSON number in an `any` as float64) — anything
// else, or a missing key, returns "".
func (m metadata) String(key string) string {
	switch v := m[key].(type) {
	case string:
		return v
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	default:
		return ""
	}
}

type orderCreatedEvent struct {
	Data struct {
		Metadata metadata `json:"metadata"`
		Amount   int64    `json:"amount"`
		Product  struct {
			Metadata metadata `json:"metadata"`
		} `json:"product"`
	} `json:"data"`
}

// subscriptionEvent is the shape of every subscription.* delivery
// (created, active, updated, canceled, revoked, uncanceled): they all
// carry the subscription's current full state, so one struct and one
// handling path covers all of them — the caller only needs to look at
// data.status, which every delivery reports fresh.
type subscriptionEvent struct {
	Data struct {
		ID                 string     `json:"id"`
		Status             string     `json:"status"`
		CustomerID         string     `json:"customer_id"`
		CurrentPeriodStart *time.Time `json:"current_period_start"`
		CurrentPeriodEnd   *time.Time `json:"current_period_end"`
		Metadata           metadata   `json:"metadata"`
		Product            struct {
			Name string `json:"name"`
		} `json:"product"`
	} `json:"data"`
}

// Handle verifies id/timestamp/signature (the three Standard Webhooks
// headers) over rawBody and applies an order.created or subscription.*
// event. Any other well-formed, correctly signed event is recorded for
// audit and otherwise ignored. Handle is safe to call more than once with
// the same rawBody: order.created is deduplicated by a content-derived
// idempotency key (never double-credits on retry), and subscription.* is
// deduplicated by Polar's subscription id being the upsert key (a
// redelivery just overwrites the same row with the same values).
func (h *PolarHandler) Handle(ctx context.Context, rawBody []byte, id, timestamp, signature string) error {
	if id == "" || timestamp == "" || signature == "" {
		h.logger.WarnContext(ctx, "rejected polar webhook: missing id, timestamp, or signature header",
			"has_id", id != "", "has_timestamp", timestamp != "", "has_signature", signature != "")
		return ErrInvalidSignature
	}
	if ok, reason := h.verify(id, timestamp, rawBody, signature); !ok {
		h.logger.WarnContext(ctx, "rejected polar webhook: signature verification failed", "reason", reason)
		return ErrInvalidSignature
	}

	var env envelope
	if err := json.Unmarshal(rawBody, &env); err != nil {
		return fmt.Errorf("decode webhook payload: %w", err)
	}

	eventID := contentEventID(rawBody)
	if err := h.events.Record(ctx, eventID, env.Type, rawBody); err != nil {
		h.logger.ErrorContext(ctx, "record provider webhook event", "error", err)
	}

	switch {
	case env.Type == "order.created":
		return h.handleOrderCreated(ctx, rawBody, eventID)
	case strings.HasPrefix(env.Type, "subscription."):
		return h.handleSubscriptionEvent(ctx, rawBody)
	default:
		return nil
	}
}

func (h *PolarHandler) handleOrderCreated(ctx context.Context, rawBody []byte, eventID string) error {
	var order orderCreatedEvent
	if err := json.Unmarshal(rawBody, &order); err != nil {
		return fmt.Errorf("decode order.created payload: %w", err)
	}

	userID, err := uuid.Parse(order.Data.Metadata.String("userId"))
	if err != nil {
		h.logger.ErrorContext(ctx, "polar webhook missing or invalid userId metadata", "error", err)
		return nil
	}

	credits, err := strconv.ParseInt(order.Data.Product.Metadata.String("credits"), 10, 64)
	if err != nil || credits <= 0 {
		h.logger.ErrorContext(ctx, "polar webhook missing or invalid credits metadata", "user_id", userID)
		return nil
	}

	_, err = h.credits.ApplyPurchase(ctx, userID, credits, eventID, map[string]any{"amount": order.Data.Amount})
	return err
}

func (h *PolarHandler) handleSubscriptionEvent(ctx context.Context, rawBody []byte) error {
	var sub subscriptionEvent
	if err := json.Unmarshal(rawBody, &sub); err != nil {
		return fmt.Errorf("decode subscription payload: %w", err)
	}

	if sub.Data.ID == "" {
		h.logger.ErrorContext(ctx, "polar subscription webhook missing subscription id")
		return nil
	}

	// Checkout metadata (set when the checkout session was created) is
	// carried by Polar onto every subscription event it produces, the
	// same way it's carried onto order.created — see handleOrderCreated.
	userID, err := uuid.Parse(sub.Data.Metadata.String("userId"))
	if err != nil {
		h.logger.ErrorContext(ctx, "polar subscription webhook missing or invalid userId metadata", "error", err)
		return nil
	}

	return h.subscriptions.ApplyEvent(ctx, subscription.Event{
		ProviderID:      sub.Data.ID,
		UserID:          userID,
		PolarCustomerID: sub.Data.CustomerID,
		Plan:            sub.Data.Product.Name,
		Status:          mapSubscriptionStatus(sub.Data.Status),
		PeriodStart:     sub.Data.CurrentPeriodStart,
		PeriodEnd:       sub.Data.CurrentPeriodEnd,
	})
}

// mapSubscriptionStatus maps Polar's subscription status strings to
// billing's own Status enum. Unrecognized values (e.g. "incomplete",
// before the first payment settles) map to StatusNone rather than a
// guess, since neither "active" nor "canceled" would be accurate.
func mapSubscriptionStatus(polarStatus string) subscription.Status {
	switch polarStatus {
	case "active", "trialing":
		return subscription.StatusActive
	case "past_due":
		return subscription.StatusPastDue
	case "canceled", "unpaid", "incomplete_expired":
		return subscription.StatusCanceled
	default:
		return subscription.StatusNone
	}
}

// verify checks id/timestamp/signature: the timestamp must be within
// webhookTimestampTolerance of now (replay-attack guard), and the computed
// HMAC must match at least one "v1,<sig>" entry in signatureHeader's
// space-delimited list (Polar tags every current signing key this way, to
// support rotating keys with zero downtime). The signed content
// ("{id}.{timestamp}.{body}") and signature encoding (base64) follow the
// Standard Webhooks spec, but the HMAC key does not: despite the
// whsec_-prefixed, base64-looking secret Polar issues, verified against a
// live Polar account's real deliveries, the key is h.secret's literal
// bytes — whsec_ prefix included, never base64-decoded. reason is a
// non-sensitive diagnostic string (no key material, no signature bytes)
// explaining a false result, logged by the caller.
func (h *PolarHandler) verify(id, timestamp string, rawBody []byte, signatureHeader string) (ok bool, reason string) {
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return false, "webhook-timestamp is not a unix timestamp"
	}
	age := time.Since(time.Unix(ts, 0))
	if math.Abs(age.Seconds()) > webhookTimestampTolerance.Seconds() {
		return false, fmt.Sprintf("webhook-timestamp is %.0fs from server clock, outside the %s tolerance", age.Seconds(), webhookTimestampTolerance)
	}

	signedContent := id + "." + timestamp + "." + string(rawBody)
	mac := hmac.New(sha256.New, []byte(h.secret))
	mac.Write([]byte(signedContent))
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	entries := strings.Fields(signatureHeader)
	for _, entry := range entries {
		_, sig, ok := strings.Cut(entry, ",")
		if !ok {
			continue
		}
		if hmac.Equal([]byte(sig), []byte(expected)) {
			return true, ""
		}
	}
	return false, fmt.Sprintf("none of %d signature entries in webhook-signature matched", len(entries))
}

// contentEventID derives a stable idempotency key from the raw payload.
// Polar's documented webhook envelope does not guarantee a stable event id
// field this service can rely on without a live contract to verify against,
// so identical redeliveries are deduplicated by content hash instead: any
// byte-identical retry produces the same key.
func contentEventID(rawBody []byte) string {
	sum := sha256.Sum256(rawBody)
	return hex.EncodeToString(sum[:])
}
