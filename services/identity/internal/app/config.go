// Package app holds identity's process-level concerns: configuration,
// logging, and health state.
package app

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config is identity's runtime configuration, loaded from the environment.
type Config struct {
	HTTPAddr     string
	GRPCAddr     string
	DatabaseURL  string
	KafkaBrokers []string
	// DeletionCompletionTopics are the Kafka topics media/content/
	// conductor/billing will publish deletion-completion events to. None
	// of those services exist yet, so this is typically empty until a
	// deployment configures it.
	DeletionCompletionTopics []string
	BcryptCost               int
	SessionTTL               time.Duration
	ShutdownTimeout          time.Duration
	LogLevel                 string
}

// LoadConfig reads Config from the environment, applying defaults for
// every field except DatabaseURL, which is required.
func LoadConfig() (Config, error) {
	cfg := Config{
		HTTPAddr:                 getEnv("IDENTITY_HTTP_ADDR", ":8081"),
		GRPCAddr:                 getEnv("IDENTITY_GRPC_ADDR", ":9091"),
		DatabaseURL:              os.Getenv("DATABASE_URL"),
		KafkaBrokers:             splitCSV(os.Getenv("KAFKA_BROKERS")),
		DeletionCompletionTopics: splitCSV(os.Getenv("IDENTITY_DELETION_COMPLETION_TOPICS")),
		BcryptCost:               12,
		SessionTTL:               30 * 24 * time.Hour,
		ShutdownTimeout:          10 * time.Second,
		LogLevel:                 getEnv("LOG_LEVEL", "info"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	if v := os.Getenv("IDENTITY_BCRYPT_COST"); v != "" {
		cost, err := strconv.Atoi(v)
		if err != nil {
			return Config{}, fmt.Errorf("IDENTITY_BCRYPT_COST: %w", err)
		}
		cfg.BcryptCost = cost
	}

	if v := os.Getenv("IDENTITY_SESSION_TTL"); v != "" {
		ttl, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("IDENTITY_SESSION_TTL: %w", err)
		}
		cfg.SessionTTL = ttl
	}

	if v := os.Getenv("IDENTITY_SHUTDOWN_TIMEOUT"); v != "" {
		timeout, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("IDENTITY_SHUTDOWN_TIMEOUT: %w", err)
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
