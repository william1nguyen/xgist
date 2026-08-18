package provider_test

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"io"
	"log/slog"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/billing/internal/credit"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/provider"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/subscription"
)

// testSecret looks like a real Polar-issued secret (whsec_-prefixed,
// base64-shaped) but that shape is cosmetic: verify uses the whole string
// as the literal HMAC key, confirmed against a live Polar account's real
// webhook deliveries — see provider.go's package doc and verify's comment.
const testSecret = "whsec_test0000000000000000000000000000000000000000000000"

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// sign computes a webhook-signature header value ("v1,<sig>") for
// id/timestamp/body under secret, mirroring PolarHandler.verify's own
// scheme so tests exercise the real algorithm rather than a stand-in.
func sign(secret, id, timestamp string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(id + "." + timestamp + "." + string(body)))
	return "v1," + base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

// freshID and freshTimestamp produce Standard Webhooks header values for
// "now" — verify() rejects a timestamp outside a 5-minute tolerance
// window, so tests can't hardcode a fixed one.
func freshID() string {
	return "msg_" + uuid.NewString()
}

func freshTimestamp() string {
	return strconv.FormatInt(time.Now().Unix(), 10)
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

type fakeSubscriber struct {
	events []subscription.Event
}

func newFakeSubscriber() *fakeSubscriber {
	return &fakeSubscriber{}
}

func (f *fakeSubscriber) ApplyEvent(_ context.Context, in subscription.Event) error {
	f.events = append(f.events, in)
	return nil
}

func subscriptionEventBody(eventType, subscriptionID, userID, status string) []byte {
	return []byte(`{"type":"` + eventType + `","data":{"id":"` + subscriptionID + `","status":"` + status + `","customer_id":"cus_123","metadata":{"userId":"` + userID + `"},"product":{"name":"Pro"}}}`)
}

func orderCreatedBody(userID, credits string) []byte {
	return []byte(`{"type":"order.created","data":{"metadata":{"userId":"` + userID + `"},"amount":1000,"product":{"metadata":{"credits":"` + credits + `"}}}}`)
}

func TestHandleRejectsInvalidSignature(t *testing.T) {
	events := &fakeEventRepo{}
	credits := newFakeCrediter()
	h := provider.NewPolarHandler(testSecret, events, credits, newFakeSubscriber(), testLogger())

	body := orderCreatedBody(uuid.NewString(), "100")
	err := h.Handle(context.Background(), body, freshID(), freshTimestamp(), "v1,not-the-right-signature")
	if err != provider.ErrInvalidSignature {
		t.Fatalf("got err %v, want ErrInvalidSignature", err)
	}
	if len(credits.calls) != 0 {
		t.Fatalf("ApplyPurchase called despite invalid signature")
	}
}

func TestHandleRejectsStaleTimestamp(t *testing.T) {
	events := &fakeEventRepo{}
	credits := newFakeCrediter()
	h := provider.NewPolarHandler(testSecret, events, credits, newFakeSubscriber(), testLogger())

	id := freshID()
	staleTimestamp := strconv.FormatInt(time.Now().Add(-1*time.Hour).Unix(), 10)
	body := orderCreatedBody(uuid.NewString(), "100")
	sig := sign(testSecret, id, staleTimestamp, body)

	err := h.Handle(context.Background(), body, id, staleTimestamp, sig)
	if err != provider.ErrInvalidSignature {
		t.Fatalf("got err %v, want ErrInvalidSignature for a stale timestamp", err)
	}
}

// TestHandleAppliesOrderCreatedWithNumericCreditsMetadata guards against a
// real bug: a product's metadata is configured directly in Polar's
// dashboard, so Polar returns it as whatever JSON type was typed in — a
// live product fetched from Polar had "credits": 2000 as a JSON number,
// not a string. Decoding metadata as map[string]string previously errored
// the entire payload on this shape, silently dropping every credit grant
// for that product.
func TestHandleAppliesOrderCreatedWithNumericCreditsMetadata(t *testing.T) {
	events := &fakeEventRepo{}
	credits := newFakeCrediter()
	h := provider.NewPolarHandler(testSecret, events, credits, newFakeSubscriber(), testLogger())

	userID := uuid.New()
	body := []byte(`{"type":"order.created","data":{"metadata":{"userId":"` + userID.String() + `"},"amount":2000,"product":{"metadata":{"credits":2000}}}}`)
	id, timestamp := freshID(), freshTimestamp()
	sig := sign(testSecret, id, timestamp, body)

	if err := h.Handle(context.Background(), body, id, timestamp, sig); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(credits.calls) != 1 || credits.calls[0].amount != 2000 {
		t.Fatalf("calls = %+v, want one call crediting 2000", credits.calls)
	}
}

func TestHandleAppliesOrderCreated(t *testing.T) {
	events := &fakeEventRepo{}
	credits := newFakeCrediter()
	h := provider.NewPolarHandler(testSecret, events, credits, newFakeSubscriber(), testLogger())

	userID := uuid.New()
	body := orderCreatedBody(userID.String(), "100")
	id, timestamp := freshID(), freshTimestamp()
	sig := sign(testSecret, id, timestamp, body)

	if err := h.Handle(context.Background(), body, id, timestamp, sig); err != nil {
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
	h := provider.NewPolarHandler(testSecret, events, credits, newFakeSubscriber(), testLogger())

	body := orderCreatedBody(uuid.NewString(), "100")
	id, timestamp := freshID(), freshTimestamp()
	sig := sign(testSecret, id, timestamp, body)

	if err := h.Handle(context.Background(), body, id, timestamp, sig); err != nil {
		t.Fatalf("Handle (first): %v", err)
	}
	if err := h.Handle(context.Background(), body, id, timestamp, sig); err != nil {
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
	h := provider.NewPolarHandler(testSecret, events, credits, newFakeSubscriber(), testLogger())

	body := []byte(`{"type":"checkout.created","data":{}}`)
	id, timestamp := freshID(), freshTimestamp()
	sig := sign(testSecret, id, timestamp, body)

	if err := h.Handle(context.Background(), body, id, timestamp, sig); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(credits.calls) != 0 {
		t.Fatalf("ApplyPurchase called for a non-order.created event")
	}
	if len(events.recorded) != 1 {
		t.Errorf("recorded %d events, want 1 (still audited)", len(events.recorded))
	}
}

func TestHandleAppliesSubscriptionEvent(t *testing.T) {
	events := &fakeEventRepo{}
	subs := newFakeSubscriber()
	h := provider.NewPolarHandler(testSecret, events, newFakeCrediter(), subs, testLogger())

	userID := uuid.New()
	body := subscriptionEventBody("subscription.active", "sub_123", userID.String(), "active")
	id, timestamp := freshID(), freshTimestamp()
	sig := sign(testSecret, id, timestamp, body)

	if err := h.Handle(context.Background(), body, id, timestamp, sig); err != nil {
		t.Fatalf("Handle: %v", err)
	}

	if len(subs.events) != 1 {
		t.Fatalf("ApplyEvent called %d times, want 1", len(subs.events))
	}
	got := subs.events[0]
	if got.ProviderID != "sub_123" || got.UserID != userID || got.Status != subscription.StatusActive || got.Plan != "Pro" {
		t.Errorf("event = %+v, want provider_id=sub_123 user_id=%v status=active plan=Pro", got, userID)
	}
}

func TestHandleMapsSubscriptionStatuses(t *testing.T) {
	cases := []struct {
		eventType   string
		polarStatus string
		wantStatus  subscription.Status
	}{
		{"subscription.active", "active", subscription.StatusActive},
		{"subscription.updated", "trialing", subscription.StatusActive},
		{"subscription.updated", "past_due", subscription.StatusPastDue},
		{"subscription.canceled", "canceled", subscription.StatusCanceled},
		{"subscription.revoked", "unpaid", subscription.StatusCanceled},
	}

	for _, tc := range cases {
		t.Run(tc.eventType+"/"+tc.polarStatus, func(t *testing.T) {
			subs := newFakeSubscriber()
			h := provider.NewPolarHandler(testSecret, &fakeEventRepo{}, newFakeCrediter(), subs, testLogger())

			body := subscriptionEventBody(tc.eventType, "sub_"+tc.polarStatus, uuid.NewString(), tc.polarStatus)
			id, timestamp := freshID(), freshTimestamp()
			sig := sign(testSecret, id, timestamp, body)
			if err := h.Handle(context.Background(), body, id, timestamp, sig); err != nil {
				t.Fatalf("Handle: %v", err)
			}
			if len(subs.events) != 1 || subs.events[0].Status != tc.wantStatus {
				t.Fatalf("got %+v, want status %v", subs.events, tc.wantStatus)
			}
		})
	}
}

func TestHandleIsIdempotentOnSubscriptionRedelivery(t *testing.T) {
	subs := newFakeSubscriber()
	h := provider.NewPolarHandler(testSecret, &fakeEventRepo{}, newFakeCrediter(), subs, testLogger())

	body := subscriptionEventBody("subscription.active", "sub_123", uuid.NewString(), "active")
	id, timestamp := freshID(), freshTimestamp()
	sig := sign(testSecret, id, timestamp, body)

	if err := h.Handle(context.Background(), body, id, timestamp, sig); err != nil {
		t.Fatalf("Handle (first): %v", err)
	}
	if err := h.Handle(context.Background(), body, id, timestamp, sig); err != nil {
		t.Fatalf("Handle (redelivery): %v", err)
	}

	if len(subs.events) != 2 {
		t.Fatalf("ApplyEvent called %d times, want 2 (idempotency is Upsert's job, keyed by provider_id — the handler just calls through each time)", len(subs.events))
	}
	if subs.events[0].ProviderID != subs.events[1].ProviderID {
		t.Errorf("redelivery produced a different provider id: %q != %q", subs.events[0].ProviderID, subs.events[1].ProviderID)
	}
}

func TestHandleSkipsSubscriptionEventMissingUserID(t *testing.T) {
	subs := newFakeSubscriber()
	h := provider.NewPolarHandler(testSecret, &fakeEventRepo{}, newFakeCrediter(), subs, testLogger())

	body := []byte(`{"type":"subscription.active","data":{"id":"sub_123","status":"active","customer_id":"cus_1","metadata":{},"product":{"name":"Pro"}}}`)
	id, timestamp := freshID(), freshTimestamp()
	sig := sign(testSecret, id, timestamp, body)

	if err := h.Handle(context.Background(), body, id, timestamp, sig); err != nil {
		t.Fatalf("Handle: %v, want a malformed payload to be acked rather than erroring", err)
	}
	if len(subs.events) != 0 {
		t.Fatalf("ApplyEvent called despite missing userId metadata")
	}
}
