// Package provider verifies and applies inbound payment-provider webhooks.
// Polar is the only provider today; the webhook contract (header name,
// HMAC scheme, and the order.created payload shape) matches the v1 server's
// apps/server/src/routes/polar-webhook.ts so existing Polar product
// configuration keeps working unchanged.
package provider

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strconv"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/billing/internal/credit"
)

// PolarSignatureHeader is the HTTP header Polar sends the payload's HMAC
// signature in.
const PolarSignatureHeader = "Polar-Signature"

var ErrInvalidSignature = errors.New("provider: invalid webhook signature")

// Crediter applies a verified purchase to a user's balance. credit.Service
// implements it.
type Crediter interface {
	ApplyPurchase(ctx context.Context, userID uuid.UUID, amount int64, idempotencyKey string, metadata map[string]any) (credit.Balance, error)
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
	secret  string
	events  EventRepository
	credits Crediter
	logger  *slog.Logger
}

// NewPolarHandler returns a PolarHandler. secret is the shared HMAC key
// configured with Polar.
func NewPolarHandler(secret string, events EventRepository, credits Crediter, logger *slog.Logger) *PolarHandler {
	return &PolarHandler{secret: secret, events: events, credits: credits, logger: logger}
}

type orderCreatedEvent struct {
	Type string `json:"type"`
	Data struct {
		Metadata map[string]string `json:"metadata"`
		Amount   int64             `json:"amount"`
		Product  struct {
			Metadata map[string]string `json:"metadata"`
		} `json:"product"`
	} `json:"data"`
}

// Handle verifies signature over rawBody and, for an order.created event,
// applies the purchased credits. Any other well-formed, correctly signed
// event is recorded for audit and otherwise ignored. Handle is safe to
// call more than once with the same rawBody: the applied credit is
// deduplicated by a content-derived idempotency key, so webhook retries
// never double-credit.
func (h *PolarHandler) Handle(ctx context.Context, rawBody []byte, signature string) error {
	if signature == "" || !h.verify(rawBody, signature) {
		return ErrInvalidSignature
	}

	var env orderCreatedEvent
	if err := json.Unmarshal(rawBody, &env); err != nil {
		return fmt.Errorf("decode webhook payload: %w", err)
	}

	eventID := contentEventID(rawBody)
	if err := h.events.Record(ctx, eventID, env.Type, rawBody); err != nil {
		h.logger.ErrorContext(ctx, "record provider webhook event", "error", err)
	}

	if env.Type != "order.created" {
		return nil
	}

	userID, err := uuid.Parse(env.Data.Metadata["userId"])
	if err != nil {
		h.logger.ErrorContext(ctx, "polar webhook missing or invalid userId metadata", "error", err)
		return nil
	}

	credits, err := strconv.ParseInt(env.Data.Product.Metadata["credits"], 10, 64)
	if err != nil || credits <= 0 {
		h.logger.ErrorContext(ctx, "polar webhook missing or invalid credits metadata", "user_id", userID)
		return nil
	}

	_, err = h.credits.ApplyPurchase(ctx, userID, credits, eventID, map[string]any{"amount": env.Data.Amount})
	return err
}

func (h *PolarHandler) verify(rawBody []byte, signature string) bool {
	mac := hmac.New(sha256.New, []byte(h.secret))
	mac.Write(rawBody)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expected))
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
