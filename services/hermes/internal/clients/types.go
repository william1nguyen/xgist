// Package clients holds hermes's outbound gRPC clients: narrow wrappers
// over the generated identity/billing/media/content stubs that set
// deadlines, attach metadata, and map safe downstream errors. hermes owns
// no domain data of its own — these types are the Go-native shape
// internal/graphql resolves into the public schema.
package clients

import (
	"time"

	"github.com/google/uuid"
)

// User is public account data, as returned by identity.
type User struct {
	ID            uuid.UUID
	Email         string
	Name          string
	ImageURL      string
	EmailVerified bool
	State         string
	CreatedAt     time.Time
}

// Session is an authenticated session, as returned by identity.Authenticate.
type Session struct {
	User      User
	Token     string
	ExpiresAt time.Time
}

// Principal is the caller resolved from a session token by
// identity.ValidateSession. It is what internal/auth attaches to the
// request context.
type Principal struct {
	User      User
	SessionID uuid.UUID
}

// DeletionOperation tracks one account deletion request.
type DeletionOperation struct {
	DeletionID  uuid.UUID
	UserID      uuid.UUID
	State       string
	CreatedAt   time.Time
	CompletedAt *time.Time
}

// UploadSession is one in-progress or completed media upload.
type UploadSession struct {
	ID        uuid.UUID
	MediaID   uuid.UUID
	OwnerID   uuid.UUID
	ObjectKey string
	UploadURL string
	Status    string
	ExpiresAt time.Time
}

// Media is source-media metadata.
type Media struct {
	ID           uuid.UUID
	OwnerID      uuid.UUID
	Title        string
	MediaType    string
	MimeType     string
	SizeBytes    int64
	DurationMs   int64
	Status       string
	ThumbnailURL string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// MediaPage is one cursor-paginated page of media.
type MediaPage struct {
	Items      []Media
	NextCursor string
}

// MediaProgress is one media item's batched processing-status projection,
// per ADR 0005.
type MediaProgress struct {
	MediaID          uuid.UUID
	Status           string
	ProcessingStatus string
	CompletedSteps   int32
	TotalSteps       int32
	UpdatedAt        time.Time
	Version          int32
}

// TranscriptSegment is one ordered, timestamped span of a transcript.
type TranscriptSegment struct {
	SegmentIndex int32
	StartMs      int64
	EndMs        int64
	Speaker      string
	Text         string
}

// Transcript is one media item's full transcript and ordered segments.
type Transcript struct {
	Language string
	Text     string
	Segments []TranscriptSegment
}

// SummarySentence is one sentence of a summary and the segments it cites.
type SummarySentence struct {
	SentenceIndex       int32
	Text                string
	CitedSegmentIndexes []int32
}

// Summary is generated summary text of one type for one media item.
type Summary struct {
	SummaryType   string
	Text          string
	Model         string
	PromptVersion string
	Sentences     []SummarySentence
	CreatedAt     time.Time
}

// Keyword is one extracted keyword and its relevance score.
type Keyword struct {
	Keyword  string
	Score    float64
	Position int32
}

// Keypoint is one extracted keypoint and the segment range it summarizes.
type Keypoint struct {
	PointIndex   int32
	Text         string
	StartSegment int32
	EndSegment   int32
}

// Note is one generated note document in a given format.
type Note struct {
	Format    string
	Body      string
	CreatedAt time.Time
}

// SummaryAudio is the metadata of one durable summary-audio object.
type SummaryAudio struct {
	SummaryType string
	MimeType    string
	DurationMs  int64
	Voice       string
	Status      string
}

// Content is every generated artifact stored for one media item.
type Content struct {
	MediaID       uuid.UUID
	Transcript    *Transcript
	Summaries     []Summary
	Keywords      []Keyword
	Keypoints     []Keypoint
	Notes         []Note
	SummaryAudios []SummaryAudio
	Version       int32
}

// QuoteItem is one priced option within a quote.
type QuoteItem struct {
	ItemID  string
	Credits int64
}

// Quote is an immutable, time-limited price snapshot.
type Quote struct {
	ID             uuid.UUID
	CatalogVersion string
	Items          []QuoteItem
	TotalCredits   int64
	ExpiresAt      time.Time
}

// Subscription is the user's current subscription, if any.
type Subscription struct {
	ID          string
	Plan        string
	Status      string
	PeriodStart time.Time
	PeriodEnd   time.Time
}

// BillingSummary is current credit balance and subscription state for one
// user.
type BillingSummary struct {
	AvailableCredits int64
	ReservedCredits  int64
	Subscription     *Subscription
}
