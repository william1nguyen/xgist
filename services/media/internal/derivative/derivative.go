// Package derivative owns generated derivative objects (thumbnail, cover,
// waveform) and their metadata, registered by conductor-worker after it
// writes the derivative bytes to object storage, per
// docs/architecture.md's "media list and thumbnail delivery" flow.
package derivative

import (
	"context"
	"errors"
	"fmt"
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
	ErrNotFound        = errors.New("derivative: not found")
	ErrMediaNotFound   = errors.New("derivative: media not found")
	ErrUnsupportedMime = errors.New("derivative: unsupported mime type")
)

// allowedImageMimeTypes maps every accepted custom-derivative image MIME
// type to its file extension. Only used by RequestUpload — worker's own
// generated derivatives (thumbnail JPEGs, etc.) never go through this
// path, so this is deliberately narrower than the video/audio source
// allow-list in internal/upload.
var allowedImageMimeTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

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

// ObjectSigner signs short-lived URLs for reading and writing an object.
// objectstore.Client implements it.
type ObjectSigner interface {
	PresignGetObject(ctx context.Context, objectKey string, expires time.Duration) (string, error)
	PresignPutObject(ctx context.Context, objectKey string, expires time.Duration) (string, error)
}

// Service registers derivatives and signs thumbnail read/upload URLs.
type Service struct {
	repo         Repository
	signer       ObjectSigner
	urlTTL       time.Duration
	uploadURLTTL time.Duration
}

// NewService returns a Service. urlTTL is the lifetime applied to every
// signed read URL; uploadURLTTL to every signed upload (PUT) URL returned
// by RequestUpload.
func NewService(repo Repository, signer ObjectSigner, urlTTL, uploadURLTTL time.Duration) *Service {
	return &Service{repo: repo, signer: signer, urlTTL: urlTTL, uploadURLTTL: uploadURLTTL}
}

// RegisterDerivative records a durable derivative object's metadata.
func (s *Service) RegisterDerivative(ctx context.Context, in NewDerivative) (Derivative, error) {
	return s.repo.Register(ctx, in)
}

// RequestUpload returns a fresh object key and a short-lived presigned PUT
// URL for a caller-supplied derivative image. It does not touch the
// database: the caller PUTs the file, then calls RegisterDerivative with
// the returned object key (at a version high enough to outrank any
// worker-generated derivative — worker's own thumbnail step always
// registers at version 1) to finalize it.
func (s *Service) RequestUpload(ctx context.Context, mediaID uuid.UUID, derivativeType Type, mimeType string) (objectKey, uploadURL string, expiresAt time.Time, err error) {
	ext, ok := allowedImageMimeTypes[mimeType]
	if !ok {
		return "", "", time.Time{}, fmt.Errorf("%w: %s", ErrUnsupportedMime, mimeType)
	}

	objectKey = fmt.Sprintf("media/%s/%s/%s%s", mediaID, derivativeType, uuid.New(), ext)
	expiresAt = time.Now().Add(s.uploadURLTTL)
	uploadURL, err = s.signer.PresignPutObject(ctx, objectKey, s.uploadURLTTL)
	if err != nil {
		return "", "", time.Time{}, err
	}
	return objectKey, uploadURL, expiresAt, nil
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
