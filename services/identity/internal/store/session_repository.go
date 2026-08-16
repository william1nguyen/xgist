package store

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nolannguyen1212/media-notes/services/identity/internal/account"
	"github.com/nolannguyen1212/media-notes/services/identity/internal/session"
)

// SessionRepository implements session.Repository over PostgreSQL.
type SessionRepository struct {
	pool *pgxpool.Pool
}

// NewSessionRepository returns a SessionRepository.
func NewSessionRepository(pool *pgxpool.Pool) *SessionRepository {
	return &SessionRepository{pool: pool}
}

func (r *SessionRepository) Create(ctx context.Context, userID uuid.UUID, tokenHash [32]byte, expiresAt time.Time) (session.Session, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO sessions (id, user_id, token_hash, expires_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, expires_at, revoked_at, created_at
	`, uuid.New(), userID, tokenHash[:], expiresAt)

	var s session.Session
	if err := row.Scan(&s.ID, &s.UserID, &s.ExpiresAt, &s.RevokedAt, &s.CreatedAt); err != nil {
		return session.Session{}, err
	}
	return s, nil
}

func (r *SessionRepository) FindActiveByTokenHash(ctx context.Context, tokenHash [32]byte) (session.Session, account.User, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT s.id, s.user_id, s.expires_at, s.revoked_at, s.created_at,
		       `+userColumnsWithAlias("u")+`
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = $1
	`, tokenHash[:])

	var s session.Session
	var u account.User
	err := row.Scan(
		&s.ID, &s.UserID, &s.ExpiresAt, &s.RevokedAt, &s.CreatedAt,
		&u.ID, &u.Email, &u.NormalizedEmail, &u.Name, &u.ImageURL, &u.EmailVerifiedAt, &u.State, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return session.Session{}, account.User{}, session.ErrInvalidToken
		}
		return session.Session{}, account.User{}, err
	}
	return s, u, nil
}

func (r *SessionRepository) Revoke(ctx context.Context, sessionID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL
	`, sessionID)
	return err
}
