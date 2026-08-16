// Package objectstore wraps the MinIO/S3 client media uses for presigned
// upload and playback URLs and for authoritative object metadata and
// deletion. Media bytes never pass through this service's gRPC, Kafka, or
// database layers; only object keys and metadata do, per ADR 0001 and
// ADR 0004.
package objectstore

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// ErrObjectMissing is returned when an object key has no corresponding
// object in the bucket.
var ErrObjectMissing = errors.New("objectstore: object missing")

// ObjectInfo is the authoritative metadata media reads from object storage
// on upload confirmation, per ADR 0004: declared MIME type and size are
// untrusted until checked against this.
type ObjectInfo struct {
	SizeBytes   int64
	ContentType string
	ETag        string
}

// Client presigns and inspects objects in one bucket.
type Client struct {
	minio  *minio.Client
	bucket string
}

// New returns a Client for the bucket on the given MinIO/S3-compatible
// endpoint.
func New(endpoint, accessKey, secretKey string, useSSL bool, bucket string) (*Client, error) {
	c, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("new minio client: %w", err)
	}
	return &Client{minio: c, bucket: bucket}, nil
}

// PresignPutObject returns a short-lived URL the caller can PUT the object
// bytes to directly, keeping media bytes off the application server.
func (c *Client) PresignPutObject(ctx context.Context, objectKey string, expires time.Duration) (string, error) {
	u, err := c.minio.PresignedPutObject(ctx, c.bucket, objectKey, expires)
	if err != nil {
		return "", fmt.Errorf("presign put object: %w", err)
	}
	return u.String(), nil
}

// PresignGetObject returns a short-lived URL for reading the object
// directly from object storage.
func (c *Client) PresignGetObject(ctx context.Context, objectKey string, expires time.Duration) (string, error) {
	u, err := c.minio.PresignedGetObject(ctx, c.bucket, objectKey, expires, url.Values{})
	if err != nil {
		return "", fmt.Errorf("presign get object: %w", err)
	}
	return u.String(), nil
}

// StatObject returns authoritative metadata for objectKey, or
// ErrObjectMissing if no such object exists.
func (c *Client) StatObject(ctx context.Context, objectKey string) (ObjectInfo, error) {
	info, err := c.minio.StatObject(ctx, c.bucket, objectKey, minio.StatObjectOptions{})
	if err != nil {
		if isNotFound(err) {
			return ObjectInfo{}, ErrObjectMissing
		}
		return ObjectInfo{}, fmt.Errorf("stat object: %w", err)
	}
	return ObjectInfo{SizeBytes: info.Size, ContentType: info.ContentType, ETag: info.ETag}, nil
}

// RemoveObject deletes objectKey. A missing object is treated as an
// idempotent success, per ADR 0006's "a missing row or object is treated
// as an idempotent success."
func (c *Client) RemoveObject(ctx context.Context, objectKey string) error {
	err := c.minio.RemoveObject(ctx, c.bucket, objectKey, minio.RemoveObjectOptions{})
	if err != nil && !isNotFound(err) {
		return fmt.Errorf("remove object: %w", err)
	}
	return nil
}

func isNotFound(err error) bool {
	resp := minio.ToErrorResponse(err)
	return resp.Code == "NoSuchKey" || resp.Code == "NotFound"
}
