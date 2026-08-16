// Package grpcserver adapts the content application service to the
// generated ContentServiceServer contract: request/response mapping and
// domain-error-to-gRPC-status translation.
package grpcserver

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	contentv1 "github.com/nolannguyen1212/media-notes/contracts/gen/go/media_notes/content/v1"
	"github.com/nolannguyen1212/media-notes/services/content/internal/content"
)

// ContentService is the content application-service boundary the server
// depends on. *content.Service implements it.
type ContentService interface {
	StoreTranscript(ctx context.Context, cmd content.StoreTranscriptCommand) (content.Version, error)
	GetTranscript(ctx context.Context, mediaID uuid.UUID) (content.Transcript, error)
	StoreSummary(ctx context.Context, cmd content.StoreSummaryCommand) (content.Version, error)
	StoreKeywords(ctx context.Context, cmd content.StoreKeywordsCommand) (content.Version, error)
	StoreKeypoints(ctx context.Context, cmd content.StoreKeypointsCommand) (content.Version, error)
	StoreNotes(ctx context.Context, cmd content.StoreNotesCommand) (content.Version, error)
	StoreSummaryAudioMetadata(ctx context.Context, cmd content.StoreSummaryAudioCommand) (content.Version, error)
	GetContent(ctx context.Context, mediaID uuid.UUID) (content.Content, error)
}

// Server implements contentv1.ContentServiceServer.
type Server struct {
	contentv1.UnimplementedContentServiceServer
	content ContentService
}

// NewServer returns a Server.
func NewServer(content ContentService) *Server {
	return &Server{content: content}
}

func (s *Server) StoreTranscript(ctx context.Context, req *contentv1.StoreTranscriptRequest) (*contentv1.StoreTranscriptResponse, error) {
	mediaID, workflowID, err := parseMediaAndWorkflow(req.GetMediaId(), req.GetWorkflowId())
	if err != nil {
		return nil, err
	}
	if req.GetIdempotencyKey() == "" {
		return nil, status.Error(codes.InvalidArgument, "idempotency_key is required")
	}

	version, err := s.content.StoreTranscript(ctx, content.StoreTranscriptCommand{
		IdempotencyKey: req.GetIdempotencyKey(),
		MediaID:        mediaID,
		WorkflowID:     workflowID,
		Attempt:        int(req.GetAttempt()),
		Language:       req.GetLanguage(),
		Text:           req.GetText(),
		Segments:       toDomainSegments(req.GetSegments()),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &contentv1.StoreTranscriptResponse{Version: toProtoVersion(version)}, nil
}

func (s *Server) GetTranscript(ctx context.Context, req *contentv1.GetTranscriptRequest) (*contentv1.GetTranscriptResponse, error) {
	mediaID, err := uuid.Parse(req.GetMediaId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "media_id must be a UUID")
	}

	t, err := s.content.GetTranscript(ctx, mediaID)
	if err != nil {
		return nil, mapError(err)
	}
	return &contentv1.GetTranscriptResponse{Transcript: toProtoTranscript(t)}, nil
}

func (s *Server) StoreSummary(ctx context.Context, req *contentv1.StoreSummaryRequest) (*contentv1.StoreSummaryResponse, error) {
	mediaID, workflowID, err := parseMediaAndWorkflow(req.GetMediaId(), req.GetWorkflowId())
	if err != nil {
		return nil, err
	}
	if req.GetIdempotencyKey() == "" {
		return nil, status.Error(codes.InvalidArgument, "idempotency_key is required")
	}
	if req.GetSummaryType() == "" {
		return nil, status.Error(codes.InvalidArgument, "summary_type is required")
	}

	version, err := s.content.StoreSummary(ctx, content.StoreSummaryCommand{
		IdempotencyKey: req.GetIdempotencyKey(),
		MediaID:        mediaID,
		WorkflowID:     workflowID,
		Attempt:        int(req.GetAttempt()),
		SummaryType:    req.GetSummaryType(),
		Text:           req.GetText(),
		Model:          req.GetModel(),
		PromptVersion:  req.GetPromptVersion(),
		Sentences:      toDomainSentences(req.GetSentences()),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &contentv1.StoreSummaryResponse{Version: toProtoVersion(version)}, nil
}

func (s *Server) StoreKeywords(ctx context.Context, req *contentv1.StoreKeywordsRequest) (*contentv1.StoreKeywordsResponse, error) {
	mediaID, workflowID, err := parseMediaAndWorkflow(req.GetMediaId(), req.GetWorkflowId())
	if err != nil {
		return nil, err
	}
	if req.GetIdempotencyKey() == "" {
		return nil, status.Error(codes.InvalidArgument, "idempotency_key is required")
	}

	keywords := make([]content.Keyword, 0, len(req.GetKeywords()))
	for _, kw := range req.GetKeywords() {
		keywords = append(keywords, content.Keyword{Keyword: kw.GetKeyword(), Score: kw.GetScore(), Position: int(kw.GetPosition())})
	}

	version, err := s.content.StoreKeywords(ctx, content.StoreKeywordsCommand{
		IdempotencyKey: req.GetIdempotencyKey(),
		MediaID:        mediaID,
		WorkflowID:     workflowID,
		Attempt:        int(req.GetAttempt()),
		Keywords:       keywords,
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &contentv1.StoreKeywordsResponse{Version: toProtoVersion(version)}, nil
}

func (s *Server) StoreKeypoints(ctx context.Context, req *contentv1.StoreKeypointsRequest) (*contentv1.StoreKeypointsResponse, error) {
	mediaID, workflowID, err := parseMediaAndWorkflow(req.GetMediaId(), req.GetWorkflowId())
	if err != nil {
		return nil, err
	}
	if req.GetIdempotencyKey() == "" {
		return nil, status.Error(codes.InvalidArgument, "idempotency_key is required")
	}

	keypoints := make([]content.Keypoint, 0, len(req.GetKeypoints()))
	for _, kp := range req.GetKeypoints() {
		keypoints = append(keypoints, content.Keypoint{
			PointIndex:   int(kp.GetPointIndex()),
			Text:         kp.GetText(),
			StartSegment: int(kp.GetStartSegment()),
			EndSegment:   int(kp.GetEndSegment()),
		})
	}

	version, err := s.content.StoreKeypoints(ctx, content.StoreKeypointsCommand{
		IdempotencyKey: req.GetIdempotencyKey(),
		MediaID:        mediaID,
		WorkflowID:     workflowID,
		Attempt:        int(req.GetAttempt()),
		Keypoints:      keypoints,
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &contentv1.StoreKeypointsResponse{Version: toProtoVersion(version)}, nil
}

func (s *Server) StoreNotes(ctx context.Context, req *contentv1.StoreNotesRequest) (*contentv1.StoreNotesResponse, error) {
	mediaID, workflowID, err := parseMediaAndWorkflow(req.GetMediaId(), req.GetWorkflowId())
	if err != nil {
		return nil, err
	}
	if req.GetIdempotencyKey() == "" {
		return nil, status.Error(codes.InvalidArgument, "idempotency_key is required")
	}
	if req.GetFormat() == "" {
		return nil, status.Error(codes.InvalidArgument, "format is required")
	}

	version, err := s.content.StoreNotes(ctx, content.StoreNotesCommand{
		IdempotencyKey: req.GetIdempotencyKey(),
		MediaID:        mediaID,
		WorkflowID:     workflowID,
		Attempt:        int(req.GetAttempt()),
		Format:         req.GetFormat(),
		Body:           req.GetBody(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &contentv1.StoreNotesResponse{Version: toProtoVersion(version)}, nil
}

func (s *Server) StoreSummaryAudioMetadata(ctx context.Context, req *contentv1.StoreSummaryAudioMetadataRequest) (*contentv1.StoreSummaryAudioMetadataResponse, error) {
	mediaID, workflowID, err := parseMediaAndWorkflow(req.GetMediaId(), req.GetWorkflowId())
	if err != nil {
		return nil, err
	}
	if req.GetIdempotencyKey() == "" {
		return nil, status.Error(codes.InvalidArgument, "idempotency_key is required")
	}
	if req.GetObjectKey() == "" {
		return nil, status.Error(codes.InvalidArgument, "object_key is required")
	}

	version, err := s.content.StoreSummaryAudioMetadata(ctx, content.StoreSummaryAudioCommand{
		IdempotencyKey: req.GetIdempotencyKey(),
		MediaID:        mediaID,
		WorkflowID:     workflowID,
		Attempt:        int(req.GetAttempt()),
		SummaryType:    req.GetSummaryType(),
		ObjectKey:      req.GetObjectKey(),
		MimeType:       req.GetMimeType(),
		DurationMs:     req.GetDurationMs(),
		Voice:          req.GetVoice(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &contentv1.StoreSummaryAudioMetadataResponse{Version: toProtoVersion(version)}, nil
}

func (s *Server) GetContent(ctx context.Context, req *contentv1.GetContentRequest) (*contentv1.GetContentResponse, error) {
	mediaID, err := uuid.Parse(req.GetMediaId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "media_id must be a UUID")
	}

	c, err := s.content.GetContent(ctx, mediaID)
	if err != nil {
		return nil, mapError(err)
	}
	return &contentv1.GetContentResponse{Content: toProtoContent(c)}, nil
}

func parseMediaAndWorkflow(mediaID, workflowID string) (uuid.UUID, uuid.UUID, error) {
	mid, err := uuid.Parse(mediaID)
	if err != nil {
		return uuid.Nil, uuid.Nil, status.Error(codes.InvalidArgument, "media_id must be a UUID")
	}
	wid, err := uuid.Parse(workflowID)
	if err != nil {
		return uuid.Nil, uuid.Nil, status.Error(codes.InvalidArgument, "workflow_id must be a UUID")
	}
	return mid, wid, nil
}

func mapError(err error) error {
	switch {
	case errors.Is(err, content.ErrNotFound):
		return status.Error(codes.NotFound, err.Error())
	case errors.Is(err, content.ErrUnknownSegment),
		errors.Is(err, content.ErrInvalidSegments):
		return status.Error(codes.InvalidArgument, err.Error())
	case errors.Is(err, content.ErrDeletionPending),
		errors.Is(err, content.ErrStaleAttempt):
		return status.Error(codes.FailedPrecondition, err.Error())
	default:
		// Do not leak internal error detail across the gRPC boundary; the
		// logging interceptor records the real error server-side.
		return status.Error(codes.Internal, "internal error")
	}
}

func toDomainSegments(segments []*contentv1.TranscriptSegment) []content.TranscriptSegment {
	out := make([]content.TranscriptSegment, 0, len(segments))
	for _, seg := range segments {
		out = append(out, content.TranscriptSegment{
			SegmentIndex: int(seg.GetSegmentIndex()),
			StartMs:      seg.GetStartMs(),
			EndMs:        seg.GetEndMs(),
			Speaker:      seg.GetSpeaker(),
			Text:         seg.GetText(),
		})
	}
	return out
}

func toDomainSentences(sentences []*contentv1.SummarySentence) []content.SummarySentence {
	out := make([]content.SummarySentence, 0, len(sentences))
	for _, sent := range sentences {
		indexes := make([]int, 0, len(sent.GetCitedSegmentIndexes()))
		for _, idx := range sent.GetCitedSegmentIndexes() {
			indexes = append(indexes, int(idx))
		}
		out = append(out, content.SummarySentence{
			SentenceIndex:       int(sent.GetSentenceIndex()),
			Text:                sent.GetText(),
			CitedSegmentIndexes: indexes,
		})
	}
	return out
}

func toProtoVersion(v content.Version) *contentv1.ContentVersion {
	return &contentv1.ContentVersion{
		MediaId:   v.MediaID.String(),
		Version:   int32(v.Version),
		UpdatedAt: timestamppb.New(v.UpdatedAt),
	}
}

func toProtoTranscript(t content.Transcript) *contentv1.Transcript {
	segments := make([]*contentv1.TranscriptSegment, 0, len(t.Segments))
	for _, seg := range t.Segments {
		segments = append(segments, toProtoSegment(seg))
	}
	return &contentv1.Transcript{
		MediaId:  t.MediaID.String(),
		Language: t.Language,
		Text:     t.Text,
		Segments: segments,
		Version:  int32(t.Version),
	}
}

func toProtoSegment(seg content.TranscriptSegment) *contentv1.TranscriptSegment {
	return &contentv1.TranscriptSegment{
		SegmentIndex: int32(seg.SegmentIndex),
		StartMs:      seg.StartMs,
		EndMs:        seg.EndMs,
		Speaker:      seg.Speaker,
		Text:         seg.Text,
	}
}

func toProtoContent(c content.Content) *contentv1.Content {
	out := &contentv1.Content{
		MediaId: c.MediaID.String(),
		Version: int32(c.Version),
	}
	if c.Transcript != nil {
		out.Transcript = toProtoTranscript(*c.Transcript)
	}
	for _, sum := range c.Summaries {
		out.Summaries = append(out.Summaries, toProtoSummary(sum))
	}
	for _, kw := range c.Keywords {
		out.Keywords = append(out.Keywords, &contentv1.Keyword{Keyword: kw.Keyword, Score: kw.Score, Position: int32(kw.Position)})
	}
	for _, kp := range c.Keypoints {
		out.Keypoints = append(out.Keypoints, &contentv1.Keypoint{
			PointIndex:   int32(kp.PointIndex),
			Text:         kp.Text,
			StartSegment: int32(kp.StartSegment),
			EndSegment:   int32(kp.EndSegment),
		})
	}
	for _, n := range c.Notes {
		out.Notes = append(out.Notes, &contentv1.Note{Format: n.Format, Body: n.Body, CreatedAt: timestamppb.New(n.CreatedAt)})
	}
	for _, a := range c.SummaryAudios {
		out.SummaryAudios = append(out.SummaryAudios, toProtoSummaryAudio(a))
	}
	return out
}

func toProtoSummary(sum content.Summary) *contentv1.Summary {
	sentences := make([]*contentv1.SummarySentence, 0, len(sum.Sentences))
	for _, sent := range sum.Sentences {
		indexes := make([]int32, 0, len(sent.CitedSegmentIndexes))
		for _, idx := range sent.CitedSegmentIndexes {
			indexes = append(indexes, int32(idx))
		}
		sentences = append(sentences, &contentv1.SummarySentence{
			SentenceIndex:       int32(sent.SentenceIndex),
			Text:                sent.Text,
			CitedSegmentIndexes: indexes,
		})
	}
	return &contentv1.Summary{
		SummaryType:   sum.SummaryType,
		Text:          sum.Text,
		Model:         sum.Model,
		PromptVersion: sum.PromptVersion,
		Sentences:     sentences,
		CreatedAt:     timestamppb.New(sum.CreatedAt),
	}
}

func toProtoSummaryAudio(a content.SummaryAudio) *contentv1.SummaryAudio {
	return &contentv1.SummaryAudio{
		SummaryType: a.SummaryType,
		ObjectKey:   a.ObjectKey,
		MimeType:    a.MimeType,
		DurationMs:  a.DurationMs,
		Voice:       a.Voice,
		Status:      toProtoAudioStatus(a.Status),
	}
}

func toProtoAudioStatus(s content.AudioStatus) contentv1.SummaryAudioStatus {
	switch s {
	case content.AudioStatusReady:
		return contentv1.SummaryAudioStatus_SUMMARY_AUDIO_STATUS_READY
	case content.AudioStatusFailed:
		return contentv1.SummaryAudioStatus_SUMMARY_AUDIO_STATUS_FAILED
	default:
		return contentv1.SummaryAudioStatus_SUMMARY_AUDIO_STATUS_UNSPECIFIED
	}
}
