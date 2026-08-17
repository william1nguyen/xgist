package quote_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/billing/internal/quote"
)

type fakeRepo struct {
	catalog quote.Catalog
	byID    map[uuid.UUID]quote.Quote
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		catalog: quote.Catalog{
			Version: "launch-v1",
			Prices: map[string]int64{
				quote.ItemTranscribe:           10,
				quote.ItemSummarize:            20,
				quote.ItemExtractKeywords:      5,
				quote.ItemExtractKeypoints:     10,
				quote.ItemGenerateNotes:        15,
				quote.ItemGenerateAudioSummary: 30,
			},
		},
		byID: map[uuid.UUID]quote.Quote{},
	}
}

func (f *fakeRepo) ActiveCatalog(context.Context) (quote.Catalog, error) {
	return f.catalog, nil
}

func (f *fakeRepo) Create(_ context.Context, q quote.Quote) (quote.Quote, error) {
	f.byID[q.ID] = q
	return q, nil
}

func (f *fakeRepo) FindByID(_ context.Context, id uuid.UUID) (quote.Quote, error) {
	q, ok := f.byID[id]
	if !ok {
		return quote.Quote{}, quote.ErrNotFound
	}
	return q, nil
}

func TestServiceGetQuote(t *testing.T) {
	tests := map[string]struct {
		options      []string
		wantErr      error
		wantTotal    int64
		wantItemsLen int
	}{
		"prices every option": {
			options:      []string{quote.ItemTranscribe, quote.ItemSummarize, quote.ItemExtractKeywords, quote.ItemExtractKeypoints, quote.ItemGenerateNotes, quote.ItemGenerateAudioSummary},
			wantTotal:    90,
			wantItemsLen: 6,
		},
		"prices one option": {
			options:      []string{quote.ItemTranscribe},
			wantTotal:    10,
			wantItemsLen: 1,
		},
		"rejects empty options": {
			options: nil,
			wantErr: quote.ErrEmptyOptions,
		},
		"rejects unknown item": {
			options: []string{"levitate_media"},
			wantErr: quote.ErrUnknownItem,
		},
		"rejects duplicate item": {
			options: []string{quote.ItemTranscribe, quote.ItemTranscribe},
			wantErr: quote.ErrDuplicateItem,
		},
		"prices audio summary without summarize by auto-including summarize": {
			options:      []string{quote.ItemGenerateAudioSummary},
			wantTotal:    50,
			wantItemsLen: 2,
		},
		"accepts audio summary with summarize": {
			options:      []string{quote.ItemSummarize, quote.ItemGenerateAudioSummary},
			wantTotal:    50,
			wantItemsLen: 2,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			svc := quote.NewService(newFakeRepo(), 15*time.Minute)
			q, err := svc.GetQuote(context.Background(), uuid.New(), tc.options)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("got err %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("GetQuote: %v", err)
			}
			if q.TotalCredits != tc.wantTotal {
				t.Errorf("total = %d, want %d", q.TotalCredits, tc.wantTotal)
			}
			if len(q.Items) != tc.wantItemsLen {
				t.Errorf("items = %d, want %d", len(q.Items), tc.wantItemsLen)
			}
			if q.CatalogVersion != "launch-v1" {
				t.Errorf("catalog version = %q, want launch-v1", q.CatalogVersion)
			}
		})
	}
}

func TestServiceGetRejectsExpiredUnacceptedQuote(t *testing.T) {
	repo := newFakeRepo()
	svc := quote.NewService(repo, 15*time.Minute)
	ctx := context.Background()

	q, err := svc.GetQuote(ctx, uuid.New(), []string{quote.ItemTranscribe})
	if err != nil {
		t.Fatalf("GetQuote: %v", err)
	}

	q.ExpiresAt = time.Now().Add(-time.Minute)
	repo.byID[q.ID] = q

	if _, err := svc.Get(ctx, q.ID); !errors.Is(err, quote.ErrExpired) {
		t.Fatalf("got err %v, want ErrExpired", err)
	}
}

func TestServiceGetAllowsExpiredAcceptedQuote(t *testing.T) {
	repo := newFakeRepo()
	svc := quote.NewService(repo, 15*time.Minute)
	ctx := context.Background()

	q, err := svc.GetQuote(ctx, uuid.New(), []string{quote.ItemTranscribe})
	if err != nil {
		t.Fatalf("GetQuote: %v", err)
	}

	acceptedAt := time.Now()
	q.AcceptedAt = &acceptedAt
	q.ExpiresAt = time.Now().Add(-time.Minute)
	repo.byID[q.ID] = q

	if _, err := svc.Get(ctx, q.ID); err != nil {
		t.Fatalf("Get: %v, want an accepted-but-expired quote to remain valid", err)
	}
}
