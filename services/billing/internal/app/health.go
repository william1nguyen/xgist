package app

import (
	"net/http"
	"sync/atomic"
)

// Health tracks liveness and readiness for the HTTP health endpoints.
// Liveness is true once the process is up; readiness flips to true only
// after migrations have applied and the database is reachable.
type Health struct {
	ready atomic.Bool
}

// NewHealth returns a Health that is live but not yet ready.
func NewHealth() *Health {
	return &Health{}
}

// SetReady marks the service ready or not ready for traffic.
func (h *Health) SetReady(ready bool) {
	h.ready.Store(ready)
}

// Ready reports whether the service is currently ready.
func (h *Health) Ready() bool {
	return h.ready.Load()
}

// RegisterOn attaches the /health/live and /health/ready handlers to mux.
func (h *Health) RegisterOn(mux *http.ServeMux) {
	mux.HandleFunc("GET /health/live", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	mux.HandleFunc("GET /health/ready", func(w http.ResponseWriter, r *http.Request) {
		if !h.Ready() {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	})
}
