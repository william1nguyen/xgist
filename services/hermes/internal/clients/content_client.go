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
