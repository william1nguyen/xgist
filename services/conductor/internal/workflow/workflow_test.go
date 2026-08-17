package workflow_test

import (
	"context"
	"errors"
	"sort"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/conductor/internal/workflow"
)

func stepTypes(plans []workflow.StepPlan) []string {
	out := make([]string, 0, len(plans))
	for _, p := range plans {
		out = append(out, p.StepType)
	}
	sort.Strings(out)
	return out
}

func TestPlanStepsThumbnailForVideoIsIndependentOfOptions(t *testing.T) {
	plans := workflow.PlanSteps(nil, "video")
	got := stepTypes(plans)
	want := []string{workflow.StepThumbnail}
	if len(got) != len(want) || got[0] != want[0] {
		t.Fatalf("PlanSteps(nil, video) = %v, want %v", got, want)
	}
}

func TestPlanStepsOmitsTranscribeWhenNotSelected(t *testing.T) {
	// A regenerate request for a media item that already has a transcript
	// must not select transcribe: it would re-run (and re-bill) work the
	// caller never asked for.
	plans := workflow.PlanSteps([]string{"extract_keywords"}, "audio")
	for _, p := range plans {
		if p.StepType == workflow.StepTranscribe {
			t.Fatal("transcribe must not be planned unless explicitly selected")
		}
	}
}

func TestPlanStepsIncludesTranscribeWhenSelected(t *testing.T) {
	plans := workflow.PlanSteps([]string{"transcribe"}, "video")
	got := stepTypes(plans)
	want := []string{workflow.StepThumbnail, workflow.StepTranscribe}
	sort.Strings(want)
	if len(got) != len(want) {
		t.Fatalf("PlanSteps([transcribe], video) = %v, want %v", got, want)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Fatalf("PlanSteps([transcribe], video) = %v, want %v", got, want)
		}
	}
}

func TestPlanStepsOmitsThumbnailForAudio(t *testing.T) {
	for _, p := range workflow.PlanSteps(nil, "audio") {
		if p.StepType == workflow.StepThumbnail {
			t.Fatal("generate_thumbnail must be omitted for audio media: worker has no frame to extract")
		}
	}
}

func TestPlanStepsThumbnailIsNotRequired(t *testing.T) {
	for _, p := range workflow.PlanSteps([]string{"transcribe"}, "video") {
		if p.StepType == workflow.StepThumbnail && p.Required {
			t.Fatal("generate_thumbnail must not be required: it does not gate workflow completion")
		}
		if p.StepType == workflow.StepTranscribe && !p.Required {
			t.Fatal("transcribe must be required")
		}
	}
}

func TestPlanStepsAudioSummaryImpliesSummary(t *testing.T) {
	plans := workflow.PlanSteps([]string{"generate_audio_summary"}, "audio")
	byType := map[string]workflow.StepPlan{}
	for _, p := range plans {
		byType[p.StepType] = p
	}
	if _, ok := byType[workflow.StepSummary]; !ok {
		t.Fatal("selecting generate_audio_summary must implicitly select summary")
	}
	audio, ok := byType[workflow.StepSummaryAudio]
	if !ok {
		t.Fatal("summary_audio step missing")
	}
	if len(audio.DependsOn) != 1 || audio.DependsOn[0] != workflow.StepSummary {
		t.Fatalf("summary_audio.DependsOn = %v, want [summary]", audio.DependsOn)
	}
}

func TestPlanStepsEnrichmentDependsOnTranscribe(t *testing.T) {
	plans := workflow.PlanSteps([]string{"summarize", "extract_keywords", "extract_keypoints", "generate_notes"}, "audio")
	for _, p := range plans {
		switch p.StepType {
		case workflow.StepSummary, workflow.StepKeywords, workflow.StepKeypoints, workflow.StepNotes:
			if len(p.DependsOn) != 1 || p.DependsOn[0] != workflow.StepTranscribe {
				t.Errorf("%s.DependsOn = %v, want [transcribe]", p.StepType, p.DependsOn)
			}
		}
	}
}

func TestPlanStepsIgnoresUnknownOptions(t *testing.T) {
	plans := workflow.PlanSteps([]string{"not_a_real_option"}, "audio")
	for _, p := range plans {
		if p.StepType == "not_a_real_option" {
			t.Fatal("unknown option must not become a step")
		}
	}
}

func TestBillableOptionsExcludesThumbnail(t *testing.T) {
	plans := workflow.PlanSteps([]string{"summarize"}, "audio")
	for _, item := range workflow.BillableOptions(plans) {
		if item == "" {
			t.Fatal("BillableOptions returned an empty item id")
		}
	}
	// generate_thumbnail must never surface as a billable item.
	if _, billable := workflow.BillingItemID(workflow.StepThumbnail); billable {
		t.Fatal("generate_thumbnail must not have a billing item")
	}
}

func TestBillingItemIDRoundTrip(t *testing.T) {
	cases := map[string]string{
		workflow.StepTranscribe:   "transcribe",
		workflow.StepSummary:      "summarize",
		workflow.StepKeywords:     "extract_keywords",
		workflow.StepKeypoints:    "extract_keypoints",
		workflow.StepNotes:        "generate_notes",
		workflow.StepSummaryAudio: "generate_audio_summary",
	}
	for step, want := range cases {
		got, ok := workflow.BillingItemID(step)
		if !ok || got != want {
			t.Errorf("BillingItemID(%s) = (%s, %v), want (%s, true)", step, got, ok, want)
		}
	}
}

// --- Service orchestration tests, against fakes ---

type fakeMediaClient struct {
	owner     uuid.UUID
	mediaType string
	err       error
}

func (f *fakeMediaClient) GetMedia(ctx context.Context, mediaID uuid.UUID) (workflow.MediaInfo, error) {
	return workflow.MediaInfo{OwnerID: f.owner, MediaType: f.mediaType}, f.err
}

type fakeBillingClient struct {
	quoteID uuid.UUID
	err     error
	gotUser uuid.UUID
	gotOpts []string
	gotKey  string
}

func (f *fakeBillingClient) GetQuote(ctx context.Context, userID uuid.UUID, options []string, idempotencyKey string) (uuid.UUID, error) {
	f.gotUser = userID
	f.gotOpts = options
	f.gotKey = idempotencyKey
	return f.quoteID, f.err
}

type fakeRepo struct {
	created         workflow.NewWorkflow
	createErr       error
	creditDecisions []struct {
		eventID, workflowID uuid.UUID
		accepted            bool
	}
	completions []workflow.StepCompletion
	failures    []workflow.StepFailure
	thumbnails  []uuid.UUID
	due         []workflow.DueRetry
	dispatched  []workflow.DueRetry
	timedOut    []workflow.TimedOutStep
	canceled    []struct{ deletionID, mediaID uuid.UUID }
}

func (f *fakeRepo) CreateWorkflow(ctx context.Context, in workflow.NewWorkflow) (workflow.Workflow, error) {
	f.created = in
	return workflow.Workflow{ID: uuid.New(), MediaID: in.MediaID, RequestID: in.RequestID}, f.createErr
}

func (f *fakeRepo) ApplyCreditDecision(ctx context.Context, eventID, workflowID uuid.UUID, accepted bool) error {
	f.creditDecisions = append(f.creditDecisions, struct {
		eventID, workflowID uuid.UUID
		accepted            bool
	}{eventID, workflowID, accepted})
	return nil
}

func (f *fakeRepo) CompleteStep(ctx context.Context, in workflow.StepCompletion) error {
	f.completions = append(f.completions, in)
	return nil
}

func (f *fakeRepo) FailStep(ctx context.Context, in workflow.StepFailure, maxAttempts int) error {
	f.failures = append(f.failures, in)
	return nil
}

func (f *fakeRepo) CompleteThumbnail(ctx context.Context, mediaID uuid.UUID) error {
	f.thumbnails = append(f.thumbnails, mediaID)
	return nil
}

func (f *fakeRepo) DueRetries(ctx context.Context, now time.Time, limit int) ([]workflow.DueRetry, error) {
	return f.due, nil
}

func (f *fakeRepo) DispatchRetry(ctx context.Context, due workflow.DueRetry, maxAttempts int) error {
	f.dispatched = append(f.dispatched, due)
	return nil
}

func (f *fakeRepo) TimedOutSteps(ctx context.Context, now time.Time, limit int) ([]workflow.TimedOutStep, error) {
	return f.timedOut, nil
}

func (f *fakeRepo) CancelForDeletion(ctx context.Context, deletionID, mediaID uuid.UUID) error {
	f.canceled = append(f.canceled, struct{ deletionID, mediaID uuid.UUID }{deletionID, mediaID})
	return nil
}

func TestStartWorkflowResolvesOwnerAndQuote(t *testing.T) {
	owner := uuid.New()
	quoteID := uuid.New()
	mediaID := uuid.New()
	eventID := uuid.New()

	media := &fakeMediaClient{owner: owner}
	billing := &fakeBillingClient{quoteID: quoteID}
	repo := &fakeRepo{}

	svc := workflow.NewService(repo, media, billing, 3)
	err := svc.StartWorkflow(context.Background(), workflow.ProcessingRequested{
		EventID: eventID,
		MediaID: mediaID,
		Options: []string{"summarize"},
	})
	if err != nil {
		t.Fatalf("StartWorkflow: %v", err)
	}

	if repo.created.UserID != owner {
		t.Errorf("CreateWorkflow got UserID %s, want %s", repo.created.UserID, owner)
	}
	if repo.created.QuoteID != quoteID {
		t.Errorf("CreateWorkflow got QuoteID %s, want %s", repo.created.QuoteID, quoteID)
	}
	if repo.created.RequestID != eventID {
		t.Errorf("CreateWorkflow got RequestID %s, want %s", repo.created.RequestID, eventID)
	}
	if billing.gotUser != owner {
		t.Errorf("GetQuote got user %s, want %s", billing.gotUser, owner)
	}
}

func TestStartWorkflowPropagatesMediaClientError(t *testing.T) {
	wantErr := errors.New("media unavailable")
	svc := workflow.NewService(&fakeRepo{}, &fakeMediaClient{err: wantErr}, &fakeBillingClient{}, 3)

	err := svc.StartWorkflow(context.Background(), workflow.ProcessingRequested{MediaID: uuid.New()})
	if !errors.Is(err, wantErr) {
		t.Fatalf("StartWorkflow error = %v, want %v", err, wantErr)
	}
}

func TestStartWorkflowPropagatesBillingClientError(t *testing.T) {
	wantErr := errors.New("billing unavailable")
	svc := workflow.NewService(&fakeRepo{}, &fakeMediaClient{}, &fakeBillingClient{err: wantErr}, 3)

	err := svc.StartWorkflow(context.Background(), workflow.ProcessingRequested{MediaID: uuid.New()})
	if !errors.Is(err, wantErr) {
		t.Fatalf("StartWorkflow error = %v, want %v", err, wantErr)
	}
}

func TestHandleDerivativeReadyIgnoresNonThumbnail(t *testing.T) {
	repo := &fakeRepo{}
	svc := workflow.NewService(repo, &fakeMediaClient{}, &fakeBillingClient{}, 3)

	if err := svc.HandleDerivativeReady(context.Background(), uuid.New(), "cover"); err != nil {
		t.Fatalf("HandleDerivativeReady: %v", err)
	}
	if len(repo.thumbnails) != 0 {
		t.Fatal("a cover derivative must not complete the thumbnail step")
	}
}

func TestHandleDerivativeReadyCompletesThumbnail(t *testing.T) {
	repo := &fakeRepo{}
	svc := workflow.NewService(repo, &fakeMediaClient{}, &fakeBillingClient{}, 3)
	mediaID := uuid.New()

	if err := svc.HandleDerivativeReady(context.Background(), mediaID, "thumbnail"); err != nil {
		t.Fatalf("HandleDerivativeReady: %v", err)
	}
	if len(repo.thumbnails) != 1 || repo.thumbnails[0] != mediaID {
		t.Fatalf("thumbnails = %v, want [%s]", repo.thumbnails, mediaID)
	}
}

func TestExpireTimedOutStepsFailsEachWithTimeoutCode(t *testing.T) {
	repo := &fakeRepo{
		timedOut: []workflow.TimedOutStep{
			{WorkflowID: uuid.New(), MediaID: uuid.New(), StepType: workflow.StepTranscribe, Attempt: 1},
		},
	}
	svc := workflow.NewService(repo, &fakeMediaClient{}, &fakeBillingClient{}, 3)

	if err := svc.ExpireTimedOutSteps(context.Background(), time.Now()); err != nil {
		t.Fatalf("ExpireTimedOutSteps: %v", err)
	}
	if len(repo.failures) != 1 {
		t.Fatalf("failures = %d, want 1", len(repo.failures))
	}
	if repo.failures[0].ErrorCode != "timeout" || !repo.failures[0].Retriable {
		t.Errorf("failure = %+v, want ErrorCode=timeout, Retriable=true", repo.failures[0])
	}
}

func TestScheduleDueRetriesDispatchesEachDueAttempt(t *testing.T) {
	due := workflow.DueRetry{StepID: uuid.New(), WorkflowID: uuid.New(), MediaID: uuid.New(), StepType: workflow.StepSummary, NextAttempt: 2}
	repo := &fakeRepo{due: []workflow.DueRetry{due}}
	svc := workflow.NewService(repo, &fakeMediaClient{}, &fakeBillingClient{}, 3)

	if err := svc.ScheduleDueRetries(context.Background(), time.Now()); err != nil {
		t.Fatalf("ScheduleDueRetries: %v", err)
	}
	if len(repo.dispatched) != 1 || repo.dispatched[0] != due {
		t.Fatalf("dispatched = %v, want [%v]", repo.dispatched, due)
	}
}

func TestHandleDeletionRequestedCancelsWorkflow(t *testing.T) {
	repo := &fakeRepo{}
	svc := workflow.NewService(repo, &fakeMediaClient{}, &fakeBillingClient{}, 3)
	deletionID, mediaID := uuid.New(), uuid.New()

	if err := svc.HandleDeletionRequested(context.Background(), deletionID, mediaID); err != nil {
		t.Fatalf("HandleDeletionRequested: %v", err)
	}
	if len(repo.canceled) != 1 || repo.canceled[0].deletionID != deletionID || repo.canceled[0].mediaID != mediaID {
		t.Fatalf("canceled = %v, want one entry for (%s, %s)", repo.canceled, deletionID, mediaID)
	}
}
