// Package app holds media's process-level concerns: configuration,
// logging, and health state.
package app

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config is media's runtime configuration, loaded from the environment.
type Config struct {
	HTTPAddr     string
	GRPCAddr     string
	DatabaseURL  string
	KafkaBrokers []string

	MinIOEndpoint  string
	MinIOAccessKey string
	MinIOSecretKey string
	MinIOUseSSL    bool
	MediaBucket    string

	// MaxSourceSizeBytes and MaxDurationMs are the launch guardrails from
	// ADR 0004 (500 MiB, 4 hours). Duration is enforced later, once
	// conductor-worker probes the source; media only records it here.
	MaxSourceSizeBytes      int64
	MaxDurationMs           int64
	MaxActiveUploadSessions int
	UploadSessionTTL        time.Duration
	PlaybackURLTTL          time.Duration

	ShutdownTimeout time.Duration
	LogLevel        string
}

// LoadConfig reads Config from the environment, applying defaults for
// every field except DatabaseURL, which is required.
func LoadConfig() (Config, error) {
	cfg := Config{
		HTTPAddr:     getEnv("MEDIA_HTTP_ADDR", ":8083"),
		GRPCAddr:     getEnv("MEDIA_GRPC_ADDR", ":19095"),
		DatabaseURL:  os.Getenv("DATABASE_URL"),
		KafkaBrokers: splitCSV(os.Getenv("KAFKA_BROKERS")),

		MinIOEndpoint:  getEnv("MINIO_ENDPOINT", "localhost:9002"),
		MinIOAccessKey: getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinIOSecretKey: getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinIOUseSSL:    getEnv("MINIO_USE_SSL", "false") == "true",
		MediaBucket:    getEnv("MINIO_MEDIA_BUCKET", "media"),

		MaxSourceSizeBytes:      524_288_000,
		MaxDurationMs:           14_400_000,
		MaxActiveUploadSessions: 3,
		UploadSessionTTL:        60 * time.Minute,
		PlaybackURLTTL:          15 * time.Minute,

		ShutdownTimeout: 10 * time.Second,
		LogLevel:        getEnv("LOG_LEVEL", "info"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	if v := os.Getenv("MEDIA_MAX_SOURCE_SIZE_BYTES"); v != "" {
		n, err := strconv.ParseInt(v, 10, 64)
		if err != nil {
			return Config{}, fmt.Errorf("MEDIA_MAX_SOURCE_SIZE_BYTES: %w", err)
		}
		cfg.MaxSourceSizeBytes = n
	}

	if v := os.Getenv("MEDIA_MAX_DURATION_MS"); v != "" {
		n, err := strconv.ParseInt(v, 10, 64)
		if err != nil {
			return Config{}, fmt.Errorf("MEDIA_MAX_DURATION_MS: %w", err)
		}
		cfg.MaxDurationMs = n
	}

	if v := os.Getenv("MEDIA_MAX_ACTIVE_UPLOAD_SESSIONS"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			return Config{}, fmt.Errorf("MEDIA_MAX_ACTIVE_UPLOAD_SESSIONS: %w", err)
		}
		cfg.MaxActiveUploadSessions = n
	}

	if v := os.Getenv("MEDIA_UPLOAD_SESSION_TTL"); v != "" {
		ttl, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("MEDIA_UPLOAD_SESSION_TTL: %w", err)
		}
		cfg.UploadSessionTTL = ttl
	}

	if v := os.Getenv("MEDIA_PLAYBACK_URL_TTL"); v != "" {
		ttl, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("MEDIA_PLAYBACK_URL_TTL: %w", err)
		}
		cfg.PlaybackURLTTL = ttl
	}

	if v := os.Getenv("MEDIA_SHUTDOWN_TIMEOUT"); v != "" {
		timeout, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("MEDIA_SHUTDOWN_TIMEOUT: %w", err)
		}
		cfg.ShutdownTimeout = timeout
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func splitCSV(v string) []string {
	if v == "" {
		return nil
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
