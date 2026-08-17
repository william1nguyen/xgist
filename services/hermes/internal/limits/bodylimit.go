package limits

import (
	"bytes"
	"errors"
	"io"
	"net/http"
)

// BodyLimitMiddleware rejects a request body larger than maxBytes with
// 413 Request Entity Too Large, per ADR 0004's 1 MiB GraphQL body limit.
// It reads and re-buffers the body up front so downstream handlers (the
// GraphQL executor) see an ordinary, already-validated io.Reader.
func BodyLimitMiddleware(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Body == nil {
				next.ServeHTTP(w, r)
				return
			}

			body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBytes))
			if err != nil {
				var tooLarge *http.MaxBytesError
				if errors.As(err, &tooLarge) {
					http.Error(w, "request body exceeds the 1 MiB limit", http.StatusRequestEntityTooLarge)
					return
				}
				http.Error(w, "failed to read request body", http.StatusBadRequest)
				return
			}

			r.Body = io.NopCloser(bytes.NewReader(body))
			r.ContentLength = int64(len(body))
			next.ServeHTTP(w, r)
		})
	}
}
