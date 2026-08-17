package server

import (
	"context"
	"errors"
	"log/slog"
	"math"

	gqlgenruntime "github.com/99designs/gqlgen/graphql"
	"github.com/vektah/gqlparser/v2/gqlerror"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/nolannguyen1212/media-notes/services/hermes/internal/auth"
	graphqlpkg "github.com/nolannguyen1212/media-notes/services/hermes/internal/graphql"
)

// errorPresenter maps a resolver error to a safe GraphQL error, per
// docs/services/hermes.md: "A dependency failure is surfaced as a safe
// GraphQL error; never leak transport/internal details." An error that
// carries a gRPC status (every downstream client wraps its calls with
// one) is translated by code; an unexpected one is logged server-side and
// replaced with a generic message.
func errorPresenter(logger *slog.Logger) gqlgenruntime.ErrorPresenterFunc {
	return func(ctx context.Context, err error) *gqlerror.Error {
		gqlErr := gqlgenruntime.DefaultErrorPresenter(ctx, err)

		switch {
		case errors.Is(err, auth.ErrUnauthenticated):
			return withCode(gqlErr, "UNAUTHENTICATED", "authentication required")
		case errors.Is(err, graphqlpkg.ErrNotFound):
			return withCode(gqlErr, "NOT_FOUND", "not found")
		}

		var rateLimitErr *graphqlpkg.RateLimitError
		if errors.As(err, &rateLimitErr) {
			gqlErr = withCode(gqlErr, "RATE_LIMITED", "rate limit exceeded")
			gqlErr.Extensions["retryAfterSeconds"] = int(math.Ceil(rateLimitErr.RetryAfter.Seconds()))
			return gqlErr
		}

		if st, ok := status.FromError(err); ok {
			switch st.Code() {
			case codes.NotFound:
				return withCode(gqlErr, "NOT_FOUND", "not found")
			case codes.AlreadyExists:
				return withCode(gqlErr, "ALREADY_EXISTS", st.Message())
			case codes.InvalidArgument:
				return withCode(gqlErr, "BAD_USER_INPUT", st.Message())
			case codes.FailedPrecondition:
				return withCode(gqlErr, "FAILED_PRECONDITION", st.Message())
			case codes.Unauthenticated:
				return withCode(gqlErr, "UNAUTHENTICATED", "authentication required")
			default:
				logger.ErrorContext(ctx, "downstream grpc error", "error", err, "code", st.Code())
				return withCode(gqlErr, "INTERNAL", "internal error")
			}
		}

		// Not a gRPC status: every resolver-authored validation error
		// (uuid parsing, id-count bounds) reaches here and its message is
		// safe to return as-is.
		return withCode(gqlErr, "BAD_USER_INPUT", err.Error())
	}
}

func withCode(err *gqlerror.Error, code, message string) *gqlerror.Error {
	err.Message = message
	if err.Extensions == nil {
		err.Extensions = map[string]any{}
	}
	err.Extensions["code"] = code
	return err
}
