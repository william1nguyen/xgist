package clients

import (
	"context"
	"fmt"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"github.com/google/uuid"

	mediav1 "github.com/nolannguyen1212/media-notes/contracts/gen/go/media_notes/media/v1"
)

// MediaClient calls media's gRPC API: uploads, media metadata, and
// processing status.
type MediaClient struct {
	client mediav1.MediaServiceClient
	conn   *grpc.ClientConn
}

// NewMediaClient dials addr (media's gRPC listener) and returns a
// MediaClient.
func NewMediaClient(addr string) (*MediaClient, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("dial media at %s: %w", addr, err)
	}
	return &MediaClient{client: mediav1.NewMediaServiceClient(conn), conn: conn}, nil
}

// Close closes the underlying gRPC connection.
func (c *MediaClient) Close() error {
	return c.conn.Close()
}

// CreateUploadSession validates the declared MIME type and size and
// returns a session with a short-lived presigned upload URL.
func (c *MediaClient) CreateUploadSession(ctx context.Context, idempotencyKey string, ownerID uuid.UUID, title, mimeType string, declaredSizeBytes int64) (UploadSession, error) {
	resp, err := c.client.CreateUploadSession(ctx, &mediav1.CreateUploadSessionRequest{
		IdempotencyKey:    idempotencyKey,
		OwnerId:           ownerID.String(),
		Title:             title,
		MimeType:          mimeType,
		DeclaredSizeBytes: declaredSizeBytes,
	})
	if err != nil {
		return UploadSession{}, fmt.Errorf("media.CreateUploadSession: %w", err)
	}
	return toUploadSession(resp.GetSession())
}

// ConfirmUpload reads authoritative object metadata and, on success,
// atomically creates the processing request.
func (c *MediaClient) ConfirmUpload(ctx context.Context, idempotencyKey string, uploadSessionID uuid.UUID, options []string, audioVoice string, promptOverrides map[string]string) (Media, error) {
	resp, err := c.client.ConfirmUpload(ctx, &mediav1.ConfirmUploadRequest{
		IdempotencyKey:  idempotencyKey,
		UploadSessionId: uploadSessionID.String(),
		Options:         options,
		AudioVoice:      audioVoice,
		PromptOverrides: promptOverrides,
	})
	if err != nil {
		return Media{}, fmt.Errorf("media.ConfirmUpload: %w", err)
	}
	return toMedia(resp.GetMedia())
}

// GetMedia returns one media item's metadata.
func (c *MediaClient) GetMedia(ctx context.Context, mediaID uuid.UUID) (Media, error) {
	resp, err := c.client.GetMedia(ctx, &mediav1.GetMediaRequest{MediaId: mediaID.String()})
	if err != nil {
		return Media{}, fmt.Errorf("media.GetMedia: %w", err)
	}
	return toMedia(resp.GetMedia())
}

// ListMedia returns a cursor-paginated page for one owner.
func (c *MediaClient) ListMedia(ctx context.Context, ownerID uuid.UUID, cursor string, pageSize int32, search string) (MediaPage, error) {
	resp, err := c.client.ListMedia(ctx, &mediav1.ListMediaRequest{
		OwnerId:  ownerID.String(),
		Cursor:   cursor,
		PageSize: pageSize,
		Search:   search,
	})
	if err != nil {
		return MediaPage{}, fmt.Errorf("media.ListMedia: %w", err)
	}
	items := make([]Media, 0, len(resp.GetItems()))
	for _, item := range resp.GetItems() {
		m, err := toMedia(item)
		if err != nil {
			return MediaPage{}, err
		}
		items = append(items, m)
	}
	return MediaPage{Items: items, NextCursor: resp.GetNextCursor()}, nil
}

// SignPlaybackURL returns a short-lived signed URL for the source object.
func (c *MediaClient) SignPlaybackURL(ctx context.Context, mediaID uuid.UUID) (url string, expiresAt time.Time, err error) {
	resp, err := c.client.SignPlaybackUrl(ctx, &mediav1.SignPlaybackUrlRequest{MediaId: mediaID.String()})
	if err != nil {
		return "", time.Time{}, fmt.Errorf("media.SignPlaybackUrl: %w", err)
	}
	return resp.GetUrl(), resp.GetExpiresAt().AsTime(), nil
}

// GetMediaProgress returns a batched processing-status projection for up
// to 50 media items owned by ownerID, per ADR 0005.
func (c *MediaClient) GetMediaProgress(ctx context.Context, ownerID uuid.UUID, ids []uuid.UUID) ([]MediaProgress, error) {
	rawIDs := make([]string, 0, len(ids))
	for _, id := range ids {
		rawIDs = append(rawIDs, id.String())
	}
	resp, err := c.client.GetMediaProgress(ctx, &mediav1.GetMediaProgressRequest{
		OwnerId:  ownerID.String(),
		MediaIds: rawIDs,
	})
	if err != nil {
		return nil, fmt.Errorf("media.GetMediaProgress: %w", err)
	}
	out := make([]MediaProgress, 0, len(resp.GetItems()))
	for _, item := range resp.GetItems() {
		p, err := toMediaProgress(item)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, nil
}

// UpdateMedia changes a media item's title and/or description. A nil
// field is left unchanged.
func (c *MediaClient) UpdateMedia(ctx context.Context, mediaID uuid.UUID, title, description *string) (Media, error) {
	resp, err := c.client.UpdateMedia(ctx, &mediav1.UpdateMediaRequest{
		MediaId:     mediaID.String(),
		Title:       title,
		Description: description,
	})
	if err != nil {
		return Media{}, fmt.Errorf("media.UpdateMedia: %w", err)
	}
	return toMedia(resp.GetMedia())
}

// RequestProcessing starts a new processing request for a media item that
// has already been confirmed at least once.
func (c *MediaClient) RequestProcessing(ctx context.Context, idempotencyKey string, mediaID uuid.UUID, options []string, audioVoice string, promptOverrides map[string]string) (Media, error) {
	resp, err := c.client.RequestProcessing(ctx, &mediav1.RequestProcessingRequest{
		IdempotencyKey:  idempotencyKey,
		MediaId:         mediaID.String(),
		Options:         options,
		AudioVoice:      audioVoice,
		PromptOverrides: promptOverrides,
	})
	if err != nil {
		return Media{}, fmt.Errorf("media.RequestProcessing: %w", err)
	}
	return toMedia(resp.GetMedia())
}

// TrashMedia moves a media item to the trash — a reversible soft delete.
func (c *MediaClient) TrashMedia(ctx context.Context, mediaID uuid.UUID) (Media, error) {
	resp, err := c.client.TrashMedia(ctx, &mediav1.TrashMediaRequest{MediaId: mediaID.String()})
	if err != nil {
		return Media{}, fmt.Errorf("media.TrashMedia: %w", err)
	}
	return toMedia(resp.GetMedia())
}

// RestoreMedia clears a trashed item's trashed state.
func (c *MediaClient) RestoreMedia(ctx context.Context, mediaID uuid.UUID) (Media, error) {
	resp, err := c.client.RestoreMedia(ctx, &mediav1.RestoreMediaRequest{MediaId: mediaID.String()})
	if err != nil {
		return Media{}, fmt.Errorf("media.RestoreMedia: %w", err)
	}
	return toMedia(resp.GetMedia())
}

// ListTrashedMedia returns a cursor-paginated page of one owner's trashed
// media, newest-trashed first.
func (c *MediaClient) ListTrashedMedia(ctx context.Context, ownerID uuid.UUID, cursor string, pageSize int32) (MediaPage, error) {
	resp, err := c.client.ListTrashedMedia(ctx, &mediav1.ListTrashedMediaRequest{
		OwnerId:  ownerID.String(),
		Cursor:   cursor,
		PageSize: pageSize,
	})
	if err != nil {
		return MediaPage{}, fmt.Errorf("media.ListTrashedMedia: %w", err)
	}
	items := make([]Media, 0, len(resp.GetItems()))
	for _, item := range resp.GetItems() {
		m, err := toMedia(item)
		if err != nil {
			return MediaPage{}, err
		}
		items = append(items, m)
	}
	return MediaPage{Items: items, NextCursor: resp.GetNextCursor()}, nil
}

// DeleteMediaPermanently starts media's irreversible hard-delete flow for
// one item (ADR 0006). Fire-and-forget from hermes's perspective: once
// this returns, the item is already excluded from GetMedia/ListMedia/
// ListTrashedMedia, so there is nothing for the caller to poll.
func (c *MediaClient) DeleteMediaPermanently(ctx context.Context, mediaID uuid.UUID) error {
	_, err := c.client.RequestDeletion(ctx, &mediav1.RequestDeletionRequest{
		MediaId:        mediaID.String(),
		IdempotencyKey: mediaID.String(),
	})
	if err != nil {
		return fmt.Errorf("media.RequestDeletion: %w", err)
	}
	return nil
}

// RequestThumbnailUpload returns a short-lived presigned PUT URL for a
// caller-supplied thumbnail image. The caller PUTs the file directly to
// object storage, then calls SetThumbnail with the returned object key.
func (c *MediaClient) RequestThumbnailUpload(ctx context.Context, mediaID uuid.UUID, mimeType string) (objectKey, uploadURL string, expiresAt time.Time, err error) {
	resp, err := c.client.RequestDerivativeUpload(ctx, &mediav1.RequestDerivativeUploadRequest{
		MediaId:        mediaID.String(),
		DerivativeType: mediav1.DerivativeType_DERIVATIVE_TYPE_THUMBNAIL,
		MimeType:       mimeType,
	})
	if err != nil {
		return "", "", time.Time{}, fmt.Errorf("media.RequestDerivativeUpload: %w", err)
	}
	return resp.GetObjectKey(), resp.GetUploadUrl(), resp.GetExpiresAt().AsTime(), nil
}

// SetThumbnail registers a caller-uploaded thumbnail already durable at
// objectKey, at a fixed version high enough to outrank any
// worker-generated thumbnail (worker always registers at version 1). This
// is scoped to the create wizard's one-shot thumbnail step, not a general
// "change thumbnail later" flow — a second call for the same media would
// collide with the same version and be dropped as a duplicate, per
// RegisterDerivative's (media_id, derivative_type, version) idempotency.
func (c *MediaClient) SetThumbnail(ctx context.Context, mediaID uuid.UUID, objectKey, mimeType string) error {
	_, err := c.client.RegisterDerivative(ctx, &mediav1.RegisterDerivativeRequest{
		IdempotencyKey: objectKey,
		MediaId:        mediaID.String(),
		DerivativeType: mediav1.DerivativeType_DERIVATIVE_TYPE_THUMBNAIL,
		Version:        2,
		ObjectKey:      objectKey,
		MimeType:       mimeType,
	})
	if err != nil {
		return fmt.Errorf("media.RegisterDerivative: %w", err)
	}
	return nil
}

func toUploadSession(s *mediav1.UploadSession) (UploadSession, error) {
	id, err := uuid.Parse(s.GetId())
	if err != nil {
		return UploadSession{}, fmt.Errorf("media returned an invalid session id: %w", err)
	}
	mediaID, err := uuid.Parse(s.GetMediaId())
	if err != nil {
		return UploadSession{}, fmt.Errorf("media returned an invalid media id: %w", err)
	}
	ownerID, err := uuid.Parse(s.GetOwnerId())
	if err != nil {
		return UploadSession{}, fmt.Errorf("media returned an invalid owner id: %w", err)
	}
	return UploadSession{
		ID:        id,
		MediaID:   mediaID,
		OwnerID:   ownerID,
		ObjectKey: s.GetObjectKey(),
		UploadURL: s.GetUploadUrl(),
		Status:    mediaUploadSessionStatusToString(s.GetStatus()),
		ExpiresAt: s.GetExpiresAt().AsTime(),
	}, nil
}

func mediaUploadSessionStatusToString(s mediav1.UploadSessionStatus) string {
	switch s {
	case mediav1.UploadSessionStatus_UPLOAD_SESSION_STATUS_ACTIVE:
		return "active"
	case mediav1.UploadSessionStatus_UPLOAD_SESSION_STATUS_COMPLETED:
		return "completed"
	case mediav1.UploadSessionStatus_UPLOAD_SESSION_STATUS_EXPIRED:
		return "expired"
	case mediav1.UploadSessionStatus_UPLOAD_SESSION_STATUS_CANCELED:
		return "canceled"
	default:
		return "unspecified"
	}
}

func toMedia(m *mediav1.Media) (Media, error) {
	id, err := uuid.Parse(m.GetId())
	if err != nil {
		return Media{}, fmt.Errorf("media returned an invalid media id: %w", err)
	}
	ownerID, err := uuid.Parse(m.GetOwnerId())
	if err != nil {
		return Media{}, fmt.Errorf("media returned an invalid owner id: %w", err)
	}
	out := Media{
		ID:           id,
		OwnerID:      ownerID,
		Title:        m.GetTitle(),
		MediaType:    mediaTypeToString(m.GetMediaType()),
		MimeType:     m.GetMimeType(),
		SizeBytes:    m.GetSizeBytes(),
		DurationMs:   m.GetDurationMs(),
		Status:       mediaStatusToString(m.GetStatus()),
		ThumbnailURL: m.GetThumbnailUrl(),
		CreatedAt:    m.GetCreatedAt().AsTime(),
		UpdatedAt:    m.GetUpdatedAt().AsTime(),
		Description:  m.GetDescription(),
	}
	if m.GetTrashedAt() != nil {
		trashedAt := m.GetTrashedAt().AsTime()
		out.TrashedAt = &trashedAt
	}
	return out, nil
}

func mediaTypeToString(t mediav1.MediaType) string {
	switch t {
	case mediav1.MediaType_MEDIA_TYPE_AUDIO:
		return "audio"
	case mediav1.MediaType_MEDIA_TYPE_VIDEO:
		return "video"
	default:
		return "unspecified"
	}
}

func mediaStatusToString(s mediav1.MediaStatus) string {
	switch s {
	case mediav1.MediaStatus_MEDIA_STATUS_PENDING_UPLOAD:
		return "pending_upload"
	case mediav1.MediaStatus_MEDIA_STATUS_PROCESSING:
		return "processing"
	case mediav1.MediaStatus_MEDIA_STATUS_COMPLETED:
		return "completed"
	case mediav1.MediaStatus_MEDIA_STATUS_FAILED:
		return "failed"
	case mediav1.MediaStatus_MEDIA_STATUS_DELETION_PENDING:
		return "deletion_pending"
	default:
		return "unspecified"
	}
}

func mediaProcessingStatusToString(s mediav1.ProcessingStatus) string {
	switch s {
	case mediav1.ProcessingStatus_PROCESSING_STATUS_REQUESTED:
		return "requested"
	case mediav1.ProcessingStatus_PROCESSING_STATUS_ACCEPTED:
		return "accepted"
	case mediav1.ProcessingStatus_PROCESSING_STATUS_COMPLETED:
		return "completed"
	case mediav1.ProcessingStatus_PROCESSING_STATUS_FAILED:
		return "failed"
	default:
		return "unspecified"
	}
}

func toMediaProgress(p *mediav1.MediaProgress) (MediaProgress, error) {
	mediaID, err := uuid.Parse(p.GetMediaId())
	if err != nil {
		return MediaProgress{}, fmt.Errorf("media returned an invalid media id: %w", err)
	}
	return MediaProgress{
		MediaID:          mediaID,
		Status:           mediaStatusToString(p.GetStatus()),
		ProcessingStatus: mediaProcessingStatusToString(p.GetProcessingStatus()),
		CompletedSteps:   p.GetCompletedSteps(),
		TotalSteps:       p.GetTotalSteps(),
		UpdatedAt:        p.GetUpdatedAt().AsTime(),
		Version:          p.GetVersion(),
	}, nil
}
