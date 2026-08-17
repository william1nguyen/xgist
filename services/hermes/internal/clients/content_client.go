package clients

import (
	"context"
	"fmt"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"github.com/google/uuid"

	contentv1 "github.com/nolannguyen1212/media-notes/contracts/gen/go/media_notes/content/v1"
)

// ContentClient calls content's gRPC API: transcript, summaries, keywords,
// keypoints, notes, and summary-audio metadata reads.
type ContentClient struct {
	client contentv1.ContentServiceClient
	conn   *grpc.ClientConn
}

// NewContentClient dials addr (content's gRPC listener) and returns a
// ContentClient.
func NewContentClient(addr string) (*ContentClient, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("dial content at %s: %w", addr, err)
	}
	return &ContentClient{client: contentv1.NewContentServiceClient(conn), conn: conn}, nil
}

// Close closes the underlying gRPC connection.
func (c *ContentClient) Close() error {
	return c.conn.Close()
}

// GetContent returns every generated artifact stored for one media item.
func (c *ContentClient) GetContent(ctx context.Context, mediaID uuid.UUID) (Content, error) {
	resp, err := c.client.GetContent(ctx, &contentv1.GetContentRequest{MediaId: mediaID.String()})
	if err != nil {
		return Content{}, fmt.Errorf("content.GetContent: %w", err)
	}
	return toContent(resp.GetContent())
}

// RequestScriptDraft asks content to draft narration text from a loose
// description, for the standalone audio feature's "chat with AI" mode.
func (c *ContentClient) RequestScriptDraft(ctx context.Context, idempotencyKey string, userID uuid.UUID, description string) (AudioJob, error) {
	resp, err := c.client.RequestScriptDraft(ctx, &contentv1.RequestScriptDraftRequest{
		IdempotencyKey: idempotencyKey, UserId: userID.String(), Description: description,
	})
	if err != nil {
		return AudioJob{}, fmt.Errorf("content.RequestScriptDraft: %w", err)
	}
	return toAudioJob(resp.GetJob())
}

// RequestStandaloneAudio asks content to synthesize text to speech,
// independent of any media item.
func (c *ContentClient) RequestStandaloneAudio(ctx context.Context, idempotencyKey string, userID uuid.UUID, text, voice string) (AudioJob, error) {
	resp, err := c.client.RequestStandaloneAudio(ctx, &contentv1.RequestStandaloneAudioRequest{
		IdempotencyKey: idempotencyKey, UserId: userID.String(), Text: text, Voice: voice,
	})
	if err != nil {
		return AudioJob{}, fmt.Errorf("content.RequestStandaloneAudio: %w", err)
	}
	return toAudioJob(resp.GetJob())
}

// GetAudioJob returns one standalone audio job.
func (c *ContentClient) GetAudioJob(ctx context.Context, id uuid.UUID) (AudioJob, error) {
	resp, err := c.client.GetStandaloneAudioJob(ctx, &contentv1.GetStandaloneAudioJobRequest{Id: id.String()})
	if err != nil {
		return AudioJob{}, fmt.Errorf("content.GetStandaloneAudioJob: %w", err)
	}
	return toAudioJob(resp.GetJob())
}

// ListAudioJobs returns userID's standalone audio jobs of kind
// ("script" or "audio"), newest first.
func (c *ContentClient) ListAudioJobs(ctx context.Context, userID uuid.UUID, kind, cursor string, pageSize int32) (AudioJobPage, error) {
	resp, err := c.client.ListStandaloneAudioJobs(ctx, &contentv1.ListStandaloneAudioJobsRequest{
		UserId: userID.String(), Kind: audioJobKindToProto(kind), Cursor: cursor, PageSize: pageSize,
	})
	if err != nil {
		return AudioJobPage{}, fmt.Errorf("content.ListStandaloneAudioJobs: %w", err)
	}
	items := make([]AudioJob, 0, len(resp.GetJobs()))
	for _, j := range resp.GetJobs() {
		job, err := toAudioJob(j)
		if err != nil {
			return AudioJobPage{}, err
		}
		items = append(items, job)
	}
	return AudioJobPage{Items: items, NextCursor: resp.GetNextCursor()}, nil
}

func audioJobKindToProto(kind string) contentv1.StandaloneAudioJobKind {
	switch kind {
	case "script":
		return contentv1.StandaloneAudioJobKind_STANDALONE_AUDIO_JOB_KIND_SCRIPT
	case "audio":
		return contentv1.StandaloneAudioJobKind_STANDALONE_AUDIO_JOB_KIND_AUDIO
	default:
		return contentv1.StandaloneAudioJobKind_STANDALONE_AUDIO_JOB_KIND_UNSPECIFIED
	}
}

func audioJobKindToString(kind contentv1.StandaloneAudioJobKind) string {
	switch kind {
	case contentv1.StandaloneAudioJobKind_STANDALONE_AUDIO_JOB_KIND_SCRIPT:
		return "script"
	case contentv1.StandaloneAudioJobKind_STANDALONE_AUDIO_JOB_KIND_AUDIO:
		return "audio"
	default:
		return "unspecified"
	}
}

func audioJobStatusToString(s contentv1.StandaloneAudioJobStatus) string {
	switch s {
	case contentv1.StandaloneAudioJobStatus_STANDALONE_AUDIO_JOB_STATUS_GENERATING:
		return "generating"
	case contentv1.StandaloneAudioJobStatus_STANDALONE_AUDIO_JOB_STATUS_COMPLETED:
		return "completed"
	case contentv1.StandaloneAudioJobStatus_STANDALONE_AUDIO_JOB_STATUS_FAILED:
		return "failed"
	default:
		return "unspecified"
	}
}

func toAudioJob(j *contentv1.StandaloneAudioJob) (AudioJob, error) {
	id, err := uuid.Parse(j.GetId())
	if err != nil {
		return AudioJob{}, fmt.Errorf("content returned an invalid job id: %w", err)
	}
	userID, err := uuid.Parse(j.GetUserId())
	if err != nil {
		return AudioJob{}, fmt.Errorf("content returned an invalid user id: %w", err)
	}
	return AudioJob{
		ID:         id,
		UserID:     userID,
		Kind:       audioJobKindToString(j.GetKind()),
		Status:     audioJobStatusToString(j.GetStatus()),
		InputText:  j.GetInputText(),
		OutputText: j.GetOutputText(),
		Voice:      j.GetVoice(),
		DurationMs: j.GetDurationMs(),
		URL:        j.GetUrl(),
		ErrorCode:  j.GetErrorCode(),
		CreatedAt:  j.GetCreatedAt().AsTime(),
	}, nil
}

func toContent(ct *contentv1.Content) (Content, error) {
	mediaID, err := uuid.Parse(ct.GetMediaId())
	if err != nil {
		return Content{}, fmt.Errorf("content returned an invalid media id: %w", err)
	}

	out := Content{MediaID: mediaID, Version: ct.GetVersion()}

	if t := ct.GetTranscript(); t != nil {
		segments := make([]TranscriptSegment, 0, len(t.GetSegments()))
		for _, seg := range t.GetSegments() {
			segments = append(segments, TranscriptSegment{
				SegmentIndex: seg.GetSegmentIndex(),
				StartMs:      seg.GetStartMs(),
				EndMs:        seg.GetEndMs(),
				Speaker:      seg.GetSpeaker(),
				Text:         seg.GetText(),
			})
		}
		out.Transcript = &Transcript{Language: t.GetLanguage(), Text: t.GetText(), Segments: segments}
	}

	for _, s := range ct.GetSummaries() {
		sentences := make([]SummarySentence, 0, len(s.GetSentences()))
		for _, sent := range s.GetSentences() {
			sentences = append(sentences, SummarySentence{
				SentenceIndex:       sent.GetSentenceIndex(),
				Text:                sent.GetText(),
				CitedSegmentIndexes: sent.GetCitedSegmentIndexes(),
			})
		}
		out.Summaries = append(out.Summaries, Summary{
			SummaryType:   s.GetSummaryType(),
			Text:          s.GetText(),
			Model:         s.GetModel(),
			PromptVersion: s.GetPromptVersion(),
			Sentences:     sentences,
			CreatedAt:     s.GetCreatedAt().AsTime(),
		})
	}

	for _, k := range ct.GetKeywords() {
		out.Keywords = append(out.Keywords, Keyword{Keyword: k.GetKeyword(), Score: k.GetScore(), Position: k.GetPosition()})
	}

	for _, k := range ct.GetKeypoints() {
		out.Keypoints = append(out.Keypoints, Keypoint{
			PointIndex:   k.GetPointIndex(),
			Text:         k.GetText(),
			StartSegment: k.GetStartSegment(),
			EndSegment:   k.GetEndSegment(),
		})
	}

	for _, n := range ct.GetNotes() {
		out.Notes = append(out.Notes, Note{Format: n.GetFormat(), Body: n.GetBody(), CreatedAt: n.GetCreatedAt().AsTime()})
	}

	for _, a := range ct.GetSummaryAudios() {
		out.SummaryAudios = append(out.SummaryAudios, SummaryAudio{
			SummaryType: a.GetSummaryType(),
			MimeType:    a.GetMimeType(),
			DurationMs:  a.GetDurationMs(),
			Voice:       a.GetVoice(),
			Status:      contentSummaryAudioStatusToString(a.GetStatus()),
			URL:         a.GetUrl(),
		})
	}

	return out, nil
}

func contentSummaryAudioStatusToString(s contentv1.SummaryAudioStatus) string {
	switch s {
	case contentv1.SummaryAudioStatus_SUMMARY_AUDIO_STATUS_READY:
		return "ready"
	case contentv1.SummaryAudioStatus_SUMMARY_AUDIO_STATUS_FAILED:
		return "failed"
	default:
		return "unspecified"
	}
}
