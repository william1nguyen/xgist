// Package workflow owns conductor's workflow state machine: selected
// outputs, steps, dependencies, attempts, retry scheduling, timeout state,
// and joins, per docs/services/conductor.md. It never runs AI, downloads
// media, stores generated content, or mutates credit balances directly —
// those stay in conductor-worker, content, and billing.
package workflow

import (
	"context"
	"errors"
	"sort"
	"time"

	"github.com/google/uuid"
)

// ErrNotFound is returned by internal/store lookups for a workflow or
// step that does not exist. Every Repository method treats it as a
// harmless no-op (an unknown id can only mean a stale or foreign event),
// never as a caller-facing failure.
var ErrNotFound = errors.New("workflow: not found")

// State is a workflow's lifecycle state.
type State string

const (
	StateReservingCredit State = "reserving_credit"
	StateRunning         State = "running"
	StateCompleted       State = "completed"
	StateFailed          State = "failed"
	StateCanceled        State = "canceled"
)

// StepState is one workflow step's lifecycle state.
type StepState string

const (
	// StepStatePending is a step not yet dispatched: waiting on a
	// dependency (or, for the first billable step, on credit reservation).
	StepStatePending        StepState = "pending"
	StepStateDispatched     StepState = "dispatched"
	StepStateCompleted      StepState = "completed"
	StepStateFailed         StepState = "failed"
	StepStateRetryScheduled StepState = "retry_scheduled"
)

// Step type constants. These values must match content's Step* constants
// (services/content/internal/content/content.go) and worker's step-kind
// dispatch keys (services/worker/src/dispatch.py) exactly: they travel as
// the "step" field on mn.processing.step.requested.v1 and
// mn.processing.step.completed.v1.
const (
	StepTranscribe   = "transcribe"
	StepSummary      = "summary"
	StepKeywords     = "keywords"
	StepKeypoints    = "keypoints"
	StepNotes        = "notes"
	StepSummaryAudio = "summary_audio"
	// StepThumbnail has no billing item and does not gate workflow
	// completion — architecture.md schedules it independently of any
	// user-selected option, and the media list never blocks on it.
	StepThumbnail = "generate_thumbnail"
)

// optionToStep maps a caller-selected processing option (ADR 0008's
// catalog item id, as carried on mn.media.processing.requested.v1) to the
// step it enables.
var optionToStep = map[string]string{
	"transcribe":             StepTranscribe,
	"summarize":              StepSummary,
	"extract_keywords":       StepKeywords,
	"extract_keypoints":      StepKeypoints,
	"generate_notes":         StepNotes,
	"generate_audio_summary": StepSummaryAudio,
}

// stepToItem is optionToStep's inverse, used to price and settle a step
// against billing's catalog. generate_thumbnail is intentionally absent:
// it is not a priced item.
var stepToItem = map[string]string{
	StepTranscribe:   "transcribe",
	StepSummary:      "summarize",
	StepKeywords:     "extract_keywords",
	StepKeypoints:    "extract_keypoints",
	StepNotes:        "generate_notes",
	StepSummaryAudio: "generate_audio_summary",
}

// stepDependsOn declares each step's required predecessors. A step absent
// from this map has no dependency and is dispatched as soon as credit is
// reserved (or immediately, for generate_thumbnail).
var stepDependsOn = map[string][]string{
	StepSummary:      {StepTranscribe},
	StepKeywords:     {StepTranscribe},
	StepKeypoints:    {StepTranscribe},
	StepNotes:        {StepTranscribe},
	StepSummaryAudio: {StepSummary},
}

// BillingItemID returns the ADR 0008 catalog item id billed for stepType,
// and false for a step with no billing item (generate_thumbnail).
func BillingItemID(stepType string) (itemID string, billable bool) {
	itemID, billable = stepToItem[stepType]
	return itemID, billable
}

// StepPlan is one step CreateWorkflow will persist.
type StepPlan struct {
	StepType  string
	Required  bool
	DependsOn []string
}

// PlanSteps resolves a processing request's selected options into the
// full set of steps a new workflow needs, in a deterministic order.
// transcribe is included only when the caller selected it: the initial
// ConfirmUpload request always selects it (nothing exists yet), but a
// later regenerate request only selects it when the media item doesn't
// already have a transcript — callers must not select it, and must not
// be billed or re-run it, when one already exists. generate_thumbnail is
// added independently of any selected option, per architecture.md.
// Selecting generate_audio_summary implicitly selects summary too, since
// the audio step reads committed summary text as its input
// (architecture.md's "summary audio" flow) — unlike transcribe, this one
// stays forced as a safety net regardless of caller intent, since a
// caller could otherwise request unbillable, unrunnable audio.
//
// generate_thumbnail is omitted for audio media: architecture.md's
// worker algorithm only extracts a video frame; audio's cover-art/
// waveform fallback isn't implemented (worker's
// providers/thumbnail.py), so dispatching it for audio would only ever
// time out. mediaType is whatever media.GetMedia reports; any value
// other than "video" is treated as non-video.
func PlanSteps(options []string, mediaType string) []StepPlan {
	selected := map[string]bool{}
	for _, opt := range options {
		if step, ok := optionToStep[opt]; ok {
			selected[step] = true
		}
	}
	if selected[StepSummaryAudio] {
		selected[StepSummary] = true
	}

	plans := make([]StepPlan, 0, len(selected)+1)
	for step := range selected {
		plans = append(plans, StepPlan{StepType: step, Required: true, DependsOn: stepDependsOn[step]})
	}
	if mediaType == "video" {
		plans = append(plans, StepPlan{StepType: StepThumbnail, Required: false})
	}

	sort.Slice(plans, func(i, j int) bool { return plans[i].StepType < plans[j].StepType })
	return plans
}

// BillableOptions returns the ADR 0008 catalog item ids billing must
// price for plans, in the same deterministic order as plans.
func BillableOptions(plans []StepPlan) []string {
	items := make([]string, 0, len(plans))
	for _, p := range plans {
		if item, ok := BillingItemID(p.StepType); ok {
			items = append(items, item)
		}
	}
	return items
}

// Workflow is one media item's processing workflow. There is no
// workflow-level deadline: only individual steps have a deadline
// (Step.DeadlineAt), which ExpireTimedOutSteps sweeps.
type Workflow struct {
	ID      uuid.UUID
	MediaID uuid.UUID
	// AudioVoice overrides the worker's default TTS voice for this
	// workflow's generate_audio_summary step, if selected. Empty means
	// "use the worker's default".
	AudioVoice string
	// PromptOverrides maps a selected option id (e.g. "summarize") to a
	// custom instruction string worker appends to that step's LLM prompt.
	PromptOverrides map[string]string
	RequestID       uuid.UUID
	UserID          uuid.UUID
	State           State
	QuoteID         uuid.UUID
	Version         int64
	StartedAt       time.Time
	CompletedAt     *time.Time
}

// Step is one step of a workflow.
type Step struct {
	ID             uuid.UUID
	WorkflowID     uuid.UUID
	StepType       string
	Required       bool
	State          StepState
	CurrentAttempt int
	DeadlineAt     *time.Time
}

// ProcessingRequested is media's mn.media.processing.requested.v1 payload.
// EventID doubles as the workflow's request_id: media does not carry a
// separate processing_request id on this event, and event_id is already
// the field this and every other consumer dedups on.
type ProcessingRequested struct {
	EventID         uuid.UUID
	MediaID         uuid.UUID
	Options         []string
	AudioVoice      string
	PromptOverrides map[string]string
}

// NewWorkflow is the input to Repository.CreateWorkflow.
type NewWorkflow struct {
	RequestID       uuid.UUID
	MediaID         uuid.UUID
	UserID          uuid.UUID
	QuoteID         uuid.UUID
	AudioVoice      string
	PromptOverrides map[string]string
	Steps           []StepPlan
}

// StepCompletion is the input to Repository.CompleteStep, decoded from
// mn.processing.step.completed.v1.
type StepCompletion struct {
	EventID    uuid.UUID
	WorkflowID uuid.UUID
	MediaID    uuid.UUID
	StepType   string
	Attempt    int
}

// StepFailure is the input to Repository.FailStep, decoded from
// mn.processing.step.failed.v1 or synthesized by ExpireTimedOutSteps.
// Source* fields identify the Kafka record that reported the failure, so
// FailStep can copy them onto a DLQ record (ADR 0003) if the failure
// turns out to be terminal; they are zero for a timeout, which has no
// backing Kafka message.
type StepFailure struct {
	EventID    uuid.UUID
	WorkflowID uuid.UUID
	MediaID    uuid.UUID
	StepType   string
	Attempt    int
	ErrorCode  string
	Retriable  bool

	SourceTopic     string
	SourcePartition int
	SourceOffset    int64
	SourceKey       string
}

// DueRetry is one step_attempts row ScheduleDueRetries found ready to
// redispatch.
type DueRetry struct {
	StepID      uuid.UUID
	WorkflowID  uuid.UUID
	MediaID     uuid.UUID
	StepType    string
	NextAttempt int
}

// TimedOutStep is one dispatched step ExpireTimedOutSteps found past its
// deadline.
type TimedOutStep struct {
	WorkflowID uuid.UUID
	MediaID    uuid.UUID
	StepType   string
	Attempt    int
}

const (
	dueRetryBatchSize = 50
	timeoutBatchSize  = 50
)

// MediaInfo is the subset of media.GetMedia's response Service needs to
// start a workflow.
type MediaInfo struct {
	OwnerID uuid.UUID
	// MediaType is "audio" or "video", used by PlanSteps to decide
	// whether generate_thumbnail applies.
	MediaType string
}

// MediaClient resolves owner and media-type for a media item. It is the
// gRPC-backed piece of the plan's "conductor needs GetMedia" decision;
// internal/clients implements it.
type MediaClient interface {
	GetMedia(ctx context.Context, mediaID uuid.UUID) (MediaInfo, error)
}

// BillingClient prices a workflow's selected options into a quote.
// internal/clients implements it. idempotencyKey is required by
// billing.proto's GetQuoteRequest; billing's current implementation
// doesn't deduplicate by it (each call mints a new, independently
// expiring quote), but conductor supplies a stable value derived from the
// processing request anyway, for billing's future use and for tracing a
// retried StartWorkflow call back to the request that caused it.
type BillingClient interface {
	GetQuote(ctx context.Context, userID uuid.UUID, options []string, idempotencyKey string) (quoteID uuid.UUID, err error)
}

// Repository is the persistence boundary Service depends on. It is
// implemented by internal/store. Every method commits its state
// transition and any resulting outbox event(s) in one transaction, and is
// idempotent for redelivery of the same logical command/event.
type Repository interface {
	// CreateWorkflow persists a new workflow and its steps/dependencies,
	// immediately dispatches generate_thumbnail (unbilled), and publishes
	// the credit reserve command — all in one transaction. A duplicate
	// call for an already-known RequestID (or MediaID, which is also
	// unique) returns the existing workflow without recreating or
	// republishing anything.
	CreateWorkflow(ctx context.Context, in NewWorkflow) (Workflow, error)

	// ApplyCreditDecision transitions a reserving_credit workflow to
	// running (dispatching the transcribe step) on accepted=true, or to
	// failed (publishing status.changed) on accepted=false. Deduplicated
	// by eventID; a workflow no longer in reserving_credit state is a
	// no-op.
	ApplyCreditDecision(ctx context.Context, eventID, workflowID uuid.UUID, accepted bool) error

	// CompleteStep marks in's step completed if its attempt matches the
	// step's current outstanding attempt (stale or already-applied
	// attempts are ignored, per architecture.md), settles its billing
	// item if it has one, dispatches any dependent step whose
	// dependencies are now all satisfied, and completes the workflow once
	// every required step is done.
	CompleteStep(ctx context.Context, in StepCompletion) error

	// FailStep records a failed attempt for in's step if its attempt
	// matches the step's current outstanding attempt. A retriable
	// failure with attempts remaining (in.Attempt < maxAttempts) is
	// persisted as retry_scheduled with a computed retry_at; otherwise
	// the step and workflow are marked failed, a DLQ record is
	// published, and the credit reservation remainder is released.
	FailStep(ctx context.Context, in StepFailure, maxAttempts int) error

	// CompleteThumbnail marks generate_thumbnail completed for mediaID's
	// active workflow. It never affects billing or workflow completion.
	CompleteThumbnail(ctx context.Context, mediaID uuid.UUID) error

	// DueRetries returns up to limit step_attempts rows in
	// retry_scheduled state whose retry_at is at or before now.
	DueRetries(ctx context.Context, now time.Time, limit int) ([]DueRetry, error)
	// DispatchRetry persists due's next attempt and its outbox
	// step.requested event in one transaction; the existing outbox relay
	// publishes it. maxAttempts bounds how many attempts DispatchRetry
	// will create before treating the step as exhausted.
	DispatchRetry(ctx context.Context, due DueRetry, maxAttempts int) error

	// TimedOutSteps returns up to limit dispatched steps whose deadline
	// has passed.
	TimedOutSteps(ctx context.Context, now time.Time, limit int) ([]TimedOutStep, error)

	// CancelForDeletion cancels any in-flight workflow for mediaID,
	// releases its credit reservation remainder, and publishes
	// mn.conductor.deletion.completed.v1. Idempotent per deletionID.
	CancelForDeletion(ctx context.Context, deletionID, mediaID uuid.UUID) error
}

// Service orchestrates workflow operations: it resolves external inputs
// (owning user, priced quote) through MediaClient/BillingClient and
// delegates every durable state transition to Repository, which performs
// it transactionally.
type Service struct {
	repo        Repository
	media       MediaClient
	billing     BillingClient
	maxAttempts int
}

// NewService returns a Service. maxAttempts bounds retry scheduling (see
// ScheduleDueRetries).
func NewService(repo Repository, media MediaClient, billing BillingClient, maxAttempts int) *Service {
	return &Service{repo: repo, media: media, billing: billing, maxAttempts: maxAttempts}
}

// StartWorkflow begins one media item's processing workflow: resolves its
// owner and a priced quote for the selected options, then persists the
// workflow and its steps. Idempotent per req.EventID (used as request_id).
func (s *Service) StartWorkflow(ctx context.Context, req ProcessingRequested) error {
	media, err := s.media.GetMedia(ctx, req.MediaID)
	if err != nil {
		return err
	}

	steps := PlanSteps(req.Options, media.MediaType)

	quoteID, err := s.billing.GetQuote(ctx, media.OwnerID, BillableOptions(steps), "quote:"+req.EventID.String())
	if err != nil {
		return err
	}

	_, err = s.repo.CreateWorkflow(ctx, NewWorkflow{
		RequestID:       req.EventID,
		MediaID:         req.MediaID,
		UserID:          media.OwnerID,
		QuoteID:         quoteID,
		AudioVoice:      req.AudioVoice,
		PromptOverrides: req.PromptOverrides,
		Steps:           steps,
	})
	return err
}

// HandleCreditReserved applies billing's reservation decision for one
// workflow.
func (s *Service) HandleCreditReserved(ctx context.Context, eventID, workflowID uuid.UUID, accepted bool) error {
	return s.repo.ApplyCreditDecision(ctx, eventID, workflowID, accepted)
}

// HandleStepCompleted applies a worker/content-reported step completion.
func (s *Service) HandleStepCompleted(ctx context.Context, in StepCompletion) error {
	return s.repo.CompleteStep(ctx, in)
}

// HandleStepFailed applies a worker-reported step failure.
func (s *Service) HandleStepFailed(ctx context.Context, in StepFailure) error {
	return s.repo.FailStep(ctx, in, s.maxAttempts)
}

// HandleDerivativeReady applies media's derivative-ready event.
// Non-thumbnail derivatives (cover, waveform) are not tracked as workflow
// steps and are ignored here.
func (s *Service) HandleDerivativeReady(ctx context.Context, mediaID uuid.UUID, derivativeType string) error {
	if derivativeType != "thumbnail" {
		return nil
	}
	return s.repo.CompleteThumbnail(ctx, mediaID)
}

// ScheduleDueRetries redispatches every step_attempts row whose retry_at
// has passed as of now.
func (s *Service) ScheduleDueRetries(ctx context.Context, now time.Time) error {
	due, err := s.repo.DueRetries(ctx, now, dueRetryBatchSize)
	if err != nil {
		return err
	}
	for _, d := range due {
		if err := s.repo.DispatchRetry(ctx, d, s.maxAttempts); err != nil {
			return err
		}
	}
	return nil
}

// ExpireTimedOutSteps applies the retry-or-fail policy to every dispatched
// step whose deadline has passed as of now, the same way a reported
// failure would.
func (s *Service) ExpireTimedOutSteps(ctx context.Context, now time.Time) error {
	steps, err := s.repo.TimedOutSteps(ctx, now, timeoutBatchSize)
	if err != nil {
		return err
	}
	for _, st := range steps {
		err := s.repo.FailStep(ctx, StepFailure{
			EventID:    uuid.New(),
			WorkflowID: st.WorkflowID,
			MediaID:    st.MediaID,
			StepType:   st.StepType,
			Attempt:    st.Attempt,
			ErrorCode:  "timeout",
			Retriable:  true,
		}, s.maxAttempts)
		if err != nil {
			return err
		}
	}
	return nil
}

// HandleDeletionRequested cancels mediaID's workflow, if any, as
// conductor's participant role in media's per-media deletion flow (ADR
// 0006).
func (s *Service) HandleDeletionRequested(ctx context.Context, deletionID, mediaID uuid.UUID) error {
	return s.repo.CancelForDeletion(ctx, deletionID, mediaID)
}
