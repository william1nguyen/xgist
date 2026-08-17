// Package objectstore wraps the MinIO/S3 client content uses to presign
// read-only URLs for summary-audio objects it owns the metadata of but
// never stores the bytes of, per ADR 0001. Read-only: unlike media's
// objectstore, content never writes or deletes objects — the worker owns
// the write, content only signs a GET for playback.
package objectstore

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// Client presigns GET URLs for objects in one bucket.
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

// PresignGetObject returns a short-lived URL for reading objectKey
// directly from object storage.
func (c *Client) PresignGetObject(ctx context.Context, objectKey string, expires time.Duration) (string, error) {
	u, err := c.minio.PresignedGetObject(ctx, c.bucket, objectKey, expires, url.Values{})
	if err != nil {
		return "", fmt.Errorf("presign get object: %w", err)
	}
	return u.String(), nil
}
