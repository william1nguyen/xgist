// Package clients holds conductor's outbound gRPC clients. conductor has
// no gRPC server of its own (architecture.md's gRPC boundaries section
// lists only hermes and conductor-worker as callers), but StartWorkflow
// needs media's owner id and billing's quote to request a credit
// reservation — see "Key design decisions" #2 in the implementation plan.
package clients

import (
	"context"
	"fmt"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	mediav1 "github.com/nolannguyen1212/media-notes/contracts/gen/go/media_notes/media/v1"
	"github.com/nolannguyen1212/media-notes/services/conductor/internal/workflow"

	"github.com/google/uuid"
)

// MediaClient calls media's gRPC API. It implements workflow.MediaClient.
type MediaClient struct {
	client mediav1.MediaServiceClient
	conn   *grpc.ClientConn
}

// NewMediaClient dials addr (media's gRPC listener) and returns a
// MediaClient. The connection is not authenticated: every v2 service
// currently talks over the internal docker-compose network without TLS,
// matching how content/media/billing expose gRPC today.
func NewMediaClient(addr string) (*MediaClient, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("dial media at %s: %w", addr, err)
	}
	return &MediaClient{client: mediav1.NewMediaServiceClient(conn), conn: conn}, nil
}

// Close closes the underlying gRPC connection.
func (c *MediaClient) Close() error {
	return c.conn.Close()
}

// GetMedia implements workflow.MediaClient.
func (c *MediaClient) GetMedia(ctx context.Context, mediaID uuid.UUID) (workflow.MediaInfo, error) {
	resp, err := c.client.GetMedia(ctx, &mediav1.GetMediaRequest{MediaId: mediaID.String()})
	if err != nil {
		return workflow.MediaInfo{}, fmt.Errorf("media.GetMedia: %w", err)
	}
	owner, err := uuid.Parse(resp.GetMedia().GetOwnerId())
	if err != nil {
		return workflow.MediaInfo{}, fmt.Errorf("media.GetMedia returned an invalid owner_id: %w", err)
	}
	return workflow.MediaInfo{OwnerID: owner, MediaType: mediaTypeToString(resp.GetMedia().GetMediaType())}, nil
}

func mediaTypeToString(t mediav1.MediaType) string {
	switch t {
	case mediav1.MediaType_MEDIA_TYPE_VIDEO:
		return "video"
	case mediav1.MediaType_MEDIA_TYPE_AUDIO:
		return "audio"
	default:
		return ""
	}
}

var _ workflow.MediaClient = (*MediaClient)(nil)
