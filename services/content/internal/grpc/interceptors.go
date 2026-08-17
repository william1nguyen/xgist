package grpcserver

import (
	"context"
	"log/slog"
	"runtime/debug"
	"time"

	"github.com/google/uuid"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

// correlationIDMetadataKey is the gRPC metadata key callers may set to
// correlate a request across services; content generates one when a
// caller omits it.
const correlationIDMetadataKey = "x-correlation-id"

// UnaryLoggingInterceptor logs each unary RPC's method, correlation id,
// duration, and resulting status code.
func UnaryLoggingInterceptor(logger *slog.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		correlationID := correlationIDFromContext(ctx)
		start := time.Now()

		resp, err := handler(ctx, req)

		logger.InfoContext(ctx, "grpc request",
			"method", info.FullMethod,
			"correlation_id", correlationID,
			"duration_ms", time.Since(start).Milliseconds(),
			"code", status.Code(err).String(),
		)
		return resp, err
	}
}

// UnaryRecoveryInterceptor converts a panic in the handler chain into an
// Internal error instead of crashing the process.
func UnaryRecoveryInterceptor(logger *slog.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (resp any, err error) {
		defer func() {
			if p := recover(); p != nil {
				logger.ErrorContext(ctx, "grpc handler panic",
					"method", info.FullMethod, "panic", p, "stack", string(debug.Stack()))
				err = status.Error(codes.Internal, "internal error")
			}
		}()
		return handler(ctx, req)
	}
}

func correlationIDFromContext(ctx context.Context) string {
	if md, ok := metadata.FromIncomingContext(ctx); ok {
		if vals := md.Get(correlationIDMetadataKey); len(vals) > 0 && vals[0] != "" {
			return vals[0]
		}
	}
	return uuid.NewString()
}
