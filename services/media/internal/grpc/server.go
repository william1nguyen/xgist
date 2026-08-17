// Package grpcserver adapts the media, upload, derivative, and deletion
// application services to the generated MediaServiceServer contract:
// request/response mapping and domain-error-to-gRPC-status translation.
// ApplyWorkflowStatus is not exposed here: conductor drives it exclusively
// through mn.media.status.changed.v1, per docs/services/media.md.
package grpcserver

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	mediav1 "github.com/nolannguyen1212/media-notes/contracts/gen/go/media_notes/media/v1"
	"github.com/nolannguyen1212/media-notes/services/media/internal/deletion"
	"github.com/nolannguyen1212/media-notes/services/media/internal/derivative"
	"github.com/nolannguyen1212/media-notes/services/media/internal/media"
	"github.com/nolannguyen1212/media-notes/services/media/internal/upload"
)

// MediaService is the media application-service boundary the server
// depends on. *media.Service implements it.
type MediaService interface {
	GetMedia(ctx context.Context, id uuid.UUID) (media.Media, error)
	ListMedia(ctx context.Context, ownerID uuid.UUID, cursor string, pageSize int, search string) (media.Page, error)
	SignPlaybackURL(ctx context.Context, id uuid.UUID) (string, time.Time, error)
	GetProgress(ctx context.Context, ownerID uuid.UUID, ids []uuid.UUID) ([]media.Progress, error)
	UpdateMedia(ctx context.Context, id uuid.UUID, title, description *string) (media.Media, error)
	RequestProcessing(ctx context.Context, cmd media.RequestProcessingCommand) (media.Media, error)
	TrashMedia(ctx context.Context, id uuid.UUID) (media.Media, error)
	RestoreMedia(ctx context.Context, id uuid.UUID) (media.Media, error)
	ListTrashed(ctx context.Context, ownerID uuid.UUID, cursor string, pageSize int) (media.Page, error)
}

// UploadService is the upload application-service boundary the server
// depends on. *upload.Service implements it.
type UploadService interface {
	CreateUploadSession(ctx context.Context, in upload.NewUploadSession) (upload.UploadSession, error)
	ConfirmUpload(ctx context.Context, cmd upload.ConfirmUploadCommand) (media.Media, error)
}

// DerivativeService is the derivative application-service boundary the
// server depends on. *derivative.Service implements it.
type DerivativeService interface {
	RegisterDerivative(ctx context.Context, in derivative.NewDerivative) (derivative.Derivative, error)
	SignThumbnailURL(ctx context.Context, mediaID uuid.UUID) (url string, ok bool, err error)
}

// DeletionService is the deletion application-service boundary the server
// depends on. *deletion.Service implements it.
type DeletionService interface {
	RequestDeletion(ctx context.Context, mediaID uuid.UUID) (deletion.Operation, error)
	GetDeletion(ctx context.Context, deletionID uuid.UUID) (deletion.Operation, error)
}

// Server implements mediav1.MediaServiceServer.
type Server struct {
	mediav1.UnimplementedMediaServiceServer
	media       MediaService
	uploads     UploadService
	derivatives DerivativeService
	deletions   DeletionService
}

// NewServer returns a Server.
func NewServer(media MediaService, uploads UploadService, derivatives DerivativeService, deletions DeletionService) *Server {
	return &Server{media: media, uploads: uploads, derivatives: derivatives, deletions: deletions}
}

func (s *Server) CreateUploadSession(ctx context.Context, req *mediav1.CreateUploadSessionRequest) (*mediav1.CreateUploadSessionResponse, error) {
	ownerID, err := uuid.Parse(req.GetOwnerId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "owner_id must be a UUID")
	}
	if req.GetIdempotencyKey() == "" {
		return nil, status.Error(codes.InvalidArgument, "idempotency_key is required")
	}
	if req.GetTitle() == "" {
		return nil, status.Error(codes.InvalidArgument, "title is required")
	}

	session, err := s.uploads.CreateUploadSession(ctx, upload.NewUploadSession{
		OwnerID:           ownerID,
		Title:             req.GetTitle(),
		MimeType:          req.GetMimeType(),
		DeclaredSizeBytes: req.GetDeclaredSizeBytes(),
		IdempotencyKey:    req.GetIdempotencyKey(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &mediav1.CreateUploadSessionResponse{Session: toProtoUploadSession(session)}, nil
}

func (s *Server) ConfirmUpload(ctx context.Context, req *mediav1.ConfirmUploadRequest) (*mediav1.ConfirmUploadResponse, error) {
	sessionID, err := uuid.Parse(req.GetUploadSessionId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "upload_session_id must be a UUID")
	}
	if req.GetIdempotencyKey() == "" {
		return nil, status.Error(codes.InvalidArgument, "idempotency_key is required")
	}

	m, err := s.uploads.ConfirmUpload(ctx, upload.ConfirmUploadCommand{
		SessionID:       sessionID,
		Options:         req.GetOptions(),
		AudioVoice:      req.GetAudioVoice(),
		PromptOverrides: req.GetPromptOverrides(),
		IdempotencyKey:  req.GetIdempotencyKey(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &mediav1.ConfirmUploadResponse{Media: s.toProtoMediaWithThumbnail(ctx, m)}, nil
}

func (s *Server) GetMedia(ctx context.Context, req *mediav1.GetMediaRequest) (*mediav1.GetMediaResponse, error) {
	id, err := uuid.Parse(req.GetMediaId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "media_id must be a UUID")
	}

	m, err := s.media.GetMedia(ctx, id)
	if err != nil {
		return nil, mapError(err)
	}
	return &mediav1.GetMediaResponse{Media: s.toProtoMediaWithThumbnail(ctx, m)}, nil
}

func (s *Server) ListMedia(ctx context.Context, req *mediav1.ListMediaRequest) (*mediav1.ListMediaResponse, error) {
	ownerID, err := uuid.Parse(req.GetOwnerId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "owner_id must be a UUID")
	}

	page, err := s.media.ListMedia(ctx, ownerID, req.GetCursor(), int(req.GetPageSize()), req.GetSearch())
	if err != nil {
		return nil, mapError(err)
	}

	items := make([]*mediav1.Media, 0, len(page.Items))
	for _, m := range page.Items {
		items = append(items, s.toProtoMediaWithThumbnail(ctx, m))
	}
	return &mediav1.ListMediaResponse{Items: items, NextCursor: page.NextCursor}, nil
}

func (s *Server) SignPlaybackUrl(ctx context.Context, req *mediav1.SignPlaybackUrlRequest) (*mediav1.SignPlaybackUrlResponse, error) {
	id, err := uuid.Parse(req.GetMediaId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "media_id must be a UUID")
	}

	url, expiresAt, err := s.media.SignPlaybackURL(ctx, id)
	if err != nil {
		return nil, mapError(err)
	}
	return &mediav1.SignPlaybackUrlResponse{Url: url, ExpiresAt: timestamppb.New(expiresAt)}, nil
}

// maxProgressBatch is the per-request media id cap for GetMediaProgress,
// per ADR 0005.
const maxProgressBatch = 50

func (s *Server) GetMediaProgress(ctx context.Context, req *mediav1.GetMediaProgressRequest) (*mediav1.GetMediaProgressResponse, error) {
	ownerID, err := uuid.Parse(req.GetOwnerId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "owner_id must be a UUID")
	}
	if len(req.GetMediaIds()) == 0 || len(req.GetMediaIds()) > maxProgressBatch {
		return nil, status.Error(codes.InvalidArgument, "media_ids must contain 1-50 items")
	}

	ids := make([]uuid.UUID, 0, len(req.GetMediaIds()))
	for _, raw := range req.GetMediaIds() {
		id, err := uuid.Parse(raw)
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, "media_ids must be UUIDs")
		}
		ids = append(ids, id)
	}

	items, err := s.media.GetProgress(ctx, ownerID, ids)
	if err != nil {
		return nil, mapError(err)
	}

	out := make([]*mediav1.MediaProgress, 0, len(items))
	for _, p := range items {
		out = append(out, toProtoMediaProgress(p))
	}
	return &mediav1.GetMediaProgressResponse{Items: out}, nil
}

func (s *Server) RegisterDerivative(ctx context.Context, req *mediav1.RegisterDerivativeRequest) (*mediav1.RegisterDerivativeResponse, error) {
	mediaID, err := uuid.Parse(req.GetMediaId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "media_id must be a UUID")
	}
	if req.GetObjectKey() == "" {
		return nil, status.Error(codes.InvalidArgument, "object_key is required")
	}

	d, err := s.derivatives.RegisterDerivative(ctx, derivative.NewDerivative{
		MediaID:        mediaID,
		DerivativeType: toDerivativeType(req.GetDerivativeType()),
		Version:        int(req.GetVersion()),
		ObjectKey:      req.GetObjectKey(),
		MimeType:       req.GetMimeType(),
		Width:          int(req.GetWidth()),
		Height:         int(req.GetHeight()),
		SizeBytes:      req.GetSizeBytes(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &mediav1.RegisterDerivativeResponse{Derivative: toProtoDerivative(d)}, nil
}

func (s *Server) RequestDeletion(ctx context.Context, req *mediav1.RequestDeletionRequest) (*mediav1.RequestDeletionResponse, error) {
	mediaID, err := uuid.Parse(req.GetMediaId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "media_id must be a UUID")
	}

	op, err := s.deletions.RequestDeletion(ctx, mediaID)
	if err != nil {
		return nil, mapError(err)
	}
	return &mediav1.RequestDeletionResponse{Operation: toProtoDeletionOperation(op)}, nil
}

func (s *Server) UpdateMedia(ctx context.Context, req *mediav1.UpdateMediaRequest) (*mediav1.UpdateMediaResponse, error) {
	id, err := uuid.Parse(req.GetMediaId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "media_id must be a UUID")
	}

	m, err := s.media.UpdateMedia(ctx, id, req.Title, req.Description)
	if err != nil {
		return nil, mapError(err)
	}
	return &mediav1.UpdateMediaResponse{Media: s.toProtoMediaWithThumbnail(ctx, m)}, nil
}

func (s *Server) RequestProcessing(ctx context.Context, req *mediav1.RequestProcessingRequest) (*mediav1.RequestProcessingResponse, error) {
	mediaID, err := uuid.Parse(req.GetMediaId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "media_id must be a UUID")
	}
	if req.GetIdempotencyKey() == "" {
		return nil, status.Error(codes.InvalidArgument, "idempotency_key is required")
	}

	m, err := s.media.RequestProcessing(ctx, media.RequestProcessingCommand{
		MediaID:         mediaID,
		Options:         req.GetOptions(),
		AudioVoice:      req.GetAudioVoice(),
		PromptOverrides: req.GetPromptOverrides(),
		IdempotencyKey:  req.GetIdempotencyKey(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &mediav1.RequestProcessingResponse{Media: s.toProtoMediaWithThumbnail(ctx, m)}, nil
}

func (s *Server) GetDeletionStatus(ctx context.Context, req *mediav1.GetDeletionStatusRequest) (*mediav1.GetDeletionStatusResponse, error) {
	id, err := uuid.Parse(req.GetDeletionId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "deletion_id must be a UUID")
	}

	op, err := s.deletions.GetDeletion(ctx, id)
	if err != nil {
		return nil, mapError(err)
	}
	return &mediav1.GetDeletionStatusResponse{Operation: toProtoDeletionOperation(op)}, nil
}

func (s *Server) TrashMedia(ctx context.Context, req *mediav1.TrashMediaRequest) (*mediav1.TrashMediaResponse, error) {
	id, err := uuid.Parse(req.GetMediaId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "media_id must be a UUID")
	}

	m, err := s.media.TrashMedia(ctx, id)
	if err != nil {
		return nil, mapError(err)
	}
	return &mediav1.TrashMediaResponse{Media: s.toProtoMediaWithThumbnail(ctx, m)}, nil
}

func (s *Server) RestoreMedia(ctx context.Context, req *mediav1.RestoreMediaRequest) (*mediav1.RestoreMediaResponse, error) {
	id, err := uuid.Parse(req.GetMediaId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "media_id must be a UUID")
	}

	m, err := s.media.RestoreMedia(ctx, id)
	if err != nil {
		return nil, mapError(err)
	}
	return &mediav1.RestoreMediaResponse{Media: s.toProtoMediaWithThumbnail(ctx, m)}, nil
}

func (s *Server) ListTrashedMedia(ctx context.Context, req *mediav1.ListTrashedMediaRequest) (*mediav1.ListTrashedMediaResponse, error) {
	ownerID, err := uuid.Parse(req.GetOwnerId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "owner_id must be a UUID")
	}

	page, err := s.media.ListTrashed(ctx, ownerID, req.GetCursor(), int(req.GetPageSize()))
	if err != nil {
		return nil, mapError(err)
	}

	items := make([]*mediav1.Media, 0, len(page.Items))
	for _, m := range page.Items {
		items = append(items, s.toProtoMediaWithThumbnail(ctx, m))
	}
	return &mediav1.ListTrashedMediaResponse{Items: items, NextCursor: page.NextCursor}, nil
}

// toProtoMediaWithThumbnail attaches a signed thumbnail URL when a ready
// thumbnail derivative exists. A signing failure is not fatal to the
// surrounding GetMedia/ListMedia/ConfirmUpload call: the item is still
// returned, just without a thumbnail, matching the Web client's
// placeholder-while-pending behavior (docs/architecture.md).
func (s *Server) toProtoMediaWithThumbnail(ctx context.Context, m media.Media) *mediav1.Media {
	out := toProtoMedia(m)
	if url, ok, err := s.derivatives.SignThumbnailURL(ctx, m.ID); err == nil && ok {
		out.ThumbnailUrl = url
	}
	return out
}

func mapError(err error) error {
	switch {
	case errors.Is(err, media.ErrNotFound),
		errors.Is(err, upload.ErrNotFound),
		errors.Is(err, derivative.ErrNotFound),
		errors.Is(err, derivative.ErrMediaNotFound),
		errors.Is(err, deletion.ErrNotFound),
		errors.Is(err, deletion.ErrOperationNotFound):
		return status.Error(codes.NotFound, err.Error())
	case errors.Is(err, upload.ErrUnsupportedMimeType),
		errors.Is(err, upload.ErrDeclaredSizeExceeded),
		errors.Is(err, deletion.ErrUnknownParticipant):
		return status.Error(codes.InvalidArgument, err.Error())
	case errors.Is(err, upload.ErrTooManyActiveSessions),
		errors.Is(err, upload.ErrSessionNotActive),
		errors.Is(err, upload.ErrSessionExpired),
		errors.Is(err, upload.ErrObjectMissing),
		errors.Is(err, upload.ErrObjectEmpty),
		errors.Is(err, upload.ErrObjectOversize),
		errors.Is(err, media.ErrNotProcessable):
		return status.Error(codes.FailedPrecondition, err.Error())
	default:
		// Do not leak internal error detail across the gRPC boundary; the
		// logging interceptor records the real error server-side.
		return status.Error(codes.Internal, "internal error")
	}
}

func toProtoMedia(m media.Media) *mediav1.Media {
	out := &mediav1.Media{
		Id:          m.ID.String(),
		OwnerId:     m.OwnerID.String(),
		Title:       m.Title,
		MediaType:   toProtoMediaType(m.MediaType),
		MimeType:    m.MimeType,
		SizeBytes:   m.SizeBytes,
		DurationMs:  m.DurationMs,
		Status:      toProtoMediaStatus(m.Status),
		CreatedAt:   timestamppb.New(m.CreatedAt),
		UpdatedAt:   timestamppb.New(m.UpdatedAt),
		Description: m.Description,
	}
	if m.TrashedAt != nil {
		out.TrashedAt = timestamppb.New(*m.TrashedAt)
	}
	return out
}

func toProtoMediaType(t media.Type) mediav1.MediaType {
	switch t {
	case media.TypeAudio:
		return mediav1.MediaType_MEDIA_TYPE_AUDIO
	case media.TypeVideo:
		return mediav1.MediaType_MEDIA_TYPE_VIDEO
	default:
		return mediav1.MediaType_MEDIA_TYPE_UNSPECIFIED
	}
}

func toProtoMediaStatus(s media.Status) mediav1.MediaStatus {
	switch s {
	case media.StatusPendingUpload:
		return mediav1.MediaStatus_MEDIA_STATUS_PENDING_UPLOAD
	case media.StatusProcessing:
		return mediav1.MediaStatus_MEDIA_STATUS_PROCESSING
	case media.StatusCompleted:
		return mediav1.MediaStatus_MEDIA_STATUS_COMPLETED
	case media.StatusFailed:
		return mediav1.MediaStatus_MEDIA_STATUS_FAILED
	case media.StatusDeletionPending:
		return mediav1.MediaStatus_MEDIA_STATUS_DELETION_PENDING
	default:
		return mediav1.MediaStatus_MEDIA_STATUS_UNSPECIFIED
	}
}

func toProtoMediaProgress(p media.Progress) *mediav1.MediaProgress {
	return &mediav1.MediaProgress{
		MediaId:          p.MediaID.String(),
		Status:           toProtoMediaStatus(p.Status),
		ProcessingStatus: toProtoProcessingStatus(p.ProcessingStatus),
		CompletedSteps:   p.CompletedSteps,
		TotalSteps:       p.TotalSteps,
		UpdatedAt:        timestamppb.New(p.UpdatedAt),
		Version:          p.Version,
	}
}

func toProtoProcessingStatus(s media.ProcessingStatus) mediav1.ProcessingStatus {
	switch s {
	case media.ProcessingStatusRequested:
		return mediav1.ProcessingStatus_PROCESSING_STATUS_REQUESTED
	case media.ProcessingStatusAccepted:
		return mediav1.ProcessingStatus_PROCESSING_STATUS_ACCEPTED
	case media.ProcessingStatusCompleted:
		return mediav1.ProcessingStatus_PROCESSING_STATUS_COMPLETED
	case media.ProcessingStatusFailed:
		return mediav1.ProcessingStatus_PROCESSING_STATUS_FAILED
	default:
		return mediav1.ProcessingStatus_PROCESSING_STATUS_UNSPECIFIED
	}
}

func toProtoUploadSession(s upload.UploadSession) *mediav1.UploadSession {
	return &mediav1.UploadSession{
		Id:        s.ID.String(),
		MediaId:   s.MediaID.String(),
		OwnerId:   s.OwnerID.String(),
		ObjectKey: s.ObjectKey,
		UploadUrl: s.UploadURL,
		Status:    toProtoUploadSessionStatus(s.Status),
		ExpiresAt: timestamppb.New(s.ExpiresAt),
	}
}

func toProtoUploadSessionStatus(s upload.Status) mediav1.UploadSessionStatus {
	switch s {
	case upload.StatusActive:
		return mediav1.UploadSessionStatus_UPLOAD_SESSION_STATUS_ACTIVE
	case upload.StatusCompleted:
		return mediav1.UploadSessionStatus_UPLOAD_SESSION_STATUS_COMPLETED
	case upload.StatusExpired:
		return mediav1.UploadSessionStatus_UPLOAD_SESSION_STATUS_EXPIRED
	case upload.StatusCanceled:
		return mediav1.UploadSessionStatus_UPLOAD_SESSION_STATUS_CANCELED
	default:
		return mediav1.UploadSessionStatus_UPLOAD_SESSION_STATUS_UNSPECIFIED
	}
}

func toProtoDerivative(d derivative.Derivative) *mediav1.Derivative {
	return &mediav1.Derivative{
		Id:             d.ID.String(),
		MediaId:        d.MediaID.String(),
		DerivativeType: toProtoDerivativeType(d.DerivativeType),
		Version:        int32(d.Version),
		MimeType:       d.MimeType,
		Width:          int32(d.Width),
		Height:         int32(d.Height),
		SizeBytes:      d.SizeBytes,
		Status:         toProtoDerivativeStatus(d.Status),
	}
}

func toProtoDerivativeType(t derivative.Type) mediav1.DerivativeType {
	switch t {
	case derivative.TypeThumbnail:
		return mediav1.DerivativeType_DERIVATIVE_TYPE_THUMBNAIL
	case derivative.TypeCover:
		return mediav1.DerivativeType_DERIVATIVE_TYPE_COVER
	case derivative.TypeWaveform:
		return mediav1.DerivativeType_DERIVATIVE_TYPE_WAVEFORM
	default:
		return mediav1.DerivativeType_DERIVATIVE_TYPE_UNSPECIFIED
	}
}

func toDerivativeType(t mediav1.DerivativeType) derivative.Type {
	switch t {
	case mediav1.DerivativeType_DERIVATIVE_TYPE_THUMBNAIL:
		return derivative.TypeThumbnail
	case mediav1.DerivativeType_DERIVATIVE_TYPE_COVER:
		return derivative.TypeCover
	case mediav1.DerivativeType_DERIVATIVE_TYPE_WAVEFORM:
		return derivative.TypeWaveform
	default:
		return ""
	}
}

func toProtoDerivativeStatus(s derivative.Status) mediav1.DerivativeStatus {
	switch s {
	case derivative.StatusPending:
		return mediav1.DerivativeStatus_DERIVATIVE_STATUS_PENDING
	case derivative.StatusReady:
		return mediav1.DerivativeStatus_DERIVATIVE_STATUS_READY
	case derivative.StatusFailed:
		return mediav1.DerivativeStatus_DERIVATIVE_STATUS_FAILED
	default:
		return mediav1.DerivativeStatus_DERIVATIVE_STATUS_UNSPECIFIED
	}
}

func toProtoDeletionOperation(op deletion.Operation) *mediav1.DeletionOperation {
	out := &mediav1.DeletionOperation{
		DeletionId: op.DeletionID.String(),
		MediaId:    op.MediaID.String(),
		State:      toProtoDeletionState(op.State),
		CreatedAt:  timestamppb.New(op.CreatedAt),
	}
	if op.CompletedAt != nil {
		out.CompletedAt = timestamppb.New(*op.CompletedAt)
	}
	return out
}

func toProtoDeletionState(s deletion.State) mediav1.DeletionState {
	switch s {
	case deletion.StatePending:
		return mediav1.DeletionState_DELETION_STATE_PENDING
	case deletion.StateCompleted:
		return mediav1.DeletionState_DELETION_STATE_COMPLETED
	case deletion.StateFailedAttentionRequired:
		return mediav1.DeletionState_DELETION_STATE_FAILED_ATTENTION_REQUIRED
	default:
		return mediav1.DeletionState_DELETION_STATE_UNSPECIFIED
	}
}
