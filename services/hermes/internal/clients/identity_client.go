package clients

import (
	"context"
	"fmt"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"github.com/google/uuid"

	identityv1 "github.com/nolannguyen1212/media-notes/contracts/gen/go/media_notes/identity/v1"
)

// IdentityClient calls identity's gRPC API: registration, authentication,
// session validation, and account deletion.
type IdentityClient struct {
	client identityv1.IdentityServiceClient
	conn   *grpc.ClientConn
}

// NewIdentityClient dials addr (identity's gRPC listener) and returns an
// IdentityClient. The connection is not authenticated: every v2 service
// currently talks over the internal docker-compose network without TLS.
func NewIdentityClient(addr string) (*IdentityClient, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("dial identity at %s: %w", addr, err)
	}
	return &IdentityClient{client: identityv1.NewIdentityServiceClient(conn), conn: conn}, nil
}

// Close closes the underlying gRPC connection.
func (c *IdentityClient) Close() error {
	return c.conn.Close()
}

// Register creates a user and a credential account.
func (c *IdentityClient) Register(ctx context.Context, idempotencyKey, email, password, name string) (User, error) {
	resp, err := c.client.RegisterAccount(ctx, &identityv1.RegisterAccountRequest{
		IdempotencyKey: idempotencyKey,
		Email:          email,
		Password:       password,
		Name:           name,
	})
	if err != nil {
		return User{}, fmt.Errorf("identity.RegisterAccount: %w", err)
	}
	return toUser(resp.GetUser())
}

// Authenticate validates a credential and issues a session.
func (c *IdentityClient) Authenticate(ctx context.Context, idempotencyKey, email, password string) (Session, error) {
	resp, err := c.client.Authenticate(ctx, &identityv1.AuthenticateRequest{
		IdempotencyKey: idempotencyKey,
		Email:          email,
		Password:       password,
	})
	if err != nil {
		return Session{}, fmt.Errorf("identity.Authenticate: %w", err)
	}
	user, err := toUser(resp.GetUser())
	if err != nil {
		return Session{}, err
	}
	return Session{User: user, Token: resp.GetSessionToken(), ExpiresAt: resp.GetExpiresAt().AsTime()}, nil
}

// ValidateSession resolves a session token to its principal.
func (c *IdentityClient) ValidateSession(ctx context.Context, token string) (Principal, error) {
	resp, err := c.client.ValidateSession(ctx, &identityv1.ValidateSessionRequest{SessionToken: token})
	if err != nil {
		return Principal{}, fmt.Errorf("identity.ValidateSession: %w", err)
	}
	user, err := toUser(resp.GetUser())
	if err != nil {
		return Principal{}, err
	}
	sessionID, err := uuid.Parse(resp.GetSessionId())
	if err != nil {
		return Principal{}, fmt.Errorf("identity.ValidateSession returned an invalid session_id: %w", err)
	}
	return Principal{User: user, SessionID: sessionID}, nil
}

// RevokeSession invalidates one session. Idempotent.
func (c *IdentityClient) RevokeSession(ctx context.Context, sessionID uuid.UUID) error {
	_, err := c.client.RevokeSession(ctx, &identityv1.RevokeSessionRequest{SessionId: sessionID.String()})
	if err != nil {
		return fmt.Errorf("identity.RevokeSession: %w", err)
	}
	return nil
}

// GetUser returns public profile data for one user.
func (c *IdentityClient) GetUser(ctx context.Context, userID uuid.UUID) (User, error) {
	resp, err := c.client.GetUser(ctx, &identityv1.GetUserRequest{UserId: userID.String()})
	if err != nil {
		return User{}, fmt.Errorf("identity.GetUser: %w", err)
	}
	return toUser(resp.GetUser())
}

// RequestAccountDeletion starts the account deletion workflow. Idempotent
// per caller idempotency key.
func (c *IdentityClient) RequestAccountDeletion(ctx context.Context, idempotencyKey string, userID uuid.UUID) (DeletionOperation, error) {
	resp, err := c.client.RequestAccountDeletion(ctx, &identityv1.RequestAccountDeletionRequest{
		IdempotencyKey: idempotencyKey,
		UserId:         userID.String(),
	})
	if err != nil {
		return DeletionOperation{}, fmt.Errorf("identity.RequestAccountDeletion: %w", err)
	}
	return toDeletionOperation(resp.GetOperation())
}

func toUser(u *identityv1.User) (User, error) {
	id, err := uuid.Parse(u.GetId())
	if err != nil {
		return User{}, fmt.Errorf("identity returned an invalid user id: %w", err)
	}
	return User{
		ID:            id,
		Email:         u.GetEmail(),
		Name:          u.GetName(),
		ImageURL:      u.GetImageUrl(),
		EmailVerified: u.GetEmailVerified(),
		State:         identityAccountStateToString(u.GetState()),
		CreatedAt:     u.GetCreatedAt().AsTime(),
	}, nil
}

func identityAccountStateToString(s identityv1.AccountState) string {
	switch s {
	case identityv1.AccountState_ACCOUNT_STATE_ACTIVE:
		return "active"
	case identityv1.AccountState_ACCOUNT_STATE_DELETION_PENDING:
		return "deletion_pending"
	case identityv1.AccountState_ACCOUNT_STATE_TOMBSTONED:
		return "tombstoned"
	default:
		return "unspecified"
	}
}

func toDeletionOperation(op *identityv1.DeletionOperation) (DeletionOperation, error) {
	deletionID, err := uuid.Parse(op.GetDeletionId())
	if err != nil {
		return DeletionOperation{}, fmt.Errorf("identity returned an invalid deletion id: %w", err)
	}
	userID, err := uuid.Parse(op.GetUserId())
	if err != nil {
		return DeletionOperation{}, fmt.Errorf("identity returned an invalid user id: %w", err)
	}
	out := DeletionOperation{
		DeletionID: deletionID,
		UserID:     userID,
		State:      identityDeletionStateToString(op.GetState()),
		CreatedAt:  op.GetCreatedAt().AsTime(),
	}
	if op.GetCompletedAt() != nil {
		completedAt := op.GetCompletedAt().AsTime()
		out.CompletedAt = &completedAt
	}
	return out, nil
}

func identityDeletionStateToString(s identityv1.DeletionState) string {
	switch s {
	case identityv1.DeletionState_DELETION_STATE_PENDING:
		return "pending"
	case identityv1.DeletionState_DELETION_STATE_COMPLETED:
		return "completed"
	case identityv1.DeletionState_DELETION_STATE_FAILED_ATTENTION_REQUIRED:
		return "failed_attention_required"
	default:
		return "unspecified"
	}
}
