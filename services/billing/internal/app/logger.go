package app

import (
	"log/slog"
	"os"
)

// NewLogger returns a JSON slog.Logger at the given level ("debug", "info",
// "warn", or "error"; unrecognized values fall back to "info").
func NewLogger(level string) *slog.Logger {
	var lvl slog.Level
	switch level {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl})
	return slog.New(handler).With("service", "billing")
}
