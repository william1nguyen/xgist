package store

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nolannguyen1212/media-notes/services/identity/internal/account"
	"github.com/nolannguyen1212/media-notes/services/identity/internal/events"
)

// credentialProvider identifies the password-credential row in
// accounts, mirroring v1's better-auth "credential" provider so
// the same account shape can later support OAuth providers alongside it.
const credentialProvider = "credential"

const userColumns = `id, email, normalized_email, COALESCE(name, ''), COALESCE(image_url, ''), email_verified_at, state, created_at, updated_at`

// AccountRepository implements account.Repository over PostgreSQL.
type AccountRepository struct {
	pool *pgxpool.Pool
}

// NewAccountRepository returns an AccountRepository.
func NewAccountRepository(pool *pgxpool.Pool) *AccountRepository {
	return &AccountRepository{pool: pool}
}

func (r *AccountRepository) CreateWithCredential(ctx context.Context, in account.NewAccount, credentialHash []byte, normalizedEmail string) (account.User, error) {
	var user account.User
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		row := tx.QueryRow(ctx, `
			INSERT INTO users (id, email, normalized_email, name)
			VALUES ($1, $2, $3, $4)
			RETURNING `+userColumns, uuid.New(), in.Email, normalizedEmail, in.Name)

		u, err := scanUser(row)
		if err != nil {
			return err
		}
		user = u

		_, err = tx.Exec(ctx, `
			INSERT INTO accounts (id, user_id, provider, provider_account_id, credential_hash)
			VALUES ($1, $2, $3, $4, $5)
		`, uuid.New(), user.ID, credentialProvider, normalizedEmail, credentialHash)
		return err
	})

	if txErr != nil {
		if isUniqueViolation(txErr) {
			return account.User{}, account.ErrEmailTaken
		}
		return account.User{}, txErr
	}
	return user, nil
}

func (r *AccountRepository) FindByNormalizedEmail(ctx context.Context, normalizedEmail string) (account.User, []byte, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT `+userColumnsWithAlias("u")+`, a.credential_hash
		FROM users u
		JOIN accounts a ON a.user_id = u.id AND a.provider = '`+credentialProvider+`'
		WHERE u.normalized_email = $1
	`, normalizedEmail)

	user, hash, err := scanUserWithCredential(row)
	if err != nil {
		return account.User{}, nil, err
	}
	return user, hash, nil
}

func (r *AccountRepository) FindByID(ctx context.Context, id uuid.UUID) (account.User, error) {
	row := r.pool.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1`, id)
	return scanUser(row)
}

func (r *AccountRepository) UpdateProfile(ctx context.Context, id uuid.UUID, patch account.ProfilePatch) (account.User, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE users
		SET name = COALESCE($2, name), image_url = COALESCE($3, image_url), updated_at = now()
		WHERE id = $1
		RETURNING `+userColumns, id, patch.Name, patch.ImageURL)
	return scanUser(row)
}

func (r *AccountRepository) RequestDeletion(ctx context.Context, userID uuid.UUID) (account.DeletionOperation, bool, error) {
	if existing, err := findDeletionByUserID(ctx, r.pool, userID); err == nil {
		return existing, false, nil
	} else if !errors.Is(err, account.ErrDeletionNotFound) {
		return account.DeletionOperation{}, false, err
	}

	var op account.DeletionOperation
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		deletionID := uuid.New()
		participants, err := json.Marshal(map[string]string{})
		if err != nil {
			return err
		}

		row := tx.QueryRow(ctx, `
			INSERT INTO account_deletions (deletion_id, user_id, state, participants)
			VALUES ($1, $2, 'pending', $3)
			RETURNING deletion_id, user_id, state, participants, created_at, completed_at
		`, deletionID, userID, participants)
		op, err = scanDeletion(row)
		if err != nil {
			return err
		}

		if _, err := tx.Exec(ctx, `
			UPDATE users SET state = 'deletion_pending', updated_at = now() WHERE id = $1
		`, userID); err != nil {
			return err
		}

		// Revoking sessions here, in the same transaction as the state
		// transition and outbox write, is what makes the "revoke all
		// sessions + write outbox atomically" step in identity.md's
		// deletion flow atomic — internal/session is not involved.
		if _, err := tx.Exec(ctx, `
			UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL
		`, userID); err != nil {
			return err
		}

		return insertDeletionOutboxEvent(ctx, tx, deletionID, userID)
	})

	if txErr != nil {
		if isUniqueViolation(txErr) {
			existing, err := findDeletionByUserID(ctx, r.pool, userID)
			if err != nil {
				return account.DeletionOperation{}, false, err
			}
			return existing, false, nil
		}
		return account.DeletionOperation{}, false, txErr
	}
	return op, true, nil
}

func (r *AccountRepository) FindDeletion(ctx context.Context, deletionID uuid.UUID) (account.DeletionOperation, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT deletion_id, user_id, state, participants, created_at, completed_at
		FROM account_deletions WHERE deletion_id = $1
	`, deletionID)
	return scanDeletion(row)
}

func (r *AccountRepository) RecordDeletionCompletion(ctx context.Context, deletionID uuid.UUID, owner string) (account.DeletionOperation, error) {
	var result account.DeletionOperation
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		row := tx.QueryRow(ctx, `
			SELECT deletion_id, user_id, state, participants, created_at, completed_at
			FROM account_deletions WHERE deletion_id = $1
			FOR UPDATE
		`, deletionID)
		op, err := scanDeletion(row)
		if err != nil {
			return err
		}

		if op.Participants == nil {
			op.Participants = map[string]string{}
		}
		op.Participants[owner] = "completed"

		newState := op.State
		var completedAt *time.Time
		if op.Done() {
			newState = account.DeletionCompleted
			now := time.Now()
			completedAt = &now
		}

		participantsJSON, err := json.Marshal(op.Participants)
		if err != nil {
			return err
		}

		row = tx.QueryRow(ctx, `
			UPDATE account_deletions
			SET participants = $2, state = $3, completed_at = $4
			WHERE deletion_id = $1
			RETURNING deletion_id, user_id, state, participants, created_at, completed_at
		`, deletionID, participantsJSON, string(newState), completedAt)
		result, err = scanDeletion(row)
		if err != nil {
			return err
		}

		if newState == account.DeletionCompleted {
			if _, err := tx.Exec(ctx, `
				UPDATE users SET state = 'tombstoned', updated_at = now() WHERE id = $1
			`, op.UserID); err != nil {
				return err
			}
		}
		return nil
	})
	if txErr != nil {
		return account.DeletionOperation{}, txErr
	}
	return result, nil
}

func (r *AccountRepository) ListOverduePendingDeletions(ctx context.Context, olderThan time.Duration, limit int) ([]account.DeletionOperation, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT deletion_id, user_id, state, participants, created_at, completed_at
		FROM account_deletions
		WHERE state = 'pending' AND created_at < $1
		ORDER BY created_at ASC
		LIMIT $2
	`, time.Now().Add(-olderThan), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ops []account.DeletionOperation
	for rows.Next() {
		op, err := scanDeletion(rows)
		if err != nil {
			return nil, err
		}
		ops = append(ops, op)
	}
	return ops, rows.Err()
}

func (r *AccountRepository) RepublishDeletion(ctx context.Context, deletionID uuid.UUID) error {
	op, err := findDeletionByID(ctx, r.pool, deletionID)
	if err != nil {
		return err
	}
	return insertDeletionOutboxEvent(ctx, r.pool, deletionID, op.UserID)
}

func insertDeletionOutboxEvent(ctx context.Context, q querier, deletionID, userID uuid.UUID) error {
	payload, err := json.Marshal(map[string]any{
		"deletion_id": deletionID,
		"user_id":     userID,
	})
	if err != nil {
		return err
	}
	_, err = q.Exec(ctx, `
		INSERT INTO outbox_events (id, topic, event_key, payload)
		VALUES ($1, $2, $3, $4)
	`, uuid.New(), events.DeletionRequestedTopic, userID.String(), payload)
	return err
}

func findDeletionByUserID(ctx context.Context, q querier, userID uuid.UUID) (account.DeletionOperation, error) {
	row := q.QueryRow(ctx, `
		SELECT deletion_id, user_id, state, participants, created_at, completed_at
		FROM account_deletions WHERE user_id = $1
	`, userID)
	return scanDeletion(row)
}

func findDeletionByID(ctx context.Context, q querier, deletionID uuid.UUID) (account.DeletionOperation, error) {
	row := q.QueryRow(ctx, `
		SELECT deletion_id, user_id, state, participants, created_at, completed_at
		FROM account_deletions WHERE deletion_id = $1
	`, deletionID)
	return scanDeletion(row)
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanUser(row rowScanner) (account.User, error) {
	var u account.User
	err := row.Scan(&u.ID, &u.Email, &u.NormalizedEmail, &u.Name, &u.ImageURL, &u.EmailVerifiedAt, &u.State, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return account.User{}, account.ErrNotFound
		}
		return account.User{}, err
	}
	return u, nil
}

func scanUserWithCredential(row rowScanner) (account.User, []byte, error) {
	var u account.User
	var hash []byte
	err := row.Scan(&u.ID, &u.Email, &u.NormalizedEmail, &u.Name, &u.ImageURL, &u.EmailVerifiedAt, &u.State, &u.CreatedAt, &u.UpdatedAt, &hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return account.User{}, nil, account.ErrNotFound
		}
		return account.User{}, nil, err
	}
	return u, hash, nil
}

func scanDeletion(row rowScanner) (account.DeletionOperation, error) {
	var op account.DeletionOperation
	var state string
	var participants []byte
	err := row.Scan(&op.DeletionID, &op.UserID, &state, &participants, &op.CreatedAt, &op.CompletedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return account.DeletionOperation{}, account.ErrDeletionNotFound
		}
		return account.DeletionOperation{}, err
	}
	op.State = account.DeletionState(state)
	if len(participants) > 0 {
		if err := json.Unmarshal(participants, &op.Participants); err != nil {
			return account.DeletionOperation{}, err
		}
	}
	return op, nil
}

func userColumnsWithAlias(alias string) string {
	return alias + ".id, " + alias + ".email, " + alias + ".normalized_email, COALESCE(" + alias + ".name, ''), COALESCE(" + alias + ".image_url, ''), " + alias + ".email_verified_at, " + alias + ".state, " + alias + ".created_at, " + alias + ".updated_at"
}
