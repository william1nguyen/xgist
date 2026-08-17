package provider_test

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"log/slog"
	"testing"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/billing/internal/credit"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/provider"
)

const testSecret = "test-webhook-secret"

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func sign(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

type fakeEventRepo struct {
	recorded []string
}

func (f *fakeEventRepo) Record(_ context.Context, providerEventID, _ string, _ []byte) error {
	f.recorded = append(f.recorded, providerEventID)
	return nil
}

type purchaseCall struct {
	userID         uuid.UUID
	amount         int64
	idempotencyKey string
}

// fakeCrediter mimics the store's real idempotency behavior: applying the
// same idempotencyKey twice only credits the balance once.
type fakeCrediter struct {
	calls   []purchaseCall
	applied map[string]bool
	balance int64
}

func newFakeCrediter() *fakeCrediter {
	return &fakeCrediter{applied: map[string]bool{}}
}

func (f *fakeCrediter) ApplyPurchase(_ context.Context, userID uuid.UUID, amount int64, idempotencyKey string, _ map[string]any) (credit.Balance, error) {
	f.calls = append(f.calls, purchaseCall{userID, amount, idempotencyKey})
	if !f.applied[idempotencyKey] {
		f.applied[idempotencyKey] = true
		f.balance += amount
	}
	return credit.Balance{UserID: userID, Available: f.balance}, nil
}

func orderCreatedBody(userID, credits string) []byte {
	return []byte(`{"type":"order.created","data":{"metadata":{"userId":"` + userID + `"},"amount":1000,"product":{"metadata":{"credits":"` + credits + `"}}}}`)
}

func TestHandleRejectsInvalidSignature(t *testing.T) {
	events := &fakeEventRepo{}
	credits := newFakeCrediter()
	h := provider.NewPolarHandler(testSecret, events, credits, testLogger())

	body := orderCreatedBody(uuid.NewString(), "100")
	err := h.Handle(context.Background(), body, "not-the-right-signature")
	if err != provider.ErrInvalidSignature {
		t.Fatalf("got err %v, want ErrInvalidSignature", err)
	}
	if len(credits.calls) != 0 {
		t.Fatalf("ApplyPurchase called despite invalid signature")
	}
}

func TestHandleAppliesOrderCreated(t *testing.T) {
	events := &fakeEventRepo{}
	credits := newFakeCrediter()
	h := provider.NewPolarHandler(testSecret, events, credits, testLogger())

	userID := uuid.New()
	body := orderCreatedBody(userID.String(), "100")
	sig := sign(testSecret, body)

	if err := h.Handle(context.Background(), body, sig); err != nil {
		t.Fatalf("Handle: %v", err)
	}

	if len(credits.calls) != 1 {
		t.Fatalf("ApplyPurchase called %d times, want 1", len(credits.calls))
	}
	if credits.calls[0].userID != userID || credits.calls[0].amount != 100 {
		t.Errorf("call = %+v, want userID=%v amount=100", credits.calls[0], userID)
	}
	if len(events.recorded) != 1 {
		t.Errorf("recorded %d events, want 1", len(events.recorded))
	}
}

func TestHandleIsIdempotentOnRedelivery(t *testing.T) {
	events := &fakeEventRepo{}
	credits := newFakeCrediter()
	h := provider.NewPolarHandler(testSecret, events, credits, testLogger())

	body := orderCreatedBody(uuid.NewString(), "100")
	sig := sign(testSecret, body)

	if err := h.Handle(context.Background(), body, sig); err != nil {
		t.Fatalf("Handle (first): %v", err)
	}
	if err := h.Handle(context.Background(), body, sig); err != nil {
		t.Fatalf("Handle (redelivery): %v", err)
	}

	if credits.balance != 100 {
		t.Fatalf("balance = %d, want 100 (redelivery must not double-credit)", credits.balance)
	}
	if credits.calls[0].idempotencyKey != credits.calls[1].idempotencyKey {
		t.Errorf("redelivery produced a different idempotency key: %q != %q", credits.calls[0].idempotencyKey, credits.calls[1].idempotencyKey)
	}
}

func TestHandleIgnoresOtherEventTypes(t *testing.T) {
	events := &fakeEventRepo{}
	credits := newFakeCrediter()
	h := provider.NewPolarHandler(testSecret, events, credits, testLogger())

	body := []byte(`{"type":"subscription.updated","data":{}}`)
	sig := sign(testSecret, body)

	if err := h.Handle(context.Background(), body, sig); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(credits.calls) != 0 {
		t.Fatalf("ApplyPurchase called for a non-order.created event")
	}
	if len(events.recorded) != 1 {
		t.Errorf("recorded %d events, want 1 (still audited)", len(events.recorded))
	}
}

func TestHandleSkipsMissingMetadata(t *testing.T) {
	events := &fakeEventRepo{}
	credits := newFakeCrediter()
	h := provider.NewPolarHandler(testSecret, events, credits, testLogger())

	body := []byte(`{"type":"order.created","data":{"metadata":{},"product":{"metadata":{}}}}`)
	sig := sign(testSecret, body)

	if err := h.Handle(context.Background(), body, sig); err != nil {
		t.Fatalf("Handle: %v, want a malformed payload to be acked rather than erroring", err)
	}
	if len(credits.calls) != 0 {
		t.Fatalf("ApplyPurchase called despite missing userId/credits metadata")
	}
}
