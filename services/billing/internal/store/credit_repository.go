package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nolannguyen1212/media-notes/services/billing/internal/credit"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/events"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/quote"
)

// CreditRepository implements credit.Repository over PostgreSQL.
//
// Balance invariants (available >= 0, reserved >= 0) are enforced both in
// application code, under a row lock, before any mutating statement, and
// as PostgreSQL CHECK constraints as a defense-in-depth backstop. The two
// must agree: application code never issues a mutating statement that
// could trip a CHECK constraint on the success path, because a
// constraint violation aborts the surrounding transaction and this
// repository still needs to commit a "rejected" result event in the same
// transaction as the state it read.
type CreditRepository struct {
	pool           *pgxpool.Pool
	reservationTTL time.Duration
}

// NewCreditRepository returns a CreditRepository. reservationTTL is the
// lifetime applied to every newly created reservation (24 hours per
// ADR 0008).
func NewCreditRepository(pool *pgxpool.Pool, reservationTTL time.Duration) *CreditRepository {
	return &CreditRepository{pool: pool, reservationTTL: reservationTTL}
}

func (r *CreditRepository) Reserve(ctx context.Context, cmd credit.ReserveCommand) (credit.Reservation, error) {
	// Idempotent: a duplicate reserve command for the same workflow
	// returns the existing reservation without moving credit again.
	if existing, err := findReservationByWorkflow(ctx, r.pool, cmd.WorkflowID); err == nil {
		return existing, nil
	} else if !errors.Is(err, credit.ErrReservationNotFound) {
		return credit.Reservation{}, err
	}

	var result credit.Reservation
	var rejected error

	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		q, err := findQuoteByID(ctx, tx, cmd.QuoteID)
		if err != nil {
			if errors.Is(err, quote.ErrNotFound) {
				rejected = credit.ErrQuoteNotFound
				return publishRejectedReserve(ctx, tx, cmd, rejected.Error())
			}
			return err
		}
		if q.UserID != cmd.UserID {
			rejected = credit.ErrQuoteNotFound
			return publishRejectedReserve(ctx, tx, cmd, rejected.Error())
		}
		if q.AcceptedAt == nil && time.Now().After(q.ExpiresAt) {
			rejected = credit.ErrQuoteExpired
			return publishRejectedReserve(ctx, tx, cmd, rejected.Error())
		}

		if err := ensureAccountExists(ctx, tx, cmd.UserID); err != nil {
			return err
		}

		var available int64
		if err := tx.QueryRow(ctx, `
			SELECT available FROM billing.credit_accounts WHERE user_id = $1 FOR UPDATE
		`, cmd.UserID).Scan(&available); err != nil {
			return err
		}
		if available < q.TotalCredits {
			rejected = credit.ErrInsufficientCredit
			return publishRejectedReserve(ctx, tx, cmd, rejected.Error())
		}

		// Safe: available was just checked >= q.TotalCredits under the
		// row lock just taken above, so this cannot trip the
		// available >= 0 CHECK constraint.
		if _, err := tx.Exec(ctx, `
			UPDATE billing.credit_accounts
			SET available = available - $2, reserved = reserved + $2, version = version + 1, updated_at = now()
			WHERE user_id = $1
		`, cmd.UserID, q.TotalCredits); err != nil {
			return err
		}

		reservationID := uuid.New()
		row := tx.QueryRow(ctx, `
			INSERT INTO billing.credit_reservations (id, user_id, workflow_id, quote_id, amount, remaining, status, expires_at)
			VALUES ($1, $2, $3, $4, $5, $5, 'active', $6)
			RETURNING id, user_id, workflow_id, quote_id, amount, remaining, status, expires_at, created_at
		`, reservationID, cmd.UserID, cmd.WorkflowID, cmd.QuoteID, q.TotalCredits, time.Now().Add(r.reservationTTL))
		result, err = scanReservation(row)
		if err != nil {
			return err
		}

		if err := markQuoteAccepted(ctx, tx, cmd.QuoteID); err != nil {
			return err
		}

		if _, err := tryInsertLedgerEntry(ctx, tx, cmd.UserID, &reservationID, -q.TotalCredits, credit.EntryReserve,
			fmt.Sprintf("reserve:%s", cmd.WorkflowID), map[string]any{"workflow_id": cmd.WorkflowID}); err != nil {
			return err
		}

		return publishReservedEvent(ctx, tx, result, "reserved")
	})

	if txErr != nil {
		if isUniqueViolation(txErr) {
			return findReservationByWorkflow(ctx, r.pool, cmd.WorkflowID)
		}
		return credit.Reservation{}, txErr
	}
	if rejected != nil {
		return credit.Reservation{}, rejected
	}
	return result, nil
}

func (r *CreditRepository) SettleItem(ctx context.Context, workflowID uuid.UUID, itemID, idempotencyKey string) (credit.Reservation, error) {
	var result credit.Reservation
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		row := tx.QueryRow(ctx, `
			SELECT id, user_id, workflow_id, quote_id, amount, remaining, status, expires_at, created_at
			FROM billing.credit_reservations WHERE workflow_id = $1
			FOR UPDATE
		`, workflowID)
		res, err := scanReservation(row)
		if err != nil {
			return err
		}
		if res.Status == credit.ReservationReleased {
			return credit.ErrReservationReleased
		}

		q, err := findQuoteByID(ctx, tx, res.QuoteID)
		if err != nil {
			return err
		}
		itemAmount, ok := itemCredits(q, itemID)
		if !ok {
			return credit.ErrUnknownItem
		}
		if itemAmount > res.Remaining {
			return credit.ErrOverspend
		}

		inserted, err := tryInsertLedgerEntry(ctx, tx, res.UserID, &res.ID, 0, credit.EntrySettle, idempotencyKey,
			map[string]any{"workflow_id": workflowID, "item_id": itemID})
		if err != nil {
			return err
		}
		if !inserted {
			result = res
			return nil
		}

		// Safe: itemAmount was just checked <= res.Remaining, and
		// reserved is the sum of every active reservation's remainder
		// by construction, so this cannot trip the reserved >= 0 CHECK
		// constraint.
		if _, err := tx.Exec(ctx, `
			UPDATE billing.credit_accounts SET reserved = reserved - $2, version = version + 1, updated_at = now()
			WHERE user_id = $1
		`, res.UserID, itemAmount); err != nil {
			return err
		}

		newRemaining := res.Remaining - itemAmount
		newStatus := res.Status
		if newRemaining == 0 {
			newStatus = credit.ReservationSettled
		}

		row = tx.QueryRow(ctx, `
			UPDATE billing.credit_reservations SET remaining = $2, status = $3
			WHERE id = $1
			RETURNING id, user_id, workflow_id, quote_id, amount, remaining, status, expires_at, created_at
		`, res.ID, newRemaining, string(newStatus))
		result, err = scanReservation(row)
		if err != nil {
			return err
		}

		return publishSettledEvent(ctx, tx, result, itemID, itemAmount, "settled")
	})
	if txErr != nil {
		return credit.Reservation{}, txErr
	}
	return result, nil
}

func (r *CreditRepository) ReleaseRemainder(ctx context.Context, workflowID uuid.UUID, idempotencyKey string) (credit.Reservation, error) {
	var result credit.Reservation
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		row := tx.QueryRow(ctx, `
			SELECT id, user_id, workflow_id, quote_id, amount, remaining, status, expires_at, created_at
			FROM billing.credit_reservations WHERE workflow_id = $1
			FOR UPDATE
		`, workflowID)
		res, err := scanReservation(row)
		if err != nil {
			return err
		}
		if res.Status == credit.ReservationReleased {
			result = res
			return nil
		}

		inserted, err := tryInsertLedgerEntry(ctx, tx, res.UserID, &res.ID, res.Remaining, credit.EntryRelease, idempotencyKey,
			map[string]any{"workflow_id": workflowID})
		if err != nil {
			return err
		}
		if !inserted {
			result = res
			return nil
		}

		if res.Remaining > 0 {
			// Safe: releasing exactly res.Remaining, which is always
			// <= reserved by construction, so this cannot trip the
			// reserved >= 0 CHECK constraint.
			if _, err := tx.Exec(ctx, `
				UPDATE billing.credit_accounts
				SET available = available + $2, reserved = reserved - $2, version = version + 1, updated_at = now()
				WHERE user_id = $1
			`, res.UserID, res.Remaining); err != nil {
				return err
			}
		}

		releasedAmount := res.Remaining
		row = tx.QueryRow(ctx, `
			UPDATE billing.credit_reservations SET remaining = 0, status = 'released'
			WHERE id = $1
			RETURNING id, user_id, workflow_id, quote_id, amount, remaining, status, expires_at, created_at
		`, res.ID)
		result, err = scanReservation(row)
		if err != nil {
			return err
		}

		return publishSettledEvent(ctx, tx, result, "", releasedAmount, "released")
	})
	if txErr != nil {
		return credit.Reservation{}, txErr
	}
	return result, nil
}

func (r *CreditRepository) FindReservationByWorkflow(ctx context.Context, workflowID uuid.UUID) (credit.Reservation, error) {
	return findReservationByWorkflow(ctx, r.pool, workflowID)
}

func (r *CreditRepository) GetBalance(ctx context.Context, userID uuid.UUID) (credit.Balance, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT user_id, available, reserved, version, updated_at
		FROM billing.credit_accounts WHERE user_id = $1
	`, userID)
	b, err := scanBalance(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return credit.Balance{UserID: userID}, nil
		}
		return credit.Balance{}, err
	}
	return b, nil
}

func (r *CreditRepository) ApplyPurchase(ctx context.Context, userID uuid.UUID, amount int64, idempotencyKey string, metadata map[string]any) (credit.Balance, error) {
	if amount <= 0 {
		return credit.Balance{}, fmt.Errorf("store: purchase amount must be positive")
	}

	var result credit.Balance
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := ensureAccountExists(ctx, tx, userID); err != nil {
			return err
		}

		inserted, err := tryInsertLedgerEntry(ctx, tx, userID, nil, amount, credit.EntryPurchase, idempotencyKey, metadata)
		if err != nil {
			return err
		}
		if !inserted {
			row := tx.QueryRow(ctx, `
				SELECT user_id, available, reserved, version, updated_at FROM billing.credit_accounts WHERE user_id = $1
			`, userID)
			result, err = scanBalance(row)
			return err
		}

		row := tx.QueryRow(ctx, `
			UPDATE billing.credit_accounts SET available = available + $2, version = version + 1, updated_at = now()
			WHERE user_id = $1
			RETURNING user_id, available, reserved, version, updated_at
		`, userID, amount)
		result, err = scanBalance(row)
		return err
	})
	if txErr != nil {
		return credit.Balance{}, txErr
	}
	return result, nil
}

func ensureAccountExists(ctx context.Context, q querier, userID uuid.UUID) error {
	_, err := q.Exec(ctx, `
		INSERT INTO billing.credit_accounts (user_id, available, reserved, version)
		VALUES ($1, 0, 0, 0)
		ON CONFLICT (user_id) DO NOTHING
	`, userID)
	return err
}

func findReservationByWorkflow(ctx context.Context, q querier, workflowID uuid.UUID) (credit.Reservation, error) {
	row := q.QueryRow(ctx, `
		SELECT id, user_id, workflow_id, quote_id, amount, remaining, status, expires_at, created_at
		FROM billing.credit_reservations WHERE workflow_id = $1
	`, workflowID)
	return scanReservation(row)
}

func scanReservation(row rowScanner) (credit.Reservation, error) {
	var res credit.Reservation
	var status string
	err := row.Scan(&res.ID, &res.UserID, &res.WorkflowID, &res.QuoteID, &res.Amount, &res.Remaining, &status, &res.ExpiresAt, &res.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return credit.Reservation{}, credit.ErrReservationNotFound
		}
		return credit.Reservation{}, err
	}
	res.Status = credit.ReservationStatus(status)
	return res, nil
}

func scanBalance(row rowScanner) (credit.Balance, error) {
	var b credit.Balance
	err := row.Scan(&b.UserID, &b.Available, &b.Reserved, &b.Version, &b.UpdatedAt)
	if err != nil {
		return credit.Balance{}, err
	}
	return b, nil
}

func itemCredits(q quote.Quote, itemID string) (int64, bool) {
	for _, item := range q.Items {
		if item.ItemID == itemID {
			return item.Credits, true
		}
	}
	return 0, false
}

// tryInsertLedgerEntry appends one append-only ledger row, deduplicated by
// idempotencyKey. inserted is false when idempotencyKey was already used,
// meaning this call is a duplicate delivery and the caller must not repeat
// the associated balance mutation.
func tryInsertLedgerEntry(ctx context.Context, tx pgx.Tx, userID uuid.UUID, reservationID *uuid.UUID, delta int64, entryType, idempotencyKey string, metadata map[string]any) (inserted bool, err error) {
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return false, err
	}
	tag, err := tx.Exec(ctx, `
		INSERT INTO billing.credit_ledger (id, user_id, reservation_id, delta, entry_type, idempotency_key, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (idempotency_key) DO NOTHING
	`, uuid.New(), userID, reservationID, delta, entryType, idempotencyKey, metadataJSON)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

type reservationEventPayload struct {
	EventID       uuid.UUID  `json:"event_id"`
	ReservationID *uuid.UUID `json:"reservation_id,omitempty"`
	UserID        uuid.UUID  `json:"user_id"`
	WorkflowID    uuid.UUID  `json:"workflow_id"`
	QuoteID       uuid.UUID  `json:"quote_id,omitempty"`
	Amount        int64      `json:"amount,omitempty"`
	Status        string     `json:"status"`
	Reason        string     `json:"reason,omitempty"`
}

func publishReservedEvent(ctx context.Context, tx pgx.Tx, res credit.Reservation, status string) error {
	payload, err := json.Marshal(reservationEventPayload{
		EventID:       uuid.New(),
		ReservationID: &res.ID,
		UserID:        res.UserID,
		WorkflowID:    res.WorkflowID,
		QuoteID:       res.QuoteID,
		Amount:        res.Amount,
		Status:        status,
	})
	if err != nil {
		return err
	}
	return insertOutboxEvent(ctx, tx, events.ReservedResultTopic, res.UserID.String(), payload)
}

func publishRejectedReserve(ctx context.Context, tx pgx.Tx, cmd credit.ReserveCommand, reason string) error {
	payload, err := json.Marshal(reservationEventPayload{
		EventID:    uuid.New(),
		UserID:     cmd.UserID,
		WorkflowID: cmd.WorkflowID,
		QuoteID:    cmd.QuoteID,
		Status:     "rejected",
		Reason:     reason,
	})
	if err != nil {
		return err
	}
	return insertOutboxEvent(ctx, tx, events.ReservedResultTopic, cmd.UserID.String(), payload)
}

type settlementEventPayload struct {
	EventID       uuid.UUID `json:"event_id"`
	ReservationID uuid.UUID `json:"reservation_id"`
	UserID        uuid.UUID `json:"user_id"`
	WorkflowID    uuid.UUID `json:"workflow_id"`
	ItemID        string    `json:"item_id,omitempty"`
	Amount        int64     `json:"amount"`
	Remaining     int64     `json:"remaining"`
	Status        string    `json:"status"`
}

func publishSettledEvent(ctx context.Context, tx pgx.Tx, res credit.Reservation, itemID string, amount int64, status string) error {
	payload, err := json.Marshal(settlementEventPayload{
		EventID:       uuid.New(),
		ReservationID: res.ID,
		UserID:        res.UserID,
		WorkflowID:    res.WorkflowID,
		ItemID:        itemID,
		Amount:        amount,
		Remaining:     res.Remaining,
		Status:        status,
	})
	if err != nil {
		return err
	}
	return insertOutboxEvent(ctx, tx, events.SettledResultTopic, res.UserID.String(), payload)
}
