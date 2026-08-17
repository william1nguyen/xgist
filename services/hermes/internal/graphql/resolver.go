package graphql

// THIS CODE WILL BE UPDATED WITH SCHEMA CHANGES. PREVIOUS IMPLEMENTATION FOR SCHEMA CHANGES WILL BE KEPT IN THE COMMENT SECTION. IMPLEMENTATION FOR UNCHANGED SCHEMA WILL BE KEPT.

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/nolannguyen1212/media-notes/services/hermes/internal/graphql/model"
	"github.com/nolannguyen1212/media-notes/services/hermes/internal/limits"
)

type Resolver struct {
	identity IdentityClient
	billing  BillingClient
	media    MediaClient
	content  ContentClient
	limiter  *limits.Limiter
	logger   *slog.Logger
}

func (r *Resolver) buildPromptOverrides(ctx context.Context, userID uuid.UUID, options []string) (map[string]string, error) {
	settings, err := r.identity.GetPromptSettings(ctx, userID)
	if err != nil {
		return nil, err
	}
	if len(settings) == 0 {
		return nil, nil
	}
	selected := make(map[string]bool, len(options))
	for _, o := range options {
		selected[o] = true
	}
	overrides := make(map[string]string)
	for _, s := range settings {
		if s.PromptText != "" && selected[s.Section] {
			overrides[s.Section] = s.PromptText
		}
	}
	return overrides, nil
}

// Register is the resolver for the register field.
func (r *mutationResolver) Register(ctx context.Context, email string, password string, name string, idempotencyKey *string) (*model.User, error) {
	if err := r.checkRateLimit(ctx, limits.ClassAuthAttempt, "ip:"+limits.ClientIPFromContext(ctx)); err != nil {
		return nil, err
	}

	user, err := r.identity.Register(ctx, idempotencyKeyOrNew(idempotencyKey), email, password, name)
	if err != nil {
		return nil, err
	}
	return toModelUser(user), nil
}

// Login is the resolver for the login field.
func (r *mutationResolver) Login(ctx context.Context, email string, password string, idempotencyKey *string) (*model.AuthPayload, error) {
	if err := r.checkRateLimit(ctx, limits.ClassAuthAttempt, "ip:"+limits.ClientIPFromContext(ctx)); err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassAuthAttempt, "account:"+strings.ToLower(email)); err != nil {
		return nil, err
	}

	session, err := r.identity.Authenticate(ctx, idempotencyKeyOrNew(idempotencyKey), email, password)
	if err != nil {
		return nil, err
	}
	return toModelAuthPayload(session), nil
}

// Logout is the resolver for the logout field.
func (r *mutationResolver) Logout(ctx context.Context) (bool, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return false, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return false, err
	}

	if err := r.identity.RevokeSession(ctx, principal.SessionID); err != nil {
		return false, err
	}
	return true, nil
}

// RequestAccountDeletion is the resolver for the requestAccountDeletion field.
func (r *mutationResolver) RequestAccountDeletion(ctx context.Context, idempotencyKey *string) (*model.DeletionOperation, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	op, err := r.identity.RequestAccountDeletion(ctx, idempotencyKeyOrNew(idempotencyKey), principal.User.ID)
	if err != nil {
		return nil, err
	}
	return toModelDeletionOperation(op), nil
}

// CreateUploadSession is the resolver for the createUploadSession field.
func (r *mutationResolver) CreateUploadSession(ctx context.Context, title string, mimeType string, declaredSizeBytes int, idempotencyKey *string) (*model.UploadSession, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassUploadSession, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	session, err := r.media.CreateUploadSession(ctx, idempotencyKeyOrNew(idempotencyKey), principal.User.ID, title, mimeType, int64(declaredSizeBytes))
	if err != nil {
		return nil, err
	}
	return toModelUploadSession(session), nil
}

// ConfirmUpload is the resolver for the confirmUpload field.
func (r *mutationResolver) ConfirmUpload(ctx context.Context, uploadSessionID string, options []string, audioVoice *string, idempotencyKey *string) (*model.MediaDetail, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassUploadSession, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	sessionID, err := uuid.Parse(uploadSessionID)
	if err != nil {
		return nil, fmt.Errorf("uploadSessionId must be a UUID: %w", err)
	}

	var voice string
	if audioVoice != nil {
		voice = *audioVoice
	}

	promptOverrides, err := r.buildPromptOverrides(ctx, principal.User.ID, options)
	if err != nil {
		return nil, err
	}

	m, err := r.media.ConfirmUpload(ctx, idempotencyKeyOrNew(idempotencyKey), sessionID, options, voice, promptOverrides)
	if err != nil {
		return nil, err
	}
	return toModelMediaDetail(m, "", time.Time{}), nil
}

// UpdateMedia is the resolver for the updateMedia field.
func (r *mutationResolver) UpdateMedia(ctx context.Context, id string, title *string, description *string) (*model.MediaDetail, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	mediaID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("id must be a UUID: %w", err)
	}

	existing, err := r.media.GetMedia(ctx, mediaID)
	if err != nil {
		return nil, err
	}
	if existing.OwnerID != principal.User.ID {
		return nil, ErrNotFound
	}

	m, err := r.media.UpdateMedia(ctx, mediaID, title, description)
	if err != nil {
		return nil, err
	}
	return toModelMediaDetail(m, "", time.Time{}), nil
}

// RequestProcessing is the resolver for the requestProcessing field.
func (r *mutationResolver) RequestProcessing(ctx context.Context, mediaID string, options []string, audioVoice *string, idempotencyKey *string) (*model.MediaDetail, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassUploadSession, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	id, err := uuid.Parse(mediaID)
	if err != nil {
		return nil, fmt.Errorf("mediaId must be a UUID: %w", err)
	}

	existing, err := r.media.GetMedia(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.OwnerID != principal.User.ID {
		return nil, ErrNotFound
	}

	var voice string
	if audioVoice != nil {
		voice = *audioVoice
	}

	promptOverrides, err := r.buildPromptOverrides(ctx, principal.User.ID, options)
	if err != nil {
		return nil, err
	}

	m, err := r.media.RequestProcessing(ctx, idempotencyKeyOrNew(idempotencyKey), id, options, voice, promptOverrides)
	if err != nil {
		return nil, err
	}
	return toModelMediaDetail(m, "", time.Time{}), nil
}

// UpdatePromptSetting is the resolver for the updatePromptSetting field.
func (r *mutationResolver) UpdatePromptSetting(ctx context.Context, section string, promptText string) (*model.PromptSetting, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	setting, err := r.identity.UpsertPromptSetting(ctx, principal.User.ID, section, promptText)
	if err != nil {
		return nil, err
	}
	return toModelPromptSetting(setting), nil
}

// TrashMedia is the resolver for the trashMedia field.
func (r *mutationResolver) TrashMedia(ctx context.Context, id string) (*model.Media, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	mediaID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("id must be a UUID: %w", err)
	}

	existing, err := r.media.GetMedia(ctx, mediaID)
	if err != nil {
		return nil, err
	}
	if existing.OwnerID != principal.User.ID {
		return nil, ErrNotFound
	}

	m, err := r.media.TrashMedia(ctx, mediaID)
	if err != nil {
		return nil, err
	}
	return toModelMedia(m), nil
}

// RestoreMedia is the resolver for the restoreMedia field.
func (r *mutationResolver) RestoreMedia(ctx context.Context, id string) (*model.Media, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	mediaID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("id must be a UUID: %w", err)
	}

	existing, err := r.media.GetMedia(ctx, mediaID)
	if err != nil {
		return nil, err
	}
	if existing.OwnerID != principal.User.ID {
		return nil, ErrNotFound
	}

	m, err := r.media.RestoreMedia(ctx, mediaID)
	if err != nil {
		return nil, err
	}
	return toModelMedia(m), nil
}

// DeleteMediaPermanently is the resolver for the deleteMediaPermanently field.
func (r *mutationResolver) DeleteMediaPermanently(ctx context.Context, id string) (bool, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return false, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return false, err
	}

	mediaID, err := uuid.Parse(id)
	if err != nil {
		return false, fmt.Errorf("id must be a UUID: %w", err)
	}

	existing, err := r.media.GetMedia(ctx, mediaID)
	if err != nil {
		return false, err
	}
	if existing.OwnerID != principal.User.ID {
		return false, ErrNotFound
	}

	if err := r.media.DeleteMediaPermanently(ctx, mediaID); err != nil {
		return false, err
	}
	return true, nil
}

// DraftAudioScript is the resolver for the draftAudioScript field.
func (r *mutationResolver) DraftAudioScript(ctx context.Context, description string, idempotencyKey *string) (*model.AudioJob, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	job, err := r.content.RequestScriptDraft(ctx, idempotencyKeyOrNew(idempotencyKey), principal.User.ID, description)
	if err != nil {
		return nil, err
	}
	return toModelAudioJob(job), nil
}

// GenerateStandaloneAudio is the resolver for the generateStandaloneAudio field.
func (r *mutationResolver) GenerateStandaloneAudio(ctx context.Context, text string, voice *string, idempotencyKey *string) (*model.AudioJob, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	var v string
	if voice != nil {
		v = *voice
	}
	job, err := r.content.RequestStandaloneAudio(ctx, idempotencyKeyOrNew(idempotencyKey), principal.User.ID, text, v)
	if err != nil {
		return nil, err
	}
	return toModelAudioJob(job), nil
}

// Me is the resolver for the me field.
func (r *queryResolver) Me(ctx context.Context) (*model.User, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	user, err := r.identity.GetUser(ctx, principal.User.ID)
	if err != nil {
		return nil, err
	}
	return toModelUser(user), nil
}

// MediaList is the resolver for the mediaList field.
func (r *queryResolver) MediaList(ctx context.Context, cursor *string, pageSize *int, search *string) (*model.MediaPage, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassMediaRead, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	var cursorValue string
	if cursor != nil {
		cursorValue = *cursor
	}
	var pageSizeValue int32
	if pageSize != nil {
		pageSizeValue = int32(*pageSize)
	}

	var searchValue string
	if search != nil {
		searchValue = *search
	}

	page, err := r.media.ListMedia(ctx, principal.User.ID, cursorValue, pageSizeValue, searchValue)
	if err != nil {
		return nil, err
	}

	items := make([]model.Media, 0, len(page.Items))
	for _, m := range page.Items {
		items = append(items, *toModelMedia(m))
	}
	return &model.MediaPage{Items: items, NextCursor: optionalString(page.NextCursor)}, nil
}

// MediaDetail is the resolver for the mediaDetail field.
func (r *queryResolver) MediaDetail(ctx context.Context, id string) (*model.MediaDetail, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassMediaRead, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	mediaID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("id must be a UUID: %w", err)
	}

	m, err := r.media.GetMedia(ctx, mediaID)
	if err != nil {
		return nil, err
	}
	// Ownership is verified from the owning service's response, never
	// accepted from query input — an id that resolves but belongs to
	// another owner is indistinguishable from an unknown id.
	if m.OwnerID != principal.User.ID {
		return nil, ErrNotFound
	}

	playbackURL, playbackExpiresAt, err := r.media.SignPlaybackURL(ctx, mediaID)
	if err != nil {
		// A signing failure does not fail the whole detail read: the page
		// still renders without playback, matching media's own
		// best-effort thumbnail precedent.
		r.logger.WarnContext(ctx, "sign playback url failed", "error", err, "media_id", mediaID)
		return toModelMediaDetail(m, "", time.Time{}), nil
	}
	return toModelMediaDetail(m, playbackURL, playbackExpiresAt), nil
}

// ContentDetail is the resolver for the contentDetail field.
func (r *queryResolver) ContentDetail(ctx context.Context, mediaID string) (*model.Content, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassMediaRead, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	id, err := uuid.Parse(mediaID)
	if err != nil {
		return nil, fmt.Errorf("mediaId must be a UUID: %w", err)
	}

	// content owns no owner_id of its own (docs/adr/0001), so ownership is
	// verified against media, the service that does, before content is
	// read or returned.
	m, err := r.media.GetMedia(ctx, id)
	if err != nil {
		return nil, err
	}
	if m.OwnerID != principal.User.ID {
		return nil, ErrNotFound
	}

	content, err := r.content.GetContent(ctx, id)
	if err != nil {
		return nil, err
	}
	return toModelContent(content), nil
}

// MediaProgress is the resolver for the mediaProgress field.
func (r *queryResolver) MediaProgress(ctx context.Context, ids []string) ([]model.MediaProgress, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassMediaRead, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}
	if len(ids) == 0 || len(ids) > 50 {
		return nil, fmt.Errorf("ids must contain 1-50 items")
	}

	parsed := make([]uuid.UUID, 0, len(ids))
	for _, raw := range ids {
		id, err := uuid.Parse(raw)
		if err != nil {
			return nil, fmt.Errorf("ids must be UUIDs: %w", err)
		}
		parsed = append(parsed, id)
	}

	items, err := r.media.GetMediaProgress(ctx, principal.User.ID, parsed)
	if err != nil {
		return nil, err
	}

	out := make([]model.MediaProgress, 0, len(items))
	for _, p := range items {
		out = append(out, *toModelMediaProgress(p))
	}
	return out, nil
}

// Quote is the resolver for the quote field.
func (r *queryResolver) Quote(ctx context.Context, options []string) (*model.Quote, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	quote, err := r.billing.GetQuote(ctx, uuid.NewString(), principal.User.ID, options)
	if err != nil {
		return nil, err
	}
	return toModelQuote(quote), nil
}

// PriceCatalog is the resolver for the priceCatalog field.
func (r *queryResolver) PriceCatalog(ctx context.Context) (*model.PriceCatalog, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	catalog, err := r.billing.GetPriceCatalog(ctx)
	if err != nil {
		return nil, err
	}
	return toModelPriceCatalog(catalog), nil
}

// BillingSummary is the resolver for the billingSummary field.
func (r *queryResolver) BillingSummary(ctx context.Context) (*model.BillingSummary, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	summary, err := r.billing.GetBillingSummary(ctx, principal.User.ID)
	if err != nil {
		return nil, err
	}
	return toModelBillingSummary(summary), nil
}

// CreditLedgerHistory is the resolver for the creditLedgerHistory field.
func (r *queryResolver) CreditLedgerHistory(ctx context.Context, cursor *string, pageSize *int) (*model.CreditLedgerPage, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	var c string
	if cursor != nil {
		c = *cursor
	}
	size := int32(20)
	if pageSize != nil {
		size = int32(*pageSize)
	}

	page, err := r.billing.ListCreditLedger(ctx, principal.User.ID, c, size)
	if err != nil {
		return nil, err
	}
	return toModelCreditLedgerPage(page), nil
}

// PromptSettings is the resolver for the promptSettings field.
func (r *queryResolver) PromptSettings(ctx context.Context) ([]model.PromptSetting, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	settings, err := r.identity.GetPromptSettings(ctx, principal.User.ID)
	if err != nil {
		return nil, err
	}
	out := make([]model.PromptSetting, 0, len(settings))
	for _, s := range settings {
		out = append(out, *toModelPromptSetting(s))
	}
	return out, nil
}

// TrashedMedia is the resolver for the trashedMedia field.
func (r *queryResolver) TrashedMedia(ctx context.Context, cursor *string, pageSize *int) (*model.MediaPage, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassMediaRead, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	var cursorValue string
	if cursor != nil {
		cursorValue = *cursor
	}
	var pageSizeValue int32
	if pageSize != nil {
		pageSizeValue = int32(*pageSize)
	}

	page, err := r.media.ListTrashedMedia(ctx, principal.User.ID, cursorValue, pageSizeValue)
	if err != nil {
		return nil, err
	}

	items := make([]model.Media, 0, len(page.Items))
	for _, m := range page.Items {
		items = append(items, *toModelMedia(m))
	}
	return &model.MediaPage{Items: items, NextCursor: optionalString(page.NextCursor)}, nil
}

// AudioJob is the resolver for the audioJob field.
func (r *queryResolver) AudioJob(ctx context.Context, id string) (*model.AudioJob, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	jobID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("id must be a UUID: %w", err)
	}

	job, err := r.content.GetAudioJob(ctx, jobID)
	if err != nil {
		return nil, err
	}
	if job.UserID != principal.User.ID {
		return nil, ErrNotFound
	}
	return toModelAudioJob(job), nil
}

// AudioJobs is the resolver for the audioJobs field.
func (r *queryResolver) AudioJobs(ctx context.Context, kind *string, cursor *string, pageSize *int) (*model.AudioJobPage, error) {
	principal, err := requirePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.checkRateLimit(ctx, limits.ClassOther, "user:"+principal.User.ID.String()); err != nil {
		return nil, err
	}

	kindValue := "audio"
	if kind != nil && *kind != "" {
		kindValue = *kind
	}
	var cursorValue string
	if cursor != nil {
		cursorValue = *cursor
	}
	var pageSizeValue int32
	if pageSize != nil {
		pageSizeValue = int32(*pageSize)
	}

	page, err := r.content.ListAudioJobs(ctx, principal.User.ID, kindValue, cursorValue, pageSizeValue)
	if err != nil {
		return nil, err
	}
	items := make([]model.AudioJob, 0, len(page.Items))
	for _, j := range page.Items {
		items = append(items, *toModelAudioJob(j))
	}
	return &model.AudioJobPage{Items: items, NextCursor: optionalString(page.NextCursor)}, nil
}

// Mutation returns MutationResolver implementation.
func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

// Query returns QueryResolver implementation.
func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)

