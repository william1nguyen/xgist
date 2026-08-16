// Package credit owns credit balances, reservations, settlement, release,
// and the append-only ledger, per ADR 0008. billing is the only writer of
// balances; every mutation is idempotent and moves through a transaction
// and the append-only ledger.
package credit

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// ReservationStatus is the lifecycle state of one credit reservation.
type ReservationStatus string

const (
	ReservationActive   ReservationStatus = "active"
	ReservationSettled  ReservationStatus = "settled"
	ReservationReleased ReservationStatus = "released"
)

// Ledger entry types. An entry's Delta is the signed change it applies to
// the user's available balance: reserve moves credit out of available into
// reserved (Delta is negative); settle spends already-reserved credit and
// never touches available (Delta is zero); release and purchase/refund add
// to available (Delta is positive). reserved-balance movement is tracked
// on the reservation and credit_accounts rows themselves, not recomputed
// from ledger entries.
const (
	EntryReserve  = "reserve"
	EntrySettle   = "settle"
	EntryRelease  = "release"
	EntryPurchase = "purchase"
	EntryRefund   = "refund"
)

var (
	ErrInsufficientCredit  = errors.New("credit: insufficient available credit")
	ErrReservationNotFound = errors.New("credit: reservation not found")
	ErrQuoteNotFound       = errors.New("credit: quote not found")
	ErrQuoteExpired        = errors.New("credit: quote expired")
	ErrUnknownItem         = errors.New("credit: item not part of reservation's quote")
	ErrReservationReleased = errors.New("credit: reservation already released")
	ErrOverspend           = errors.New("credit: settlement exceeds reservation remainder")
)

// Balance is a user's current credit balance.
type Balance struct {
	UserID    uuid.UUID
	Available int64
	Reserved  int64
	Version   int64
	UpdatedAt time.Time
}

// Reservation is one workflow's credit hold against a quote.
type Reservation struct {
	ID         uuid.UUID
	UserID     uuid.UUID
	WorkflowID uuid.UUID
	QuoteID    uuid.UUID
	Amount     int64 // total originally reserved
	Remaining  int64 // unsettled remainder still held
	Status     ReservationStatus
	ExpiresAt  time.Time
	CreatedAt  time.Time
}

// ReserveCommand requests a credit hold for one workflow against an
// accepted quote.
type ReserveCommand struct {
	UserID     uuid.UUID
	WorkflowID uuid.UUID
	QuoteID    uuid.UUID
}

// Repository is the persistence boundary Service depends on. It is
// implemented by internal/store. Every method is idempotent: a repeated
// call with the same identifying key returns the existing result rather
// than mutating balances twice.
type Repository interface {
	// Reserve atomically loads the quote, checks it belongs to userID and
	// has not expired (unless already accepted by an earlier reservation
	// attempt), moves the quoted total from available to reserved using
	// optimistic locking, and creates the reservation and a "reserve"
	// ledger entry. A duplicate call for the same (userID, workflowID)
	// returns the existing reservation without moving credit again.
	Reserve(ctx context.Context, cmd ReserveCommand) (Reservation, error)

	// SettleItem spends itemAmount of a reservation's remainder for one
	// completed, previously-quoted price item, deduplicated by
	// idempotencyKey. A duplicate call is a no-op that returns the
	// current reservation.
	SettleItem(ctx context.Context, workflowID uuid.UUID, itemID string, idempotencyKey string) (Reservation, error)

	// ReleaseRemainder returns a reservation's unsettled remainder to
	// available and marks it released, deduplicated by idempotencyKey.
	// Safe to call with zero remainder (fully settled workflow) purely to
	// close out the reservation.
	ReleaseRemainder(ctx context.Context, workflowID uuid.UUID, idempotencyKey string) (Reservation, error)

	FindReservationByWorkflow(ctx context.Context, workflowID uuid.UUID) (Reservation, error)

	GetBalance(ctx context.Context, userID uuid.UUID) (Balance, error)

	// ApplyPurchase credits available balance from a verified, deduplicated
	// provider event. idempotencyKey is the provider's event id.
	ApplyPurchase(ctx context.Context, userID uuid.UUID, amount int64, idempotencyKey string, metadata map[string]any) (Balance, error)
}

// Service orchestrates credit operations. It holds no state of its own;
// Repository implementations perform the transactional work.
type Service struct {
	repo Repository
}

// NewService returns a Service backed by repo.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// Reserve requests a credit hold for a workflow.
func (s *Service) Reserve(ctx context.Context, cmd ReserveCommand) (Reservation, error) {
	return s.repo.Reserve(ctx, cmd)
}

// SettleItem settles one completed price item against its reservation.
func (s *Service) SettleItem(ctx context.Context, workflowID uuid.UUID, itemID, idempotencyKey string) (Reservation, error) {
	return s.repo.SettleItem(ctx, workflowID, itemID, idempotencyKey)
}

// ReleaseRemainder releases a reservation's unsettled remainder.
func (s *Service) ReleaseRemainder(ctx context.Context, workflowID uuid.UUID, idempotencyKey string) (Reservation, error) {
	return s.repo.ReleaseRemainder(ctx, workflowID, idempotencyKey)
}

// GetBalance returns a user's current balance.
func (s *Service) GetBalance(ctx context.Context, userID uuid.UUID) (Balance, error) {
	return s.repo.GetBalance(ctx, userID)
}

// ApplyPurchase credits a user's available balance from a purchase event.
func (s *Service) ApplyPurchase(ctx context.Context, userID uuid.UUID, amount int64, idempotencyKey string, metadata map[string]any) (Balance, error) {
	return s.repo.ApplyPurchase(ctx, userID, amount, idempotencyKey, metadata)
}
