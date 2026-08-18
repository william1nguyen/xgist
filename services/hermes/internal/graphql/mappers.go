package graphql

import (
	"time"

	"github.com/nolannguyen1212/media-notes/services/hermes/internal/clients"
	"github.com/nolannguyen1212/media-notes/services/hermes/internal/graphql/model"
)

// formatTime renders a timestamp as RFC 3339, the schema's timestamp
// convention. A zero time (a field the caller never set) renders as "".
func formatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format(time.RFC3339Nano)
}

func optionalString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func toModelUser(u clients.User) *model.User {
	return &model.User{
		ID:            u.ID.String(),
		Email:         u.Email,
		Name:          u.Name,
		ImageURL:      optionalString(u.ImageURL),
		EmailVerified: u.EmailVerified,
		State:         toModelAccountState(u.State),
		CreatedAt:     formatTime(u.CreatedAt),
	}
}

func toModelAccountState(s string) model.AccountState {
	switch s {
	case "active":
		return model.AccountStateActive
	case "deletion_pending":
		return model.AccountStateDeletionPending
	case "tombstoned":
		return model.AccountStateTombstoned
	default:
		return model.AccountStateActive
	}
}

func toModelAuthPayload(sess clients.Session) *model.AuthPayload {
	return &model.AuthPayload{
		User:         toModelUser(sess.User),
		SessionToken: sess.Token,
		ExpiresAt:    formatTime(sess.ExpiresAt),
	}
}

func toModelDeletionOperation(op clients.DeletionOperation) *model.DeletionOperation {
	out := &model.DeletionOperation{
		DeletionID: op.DeletionID.String(),
		UserID:     op.UserID.String(),
		State:      toModelDeletionState(op.State),
		CreatedAt:  formatTime(op.CreatedAt),
	}
	if op.CompletedAt != nil {
		completedAt := formatTime(*op.CompletedAt)
		out.CompletedAt = &completedAt
	}
	return out
}

func toModelDeletionState(s string) model.DeletionState {
	switch s {
	case "pending":
		return model.DeletionStatePending
	case "completed":
		return model.DeletionStateCompleted
	case "failed_attention_required":
		return model.DeletionStateFailedAttentionRequired
	default:
		return model.DeletionStatePending
	}
}

func toModelUploadSession(s clients.UploadSession) *model.UploadSession {
	return &model.UploadSession{
		ID:        s.ID.String(),
		MediaID:   s.MediaID.String(),
		UploadURL: s.UploadURL,
		Status:    s.Status,
		ExpiresAt: formatTime(s.ExpiresAt),
	}
}

func toModelMedia(m clients.Media) *model.Media {
	out := &model.Media{
		ID:           m.ID.String(),
		Title:        m.Title,
		MediaType:    toModelMediaType(m.MediaType),
		MimeType:     m.MimeType,
		SizeBytes:    int(m.SizeBytes),
		DurationMs:   int(m.DurationMs),
		Status:       toModelMediaStatus(m.Status),
		ThumbnailURL: optionalString(m.ThumbnailURL),
		CreatedAt:    formatTime(m.CreatedAt),
		UpdatedAt:    formatTime(m.UpdatedAt),
		Description:  optionalString(m.Description),
	}
	if m.TrashedAt != nil {
		trashedAt := formatTime(*m.TrashedAt)
		out.TrashedAt = &trashedAt
	}
	return out
}

func toModelMediaType(t string) model.MediaType {
	switch t {
	case "audio":
		return model.MediaTypeAudio
	case "video":
		return model.MediaTypeVideo
	default:
		return model.MediaTypeAudio
	}
}

func toModelMediaStatus(s string) model.MediaStatus {
	switch s {
	case "pending_upload":
		return model.MediaStatusPendingUpload
	case "processing":
		return model.MediaStatusProcessing
	case "completed":
		return model.MediaStatusCompleted
	case "failed":
		return model.MediaStatusFailed
	case "deletion_pending":
		return model.MediaStatusDeletionPending
	default:
		return model.MediaStatusPendingUpload
	}
}

func toModelProcessingStatus(s string) model.ProcessingStatus {
	switch s {
	case "requested":
		return model.ProcessingStatusRequested
	case "accepted":
		return model.ProcessingStatusAccepted
	case "completed":
		return model.ProcessingStatusCompleted
	case "failed":
		return model.ProcessingStatusFailed
	default:
		return model.ProcessingStatusUnspecified
	}
}

// toModelMediaDetail combines a media read with its signed playback URL.
// A signing failure is not fatal — the detail page still renders without
// playback, matching media's own toProtoMediaWithThumbnail precedent for
// a best-effort thumbnail.
func toModelMediaDetail(m clients.Media, playbackURL string, playbackExpiresAt time.Time) *model.MediaDetail {
	out := &model.MediaDetail{
		ID:           m.ID.String(),
		Title:        m.Title,
		MediaType:    toModelMediaType(m.MediaType),
		MimeType:     m.MimeType,
		SizeBytes:    int(m.SizeBytes),
		DurationMs:   int(m.DurationMs),
		Status:       toModelMediaStatus(m.Status),
		ThumbnailURL: optionalString(m.ThumbnailURL),
		CreatedAt:    formatTime(m.CreatedAt),
		UpdatedAt:    formatTime(m.UpdatedAt),
		Description:  optionalString(m.Description),
	}
	if playbackURL != "" {
		out.PlaybackURL = optionalString(playbackURL)
		expiresAt := formatTime(playbackExpiresAt)
		out.PlaybackURLExpiresAt = &expiresAt
	}
	return out
}

func toModelMediaProgress(p clients.MediaProgress) *model.MediaProgress {
	return &model.MediaProgress{
		MediaID:          p.MediaID.String(),
		Status:           toModelMediaStatus(p.Status),
		ProcessingStatus: toModelProcessingStatus(p.ProcessingStatus),
		CompletedSteps:   int(p.CompletedSteps),
		TotalSteps:       int(p.TotalSteps),
		UpdatedAt:        formatTime(p.UpdatedAt),
		Version:          int(p.Version),
	}
}

func toModelContent(c clients.Content) *model.Content {
	out := &model.Content{
		MediaID: c.MediaID.String(),
		Version: int(c.Version),
	}

	if c.Transcript != nil {
		segments := make([]model.TranscriptSegment, 0, len(c.Transcript.Segments))
		for _, seg := range c.Transcript.Segments {
			segments = append(segments, model.TranscriptSegment{
				SegmentIndex: int(seg.SegmentIndex),
				StartMs:      int(seg.StartMs),
				EndMs:        int(seg.EndMs),
				Speaker:      optionalString(seg.Speaker),
				Text:         seg.Text,
			})
		}
		out.Transcript = &model.Transcript{Language: c.Transcript.Language, Text: c.Transcript.Text, Segments: segments}
	}

	for _, s := range c.Summaries {
		sentences := make([]model.SummarySentence, 0, len(s.Sentences))
		for _, sent := range s.Sentences {
			cited := make([]int, 0, len(sent.CitedSegmentIndexes))
			for _, idx := range sent.CitedSegmentIndexes {
				cited = append(cited, int(idx))
			}
			sentences = append(sentences, model.SummarySentence{
				SentenceIndex:       int(sent.SentenceIndex),
				Text:                sent.Text,
				CitedSegmentIndexes: cited,
			})
		}
		out.Summaries = append(out.Summaries, model.Summary{
			SummaryType:   s.SummaryType,
			Text:          s.Text,
			Model:         s.Model,
			PromptVersion: s.PromptVersion,
			Sentences:     sentences,
			CreatedAt:     formatTime(s.CreatedAt),
		})
	}

	for _, k := range c.Keywords {
		out.Keywords = append(out.Keywords, model.Keyword{Keyword: k.Keyword, Score: k.Score, Position: int(k.Position)})
	}

	for _, k := range c.Keypoints {
		out.Keypoints = append(out.Keypoints, model.Keypoint{
			PointIndex:   int(k.PointIndex),
			Text:         k.Text,
			StartSegment: int(k.StartSegment),
			EndSegment:   int(k.EndSegment),
		})
	}

	for _, n := range c.Notes {
		out.Notes = append(out.Notes, model.Note{Format: n.Format, Body: n.Body, CreatedAt: formatTime(n.CreatedAt)})
	}

	for _, a := range c.SummaryAudios {
		out.SummaryAudios = append(out.SummaryAudios, model.SummaryAudio{
			SummaryType: a.SummaryType,
			MimeType:    a.MimeType,
			DurationMs:  int(a.DurationMs),
			Voice:       a.Voice,
			Status:      toModelSummaryAudioStatus(a.Status),
			URL:         optionalString(a.URL),
		})
	}

	return out
}

func toModelSummaryAudioStatus(s string) model.SummaryAudioStatus {
	switch s {
	case "ready":
		return model.SummaryAudioStatusReady
	case "failed":
		return model.SummaryAudioStatusFailed
	default:
		return model.SummaryAudioStatusFailed
	}
}

func toModelQuote(q clients.Quote) *model.Quote {
	items := make([]model.QuoteItem, 0, len(q.Items))
	for _, item := range q.Items {
		items = append(items, model.QuoteItem{ItemID: item.ItemID, Credits: int(item.Credits)})
	}
	return &model.Quote{
		ID:             q.ID.String(),
		CatalogVersion: q.CatalogVersion,
		Items:          items,
		TotalCredits:   int(q.TotalCredits),
		ExpiresAt:      formatTime(q.ExpiresAt),
	}
}

func toModelPriceCatalog(c clients.Catalog) *model.PriceCatalog {
	items := make([]model.QuoteItem, 0, len(c.Items))
	for _, item := range c.Items {
		items = append(items, model.QuoteItem{ItemID: item.ItemID, Credits: int(item.Credits)})
	}
	return &model.PriceCatalog{CatalogVersion: c.Version, Items: items}
}

func toModelBillingSummary(s clients.BillingSummary) *model.BillingSummary {
	out := &model.BillingSummary{
		AvailableCredits: int(s.AvailableCredits),
		ReservedCredits:  int(s.ReservedCredits),
	}
	if s.Subscription != nil {
		out.Subscription = &model.BillingSubscription{
			ID:          s.Subscription.ID,
			Plan:        s.Subscription.Plan,
			Status:      toModelSubscriptionStatus(s.Subscription.Status),
			PeriodStart: formatTime(s.Subscription.PeriodStart),
			PeriodEnd:   formatTime(s.Subscription.PeriodEnd),
		}
	}
	return out
}

func toModelPlan(p clients.Plan) model.Plan {
	out := model.Plan{
		ID:                p.ID,
		Name:              p.Name,
		PriceAmount:       int(p.PriceAmount),
		RecurringInterval: p.RecurringInterval,
		Benefits:          p.Benefits,
	}
	if p.Description != "" {
		out.Description = &p.Description
	}
	if p.PriceCurrency != "" {
		out.PriceCurrency = &p.PriceCurrency
	}
	return out
}

func toModelCreditPack(p clients.CreditPack) model.CreditPack {
	out := model.CreditPack{
		ID:          p.ID,
		Name:        p.Name,
		Credits:     int(p.Credits),
		PriceAmount: int(p.PriceAmount),
	}
	if p.Description != "" {
		out.Description = &p.Description
	}
	if p.PriceCurrency != "" {
		out.PriceCurrency = &p.PriceCurrency
	}
	return out
}

func toModelPromptSetting(s clients.PromptSetting) *model.PromptSetting {
	return &model.PromptSetting{
		Section:    s.Section,
		PromptText: s.PromptText,
		UpdatedAt:  formatTime(s.UpdatedAt),
	}
}

func toModelAudioJob(j clients.AudioJob) *model.AudioJob {
	out := &model.AudioJob{
		ID:        j.ID.String(),
		Kind:      j.Kind,
		Status:    j.Status,
		InputText: j.InputText,
		CreatedAt: formatTime(j.CreatedAt),
	}
	out.OutputText = optionalString(j.OutputText)
	out.Voice = optionalString(j.Voice)
	out.URL = optionalString(j.URL)
	out.ErrorCode = optionalString(j.ErrorCode)
	if j.DurationMs > 0 {
		duration := int(j.DurationMs)
		out.DurationMs = &duration
	}
	return out
}

func toModelCreditLedgerPage(p clients.LedgerPage) *model.CreditLedgerPage {
	items := make([]model.CreditLedgerEntry, 0, len(p.Entries))
	for _, e := range p.Entries {
		entry := model.CreditLedgerEntry{
			ID:        e.ID,
			Delta:     int(e.Delta),
			EntryType: e.EntryType,
			CreatedAt: formatTime(e.CreatedAt),
		}
		if e.ItemID != "" {
			itemID := e.ItemID
			entry.ItemID = &itemID
		}
		items = append(items, entry)
	}
	out := &model.CreditLedgerPage{Items: items}
	if p.NextCursor != "" {
		cursor := p.NextCursor
		out.NextCursor = &cursor
	}
	return out
}

func toModelSubscriptionStatus(s string) model.SubscriptionStatus {
	switch s {
	case "none":
		return model.SubscriptionStatusNone
	case "active":
		return model.SubscriptionStatusActive
	case "canceled":
		return model.SubscriptionStatusCanceled
	case "past_due":
		return model.SubscriptionStatusPastDue
	default:
		return model.SubscriptionStatusNone
	}
}
