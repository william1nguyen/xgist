package graphql

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/hermes/internal/auth"
	"github.com/nolannguyen1212/media-notes/services/hermes/internal/clients"
	"github.com/nolannguyen1212/media-notes/services/hermes/internal/limits"
)

// NewResolver returns a Resolver wired to every downstream client and the
// rate limiter. Each field is a narrow interface the corresponding
// internal/clients type implements, so resolver tests can substitute
// fakes without a live gRPC/Redis connection.
func NewResolver(identity IdentityClient, billing BillingClient, media MediaClient, content ContentClient, limiter *limits.Limiter, logger *slog.Logger) *Resolver {
	return &Resolver{
		identity: identity,
		billing:  billing,
		media:    media,
		content:  content,
		limiter:  limiter,
		logger:   logger,
	}
}

// IdentityClient is the identity boundary resolvers depend on.
// *clients.IdentityClient implements it.
type IdentityClient interface {
	Register(ctx context.Context, idempotencyKey, email, password, name string) (clients.User, error)
	Authenticate(ctx context.Context, idempotencyKey, email, password string) (clients.Session, error)
	ValidateSession(ctx context.Context, token string) (clients.Principal, error)
	RevokeSession(ctx context.Context, sessionID uuid.UUID) error
	GetUser(ctx context.Context, userID uuid.UUID) (clients.User, error)
	RequestAccountDeletion(ctx context.Context, idempotencyKey string, userID uuid.UUID) (clients.DeletionOperation, error)
	GetPromptSettings(ctx context.Context, userID uuid.UUID) ([]clients.PromptSetting, error)
	UpsertPromptSetting(ctx context.Context, userID uuid.UUID, section, promptText string) (clients.PromptSetting, error)
}

// BillingClient is the billing boundary resolvers depend on.
// *clients.BillingClient implements it.
type BillingClient interface {
	GetQuote(ctx context.Context, idempotencyKey string, userID uuid.UUID, options []string) (clients.Quote, error)
	GetPriceCatalog(ctx context.Context) (clients.Catalog, error)
	GetBillingSummary(ctx context.Context, userID uuid.UUID) (clients.BillingSummary, error)
	ListCreditLedger(ctx context.Context, userID uuid.UUID, cursor string, pageSize int32) (clients.LedgerPage, error)
}

// MediaClient is the media boundary resolvers depend on.
// *clients.MediaClient implements it.
type MediaClient interface {
	CreateUploadSession(ctx context.Context, idempotencyKey string, ownerID uuid.UUID, title, mimeType string, declaredSizeBytes int64) (clients.UploadSession, error)
	ConfirmUpload(ctx context.Context, idempotencyKey string, uploadSessionID uuid.UUID, options []string, audioVoice string, promptOverrides map[string]string) (clients.Media, error)
	GetMedia(ctx context.Context, mediaID uuid.UUID) (clients.Media, error)
	ListMedia(ctx context.Context, ownerID uuid.UUID, cursor string, pageSize int32, search string) (clients.MediaPage, error)
	SignPlaybackURL(ctx context.Context, mediaID uuid.UUID) (string, time.Time, error)
	GetMediaProgress(ctx context.Context, ownerID uuid.UUID, ids []uuid.UUID) ([]clients.MediaProgress, error)
	UpdateMedia(ctx context.Context, mediaID uuid.UUID, title, description *string) (clients.Media, error)
	RequestProcessing(ctx context.Context, idempotencyKey string, mediaID uuid.UUID, options []string, audioVoice string, promptOverrides map[string]string) (clients.Media, error)
	TrashMedia(ctx context.Context, mediaID uuid.UUID) (clients.Media, error)
	RestoreMedia(ctx context.Context, mediaID uuid.UUID) (clients.Media, error)
	ListTrashedMedia(ctx context.Context, ownerID uuid.UUID, cursor string, pageSize int32) (clients.MediaPage, error)
	DeleteMediaPermanently(ctx context.Context, mediaID uuid.UUID) error
	RequestThumbnailUpload(ctx context.Context, mediaID uuid.UUID, mimeType string) (objectKey, uploadURL string, expiresAt time.Time, err error)
	SetThumbnail(ctx context.Context, mediaID uuid.UUID, objectKey, mimeType string) error
}

// ContentClient is the content boundary resolvers depend on.
// *clients.ContentClient implements it.
type ContentClient interface {
	GetContent(ctx context.Context, mediaID uuid.UUID) (clients.Content, error)
	RequestScriptDraft(ctx context.Context, idempotencyKey string, userID uuid.UUID, description string) (clients.AudioJob, error)
	RequestStandaloneAudio(ctx context.Context, idempotencyKey string, userID uuid.UUID, text, voice string) (clients.AudioJob, error)
	GetAudioJob(ctx context.Context, id uuid.UUID) (clients.AudioJob, error)
	ListAudioJobs(ctx context.Context, userID uuid.UUID, kind, cursor string, pageSize int32) (clients.AudioJobPage, error)
}

// requirePrincipal returns the authenticated caller, or ErrUnauthenticated
// (re-exported as auth.ErrUnauthenticated) when the request carried no
// valid session.
func requirePrincipal(ctx context.Context) (clients.Principal, error) {
	principal, ok := auth.FromContext(ctx)
	if !ok {
		return clients.Principal{}, auth.ErrUnauthenticated
	}
	return principal, nil
}

// idempotencyKeyOrNew returns key if the caller supplied one, otherwise a
// fresh UUID. hermes generates one on the caller's behalf so every
// downstream mutation still carries an idempotency key even when a
// GraphQL client omits it, but a client that wants retry-safety across
// its own request retries must supply its own.
func idempotencyKeyOrNew(key *string) string {
	if key != nil && *key != "" {
		return *key
	}
	return uuid.NewString()
}

// checkRateLimit enforces class for key and translates a denial into
// *RateLimitError. A Redis error fails open — logged, but not rejected —
// since ADR 0004 leaves the fail-open/fail-closed choice to the
// implementation and an available API degrades better than a fully down
// one when the rate limiter itself is unhealthy.
func (r *Resolver) checkRateLimit(ctx context.Context, class limits.Class, key string) error {
	if r.limiter == nil {
		return nil
	}
	res, err := r.limiter.Allow(ctx, class, key)
	if err != nil {
		r.logger.ErrorContext(ctx, "rate limit check failed, failing open", "error", err, "class", class.Name)
		return nil
	}
	if !res.Allowed {
		limits.MarkRateLimited(ctx, res.RetryAfter)
		return &RateLimitError{RetryAfter: res.RetryAfter}
	}
	return nil
}
