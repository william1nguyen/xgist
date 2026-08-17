package content_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/content/internal/content"
)

type fakeRepo struct {
	transcripts map[uuid.UUID]content.Transcript
	versions    map[uuid.UUID]int
	storeCalls  int
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{transcripts: map[uuid.UUID]content.Transcript{}, versions: map[uuid.UUID]int{}}
}

func (f *fakeRepo) bump(mediaID uuid.UUID) content.Version {
	f.versions[mediaID]++
	return content.Version{MediaID: mediaID, Version: f.versions[mediaID], UpdatedAt: time.Now()}
}

func (f *fakeRepo) StoreTranscript(ctx context.Context, cmd content.StoreTranscriptCommand) (content.Version, error) {
	f.storeCalls++
	f.transcripts[cmd.MediaID] = content.Transcript{
		MediaID: cmd.MediaID, Language: cmd.Language, Text: cmd.Text, Segments: cmd.Segments,
	}
	return f.bump(cmd.MediaID), nil
}

func (f *fakeRepo) FindTranscript(ctx context.Context, mediaID uuid.UUID) (content.Transcript, error) {
	t, ok := f.transcripts[mediaID]
	if !ok {
		return content.Transcript{}, content.ErrNotFound
	}
	return t, nil
}

func (f *fakeRepo) StoreSummary(ctx context.Context, cmd content.StoreSummaryCommand) (content.Version, error) {
	f.storeCalls++
	return f.bump(cmd.MediaID), nil
}

func (f *fakeRepo) StoreKeywords(ctx context.Context, cmd content.StoreKeywordsCommand) (content.Version, error) {
	f.storeCalls++
	return f.bump(cmd.MediaID), nil
}

func (f *fakeRepo) StoreKeypoints(ctx context.Context, cmd content.StoreKeypointsCommand) (content.Version, error) {
	f.storeCalls++
	return f.bump(cmd.MediaID), nil
}

func (f *fakeRepo) StoreNotes(ctx context.Context, cmd content.StoreNotesCommand) (content.Version, error) {
	f.storeCalls++
	return f.bump(cmd.MediaID), nil
}

func (f *fakeRepo) StoreSummaryAudio(ctx context.Context, cmd content.StoreSummaryAudioCommand) (content.Version, error) {
	f.storeCalls++
	return f.bump(cmd.MediaID), nil
}

func (f *fakeRepo) FindContent(ctx context.Context, mediaID uuid.UUID) (content.Content, error) {
	t, ok := f.transcripts[mediaID]
	if !ok {
		return content.Content{}, content.ErrNotFound
	}
	return content.Content{MediaID: mediaID, Transcript: &t}, nil
}

type fakeDeletionChecker struct {
	pending map[uuid.UUID]bool
}

func (f *fakeDeletionChecker) IsDeletionPending(ctx context.Context, mediaID uuid.UUID) (bool, error) {
	return f.pending[mediaID], nil
}

func segs(n int) []content.TranscriptSegment {
	out := make([]content.TranscriptSegment, n)
	for i := range out {
		out[i] = content.TranscriptSegment{SegmentIndex: i, StartMs: int64(i * 1000), EndMs: int64(i*1000 + 900), Text: "segment"}
	}
	return out
}

func TestStoreTranscriptValidatesSegmentOrdering(t *testing.T) {
	repo := newFakeRepo()
	svc := content.NewService(repo, &fakeDeletionChecker{pending: map[uuid.UUID]bool{}})
	mediaID := uuid.New()

	t.Run("accepts contiguous non-overlapping segments", func(t *testing.T) {
		_, err := svc.StoreTranscript(context.Background(), content.StoreTranscriptCommand{
			MediaID: mediaID, WorkflowID: uuid.New(), IdempotencyKey: "k1", Segments: segs(3),
		})
		if err != nil {
			t.Fatalf("StoreTranscript: %v", err)
		}
	})

	t.Run("rejects an out-of-order index", func(t *testing.T) {
		bad := segs(3)
		bad[1], bad[2] = bad[2], bad[1]
		_, err := svc.StoreTranscript(context.Background(), content.StoreTranscriptCommand{
			MediaID: uuid.New(), WorkflowID: uuid.New(), IdempotencyKey: "k2", Segments: bad,
		})
		if !errors.Is(err, content.ErrInvalidSegments) {
			t.Fatalf("got %v, want ErrInvalidSegments", err)
		}
	})

	t.Run("rejects an overlapping segment", func(t *testing.T) {
		bad := segs(2)
		bad[1].StartMs = bad[0].StartMs
		_, err := svc.StoreTranscript(context.Background(), content.StoreTranscriptCommand{
			MediaID: uuid.New(), WorkflowID: uuid.New(), IdempotencyKey: "k3", Segments: bad,
		})
		if !errors.Is(err, content.ErrInvalidSegments) {
			t.Fatalf("got %v, want ErrInvalidSegments", err)
		}
	})

	t.Run("rejects end before start", func(t *testing.T) {
		bad := []content.TranscriptSegment{{SegmentIndex: 0, StartMs: 500, EndMs: 100, Text: "x"}}
		_, err := svc.StoreTranscript(context.Background(), content.StoreTranscriptCommand{
			MediaID: uuid.New(), WorkflowID: uuid.New(), IdempotencyKey: "k4", Segments: bad,
		})
		if !errors.Is(err, content.ErrInvalidSegments) {
			t.Fatalf("got %v, want ErrInvalidSegments", err)
		}
	})
}

func TestStoreTranscriptRejectsWhenDeletionPending(t *testing.T) {
	repo := newFakeRepo()
	mediaID := uuid.New()
	svc := content.NewService(repo, &fakeDeletionChecker{pending: map[uuid.UUID]bool{mediaID: true}})

	_, err := svc.StoreTranscript(context.Background(), content.StoreTranscriptCommand{
		MediaID: mediaID, WorkflowID: uuid.New(), IdempotencyKey: "k", Segments: segs(1),
	})
	if !errors.Is(err, content.ErrDeletionPending) {
		t.Fatalf("got %v, want ErrDeletionPending", err)
	}
	if repo.storeCalls != 0 {
		t.Error("repository should not be called for a pending-deletion media item")
	}
}

func TestStoreSummaryValidatesCitations(t *testing.T) {
	repo := newFakeRepo()
	svc := content.NewService(repo, &fakeDeletionChecker{pending: map[uuid.UUID]bool{}})
	mediaID := uuid.New()

	if _, err := svc.StoreTranscript(context.Background(), content.StoreTranscriptCommand{
		MediaID: mediaID, WorkflowID: uuid.New(), IdempotencyKey: "t1", Segments: segs(3),
	}); err != nil {
		t.Fatalf("StoreTranscript: %v", err)
	}

	t.Run("accepts a citation referencing a real segment", func(t *testing.T) {
		_, err := svc.StoreSummary(context.Background(), content.StoreSummaryCommand{
			MediaID: mediaID, WorkflowID: uuid.New(), IdempotencyKey: "s1", SummaryType: "short",
			Sentences: []content.SummarySentence{{SentenceIndex: 0, Text: "x", CitedSegmentIndexes: []int{0, 2}}},
		})
		if err != nil {
			t.Fatalf("StoreSummary: %v", err)
		}
	})

	t.Run("rejects a citation referencing an unknown segment", func(t *testing.T) {
		_, err := svc.StoreSummary(context.Background(), content.StoreSummaryCommand{
			MediaID: mediaID, WorkflowID: uuid.New(), IdempotencyKey: "s2", SummaryType: "short",
			Sentences: []content.SummarySentence{{SentenceIndex: 0, Text: "x", CitedSegmentIndexes: []int{99}}},
		})
		if !errors.Is(err, content.ErrUnknownSegment) {
			t.Fatalf("got %v, want ErrUnknownSegment", err)
		}
	})

	t.Run("rejects a summary for a media item with no transcript", func(t *testing.T) {
		_, err := svc.StoreSummary(context.Background(), content.StoreSummaryCommand{
			MediaID: uuid.New(), WorkflowID: uuid.New(), IdempotencyKey: "s3", SummaryType: "short",
		})
		if !errors.Is(err, content.ErrNotFound) {
			t.Fatalf("got %v, want ErrNotFound", err)
		}
	})
}

func TestStoreKeypointsValidatesSegmentRange(t *testing.T) {
	repo := newFakeRepo()
	svc := content.NewService(repo, &fakeDeletionChecker{pending: map[uuid.UUID]bool{}})
	mediaID := uuid.New()

	if _, err := svc.StoreTranscript(context.Background(), content.StoreTranscriptCommand{
		MediaID: mediaID, WorkflowID: uuid.New(), IdempotencyKey: "t1", Segments: segs(3),
	}); err != nil {
		t.Fatalf("StoreTranscript: %v", err)
	}

	t.Run("accepts a valid range", func(t *testing.T) {
		_, err := svc.StoreKeypoints(context.Background(), content.StoreKeypointsCommand{
			MediaID: mediaID, WorkflowID: uuid.New(), IdempotencyKey: "k1",
			Keypoints: []content.Keypoint{{PointIndex: 0, Text: "x", StartSegment: 0, EndSegment: 1}},
		})
		if err != nil {
			t.Fatalf("StoreKeypoints: %v", err)
		}
	})

	t.Run("rejects an inverted range", func(t *testing.T) {
		_, err := svc.StoreKeypoints(context.Background(), content.StoreKeypointsCommand{
			MediaID: mediaID, WorkflowID: uuid.New(), IdempotencyKey: "k2",
			Keypoints: []content.Keypoint{{PointIndex: 0, Text: "x", StartSegment: 2, EndSegment: 0}},
		})
		if !errors.Is(err, content.ErrUnknownSegment) {
			t.Fatalf("got %v, want ErrUnknownSegment", err)
		}
	})

	t.Run("rejects an out-of-range segment", func(t *testing.T) {
		_, err := svc.StoreKeypoints(context.Background(), content.StoreKeypointsCommand{
			MediaID: mediaID, WorkflowID: uuid.New(), IdempotencyKey: "k3",
			Keypoints: []content.Keypoint{{PointIndex: 0, Text: "x", StartSegment: 0, EndSegment: 99}},
		})
		if !errors.Is(err, content.ErrUnknownSegment) {
			t.Fatalf("got %v, want ErrUnknownSegment", err)
		}
	})
}

func TestGetContentAndGetTranscriptNotFound(t *testing.T) {
	repo := newFakeRepo()
	svc := content.NewService(repo, &fakeDeletionChecker{pending: map[uuid.UUID]bool{}})

	if _, err := svc.GetTranscript(context.Background(), uuid.New()); !errors.Is(err, content.ErrNotFound) {
		t.Fatalf("GetTranscript: got %v, want ErrNotFound", err)
	}
	if _, err := svc.GetContent(context.Background(), uuid.New()); !errors.Is(err, content.ErrNotFound) {
		t.Fatalf("GetContent: got %v, want ErrNotFound", err)
	}
}
