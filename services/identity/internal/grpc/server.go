// Package grpcserver adapts the account and session application services
// to the generated IdentityServiceServer contract: request/response
// mapping and domain-error-to-gRPC-status translation.
package grpcserver

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	identityv1 "github.com/nolannguyen1212/media-notes/contracts/gen/go/media_notes/identity/v1"
	"github.com/nolannguyen1212/media-notes/services/identity/internal/account"
	"github.com/nolannguyen1212/media-notes/services/identity/internal/session"
)

// AccountService is the account application-service boundary the server
// depends on. *account.Service implements it.
type AccountService interface {
	Register(ctx context.Context, in account.NewAccount) (account.User, error)
	GetUser(ctx context.Context, id uuid.UUID) (account.User, error)
	UpdateUser(ctx context.Context, id uuid.UUID, patch account.ProfilePatch) (account.User, error)
	RequestDeletion(ctx context.Context, userID uuid.UUID) (account.DeletionOperation, error)
	GetDeletion(ctx context.Context, deletionID uuid.UUID) (account.DeletionOperation, error)
}

// SessionService is the session application-service boundary the server
// depends on. *session.Service implements it.
type SessionService interface {
	Authenticate(ctx context.Context, email, password string) (session.Session, account.User, error)
	ValidateSession(ctx context.Context, token string) (session.Session, account.User, error)
	RevokeSession(ctx context.Context, sessionID uuid.UUID) error
}

// Server implements identityv1.IdentityServiceServer.
type Server struct {
	identityv1.UnimplementedIdentityServiceServer
	accounts AccountService
	sessions SessionService
}

// NewServer returns a Server.
func NewServer(accounts AccountService, sessions SessionService) *Server {
	return &Server{accounts: accounts, sessions: sessions}
}

func (s *Server) RegisterAccount(ctx context.Context, req *identityv1.RegisterAccountRequest) (*identityv1.RegisterAccountResponse, error) {
	if req.GetEmail() == "" || req.GetPassword() == "" {
		return nil, status.Error(codes.InvalidArgument, "email and password are required")
	}

	user, err := s.accounts.Register(ctx, account.NewAccount{
		Email:    req.GetEmail(),
		Password: req.GetPassword(),
		Name:     req.GetName(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &identityv1.RegisterAccountResponse{User: toProtoUser(user)}, nil
}

func (s *Server) Authenticate(ctx context.Context, req *identityv1.AuthenticateRequest) (*identityv1.AuthenticateResponse, error) {
	if req.GetEmail() == "" || req.GetPassword() == "" {
		return nil, status.Error(codes.InvalidArgument, "email and password are required")
	}

	sess, user, err := s.sessions.Authenticate(ctx, req.GetEmail(), req.GetPassword())
	if err != nil {
		return nil, mapError(err)
	}
	return &identityv1.AuthenticateResponse{
		User:         toProtoUser(user),
		SessionToken: sess.Token,
		ExpiresAt:    timestamppb.New(sess.ExpiresAt),
	}, nil
}

func (s *Server) ValidateSession(ctx context.Context, req *identityv1.ValidateSessionRequest) (*identityv1.ValidateSessionResponse, error) {
	if req.GetSessionToken() == "" {
		return nil, status.Error(codes.InvalidArgument, "session_token is required")
	}

	sess, user, err := s.sessions.ValidateSession(ctx, req.GetSessionToken())
	if err != nil {
		return nil, mapError(err)
	}
	return &identityv1.ValidateSessionResponse{User: toProtoUser(user), SessionId: sess.ID.String()}, nil
}

func (s *Server) RevokeSession(ctx context.Context, req *identityv1.RevokeSessionRequest) (*identityv1.RevokeSessionResponse, error) {
	id, err := uuid.Parse(req.GetSessionId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "session_id must be a UUID")
	}

	if err := s.sessions.RevokeSession(ctx, id); err != nil {
		return nil, mapError(err)
	}
	return &identityv1.RevokeSessionResponse{}, nil
}

func (s *Server) GetUser(ctx context.Context, req *identityv1.GetUserRequest) (*identityv1.GetUserResponse, error) {
	id, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "user_id must be a UUID")
	}

	user, err := s.accounts.GetUser(ctx, id)
	if err != nil {
		return nil, mapError(err)
	}
	return &identityv1.GetUserResponse{User: toProtoUser(user)}, nil
}

func (s *Server) UpdateUser(ctx context.Context, req *identityv1.UpdateUserRequest) (*identityv1.UpdateUserResponse, error) {
	id, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "user_id must be a UUID")
	}

	user, err := s.accounts.UpdateUser(ctx, id, account.ProfilePatch{
		Name:     req.Name,
		ImageURL: req.ImageUrl,
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &identityv1.UpdateUserResponse{User: toProtoUser(user)}, nil
}

func (s *Server) RequestAccountDeletion(ctx context.Context, req *identityv1.RequestAccountDeletionRequest) (*identityv1.RequestAccountDeletionResponse, error) {
	id, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "user_id must be a UUID")
	}

	op, err := s.accounts.RequestDeletion(ctx, id)
	if err != nil {
		return nil, mapError(err)
	}
	return &identityv1.RequestAccountDeletionResponse{Operation: toProtoDeletion(op)}, nil
}

func (s *Server) GetAccountDeletionStatus(ctx context.Context, req *identityv1.GetAccountDeletionStatusRequest) (*identityv1.GetAccountDeletionStatusResponse, error) {
	id, err := uuid.Parse(req.GetDeletionId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "deletion_id must be a UUID")
	}

	op, err := s.accounts.GetDeletion(ctx, id)
	if err != nil {
		return nil, mapError(err)
	}
	return &identityv1.GetAccountDeletionStatusResponse{Operation: toProtoDeletion(op)}, nil
}

func mapError(err error) error {
	switch {
	case errors.Is(err, account.ErrNotFound), errors.Is(err, account.ErrDeletionNotFound):
		return status.Error(codes.NotFound, err.Error())
	case errors.Is(err, account.ErrEmailTaken):
		return status.Error(codes.AlreadyExists, err.Error())
	case errors.Is(err, account.ErrInvalidCredentials), errors.Is(err, session.ErrInvalidToken):
		return status.Error(codes.Unauthenticated, err.Error())
	case errors.Is(err, account.ErrAccountNotActive), errors.Is(err, session.ErrAccountNotUsable):
		return status.Error(codes.FailedPrecondition, err.Error())
	case errors.Is(err, account.ErrUnknownDeletionOwner):
		return status.Error(codes.InvalidArgument, err.Error())
	default:
		// Do not leak internal error detail across the gRPC boundary;
		// the logging interceptor records the real error server-side.
		return status.Error(codes.Internal, "internal error")
	}
}

func toProtoUser(u account.User) *identityv1.User {
	return &identityv1.User{
		Id:            u.ID.String(),
		Email:         u.Email,
		Name:          u.Name,
		ImageUrl:      u.ImageURL,
		EmailVerified: u.EmailVerifiedAt != nil,
		State:         toProtoState(u.State),
		CreatedAt:     timestamppb.New(u.CreatedAt),
	}
}

func toProtoState(s account.State) identityv1.AccountState {
	switch s {
	case account.StateActive:
		return identityv1.AccountState_ACCOUNT_STATE_ACTIVE
	case account.StateDeletionPending:
		return identityv1.AccountState_ACCOUNT_STATE_DELETION_PENDING
	case account.StateTombstoned:
		return identityv1.AccountState_ACCOUNT_STATE_TOMBSTONED
	default:
		return identityv1.AccountState_ACCOUNT_STATE_UNSPECIFIED
	}
}

func toProtoDeletion(op account.DeletionOperation) *identityv1.DeletionOperation {
	out := &identityv1.DeletionOperation{
		DeletionId: op.DeletionID.String(),
		UserId:     op.UserID.String(),
		State:      toProtoDeletionState(op.State),
		CreatedAt:  timestamppb.New(op.CreatedAt),
	}
	if op.CompletedAt != nil {
		out.CompletedAt = timestamppb.New(*op.CompletedAt)
	}
	return out
}

func toProtoDeletionState(s account.DeletionState) identityv1.DeletionState {
	switch s {
	case account.DeletionPending:
		return identityv1.DeletionState_DELETION_STATE_PENDING
	case account.DeletionCompleted:
		return identityv1.DeletionState_DELETION_STATE_COMPLETED
	case account.DeletionFailedAttentionRequired:
		return identityv1.DeletionState_DELETION_STATE_FAILED_ATTENTION_REQUIRED
	default:
		return identityv1.DeletionState_DELETION_STATE_UNSPECIFIED
	}
}
