// Package derivative owns generated derivative objects (thumbnail, cover,
// waveform) and their metadata, registered by conductor-worker after it
// writes the derivative bytes to object storage, per
// docs/architecture.md's "media list and thumbnail delivery" flow.
package derivative

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// Type is the kind of a generated derivative object.
type Type string

const (
	TypeThumbnail Type = "thumbnail"
	TypeCover     Type = "cover"
	TypeWaveform  Type = "waveform"
)

// Status is the lifecycle state of one derivative.
type Status string

const (
	StatusPending Status = "pending"
	StatusReady   Status = "ready"
	StatusFailed  Status = "failed"
)

// Derivative is one generated derivative object's metadata. It never
// carries object bytes.
type Derivative struct {
	ID             uuid.UUID
	MediaID        uuid.UUID
	DerivativeType Type
	Version        int
	ObjectKey      string
	MimeType       string
	Width          int
	Height         int
	SizeBytes      int64
	Status         Status
}

// NewDerivative is the input to RegisterDerivative.
type NewDerivative struct {
	MediaID        uuid.UUID
	DerivativeType Type
	Version        int
	ObjectKey      string
	MimeType       string
	Width          int
	Height         int
	SizeBytes      int64
}

var (
	ErrNotFound      = errors.New("derivative: not found")
	ErrMediaNotFound = errors.New("derivative: media not found")
)

// Repository is the persistence boundary Service depends on. It is
// implemented by internal/store.
type Repository interface {
	// Register atomically inserts a derivative row and the
	// mn.media.derivative.ready.v1 outbox event, or returns the existing
	// row without republishing when (media_id, derivative_type, version)
	// was already registered.
	Register(ctx context.Context, in NewDerivative) (Derivative, error)
	// FindLatestReady returns the highest-version ready derivative of
	// derivativeType for mediaID.
	FindLatestReady(ctx context.Context, mediaID uuid.UUID, derivativeType Type) (Derivative, error)
}

// ObjectSigner signs a short-lived URL for reading an object.
// objectstore.Client implements it.
type ObjectSigner interface {
	PresignGetObject(ctx context.Context, objectKey string, expires time.Duration) (string, error)
}

// Service registers derivatives and signs thumbnail URLs.
type Service struct {
	repo   Repository
	signer ObjectSigner
	urlTTL time.Duration
}

// NewService returns a Service. urlTTL is the lifetime applied to every
// signed thumbnail URL.
func NewService(repo Repository, signer ObjectSigner, urlTTL time.Duration) *Service {
	return &Service{repo: repo, signer: signer, urlTTL: urlTTL}
}

// RegisterDerivative records a durable derivative object's metadata.
func (s *Service) RegisterDerivative(ctx context.Context, in NewDerivative) (Derivative, error) {
	return s.repo.Register(ctx, in)
}

// SignThumbnailURL returns a short-lived signed URL for mediaID's latest
// ready thumbnail derivative. ok is false when no ready thumbnail exists
// yet, which is not an error: the Web client shows a placeholder while
// thumbnail_status is pending, per docs/architecture.md.
func (s *Service) SignThumbnailURL(ctx context.Context, mediaID uuid.UUID) (url string, ok bool, err error) {
	d, err := s.repo.FindLatestReady(ctx, mediaID, TypeThumbnail)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return "", false, nil
		}
		return "", false, err
	}
	url, err = s.signer.PresignGetObject(ctx, d.ObjectKey, s.urlTTL)
	if err != nil {
		return "", false, err
	}
	return url, true, nil
}
