package events

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/media/internal/deletion"
	"github.com/nolannguyen1212/media-notes/services/media/internal/media"
)

// TrashLister returns trashed items due for purging. *media.Service
// implements it.
type TrashLister interface {
	ListTrashedOlderThan(ctx context.Context, olderThan time.Duration, limit int) ([]media.Media, error)
}

// TrashPurger starts a media item's irreversible hard-delete flow.
// *deletion.Service implements it — the same RequestDeletion a user's own
// "delete permanently" action calls, so a purged item goes through the
// exact same object/row cleanup and content/conductor cascade.
type TrashPurger interface {
	RequestDeletion(ctx context.Context, mediaID uuid.UUID) (deletion.Operation, error)
}

// TrashPurgeSweep periodically hard-deletes trashed items past retention.
// It has no DLQ, feature flag, or dry-run mode, matching Reconciler's
// reasoning: this is not a rollout concern.
type TrashPurgeSweep struct {
	lister    TrashLister
	purger    TrashPurger
	logger    *slog.Logger
	retention time.Duration
	batchSize int
}

// NewTrashPurgeSweep returns a TrashPurgeSweep that hard-deletes trashed
// items once they are older than retention (30 days per the product
// requirement), processing at most batchSize per tick.
func NewTrashPurgeSweep(lister TrashLister, purger TrashPurger, logger *slog.Logger, retention time.Duration, batchSize int) *TrashPurgeSweep {
	return &TrashPurgeSweep{lister: lister, purger: purger, logger: logger, retention: retention, batchSize: batchSize}
}

// Run ticks every interval until ctx is canceled.
func (s *TrashPurgeSweep) Run(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.tick(ctx)
		}
	}
}

func (s *TrashPurgeSweep) tick(ctx context.Context) {
	items, err := s.lister.ListTrashedOlderThan(ctx, s.retention, s.batchSize)
	if err != nil {
		s.logger.ErrorContext(ctx, "list trashed media for purge", "error", err)
		return
	}
	for _, item := range items {
		if _, err := s.purger.RequestDeletion(ctx, item.ID); err != nil {
			s.logger.ErrorContext(ctx, "purge trashed media", "error", err, "media_id", item.ID)
			continue
		}
	}
	if len(items) > 0 {
		s.logger.InfoContext(ctx, "purged expired trashed media", "count", len(items))
	}
}
