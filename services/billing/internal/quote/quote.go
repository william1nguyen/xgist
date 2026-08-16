// Package quote prices processing options against billing's versioned
// catalog and issues time-limited quote snapshots, per ADR 0008.
package quote

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Price item identifiers from ADR 0008's launch-v1 catalog.
const (
	ItemTranscribe           = "transcribe"
	ItemSummarize            = "summarize"
	ItemExtractKeywords      = "extract_keywords"
	ItemExtractKeypoints     = "extract_keypoints"
	ItemGenerateNotes        = "generate_notes"
	ItemGenerateAudioSummary = "generate_audio_summary"
)

var (
	ErrEmptyOptions      = errors.New("quote: at least one option is required")
	ErrUnknownItem       = errors.New("quote: unknown price item")
	ErrDuplicateItem     = errors.New("quote: duplicate price item")
	ErrMissingDependency = errors.New("quote: generate_audio_summary requires summarize")
	ErrNotFound          = errors.New("quote: not found")
	ErrExpired           = errors.New("quote: expired")
)

// Catalog is one immutable, versioned price list. billing owns the active
// version; a new version takes effect only for new quotes.
type Catalog struct {
	Version  string
	Prices   map[string]int64
	ActiveAt time.Time
}

// Item is one priced option within a Quote.
type Item struct {
	ItemID  string `json:"item_id"`
	Credits int64  `json:"credits"`
}

// Quote is an immutable, time-limited price snapshot for a set of
// processing options, per ADR 0008's quote-and-reservation flow.
type Quote struct {
	ID             uuid.UUID
	UserID         uuid.UUID
	CatalogVersion string
	Items          []Item
	TotalCredits   int64
	ExpiresAt      time.Time
	CreatedAt      time.Time
	AcceptedAt     *time.Time
}

// Repository is the persistence boundary Service depends on. It is
// implemented by internal/store.
type Repository interface {
	// ActiveCatalog returns the catalog version currently in effect for
	// new quotes.
	ActiveCatalog(ctx context.Context) (Catalog, error)
	Create(ctx context.Context, q Quote) (Quote, error)
	FindByID(ctx context.Context, id uuid.UUID) (Quote, error)
}

// Service prices options and issues quotes.
type Service struct {
	repo Repository
	ttl  time.Duration
}

// NewService returns a Service. ttl is the lifetime applied to every newly
// issued quote (15 minutes per ADR 0008).
func NewService(repo Repository, ttl time.Duration) *Service {
	return &Service{repo: repo, ttl: ttl}
}

// GetQuote prices options against the active catalog and persists a new
// quote snapshot.
func (s *Service) GetQuote(ctx context.Context, userID uuid.UUID, options []string) (Quote, error) {
	catalog, err := s.repo.ActiveCatalog(ctx)
	if err != nil {
		return Quote{}, err
	}

	items, total, err := price(catalog, options)
	if err != nil {
		return Quote{}, err
	}

	now := time.Now()
	q := Quote{
		ID:             uuid.New(),
		UserID:         userID,
		CatalogVersion: catalog.Version,
		Items:          items,
		TotalCredits:   total,
		ExpiresAt:      now.Add(s.ttl),
		CreatedAt:      now,
	}
	return s.repo.Create(ctx, q)
}

// Get returns a previously issued quote, rejecting one that has expired
// and was never accepted.
func (s *Service) Get(ctx context.Context, id uuid.UUID) (Quote, error) {
	q, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return Quote{}, err
	}
	if q.AcceptedAt == nil && time.Now().After(q.ExpiresAt) {
		return Quote{}, ErrExpired
	}
	return q, nil
}

// price validates options against catalog and returns their priced items
// and total. Unknown identifiers, duplicate identifiers, an empty option
// set, and generate_audio_summary without summarize are all rejected, per
// ADR 0008.
func price(catalog Catalog, options []string) ([]Item, int64, error) {
	if len(options) == 0 {
		return nil, 0, ErrEmptyOptions
	}

	seen := make(map[string]bool, len(options))
	items := make([]Item, 0, len(options))
	var total int64
	var hasSummarize, hasAudioSummary bool

	for _, opt := range options {
		if seen[opt] {
			return nil, 0, fmt.Errorf("%w: %s", ErrDuplicateItem, opt)
		}
		seen[opt] = true

		credits, ok := catalog.Prices[opt]
		if !ok {
			return nil, 0, fmt.Errorf("%w: %s", ErrUnknownItem, opt)
		}
		items = append(items, Item{ItemID: opt, Credits: credits})
		total += credits

		switch opt {
		case ItemSummarize:
			hasSummarize = true
		case ItemGenerateAudioSummary:
			hasAudioSummary = true
		}
	}

	if hasAudioSummary && !hasSummarize {
		return nil, 0, ErrMissingDependency
	}
	return items, total, nil
}
