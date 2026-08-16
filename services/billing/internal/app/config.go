// Package app holds billing's process-level concerns: configuration,
// logging, and health state.
package app

import (
	"fmt"
	"os"
	"strings"
	"time"
)

// Config is billing's runtime configuration, loaded from the environment.
type Config struct {
	HTTPAddr     string
	GRPCAddr     string
	DatabaseURL  string
	KafkaBrokers []string

	CatalogVersion  string
	QuoteTTL        time.Duration
	ReservationTTL  time.Duration
	PolarWebhookKey string

	ShutdownTimeout time.Duration
	LogLevel        string
}

// LoadConfig reads Config from the environment, applying defaults for
// every field except DatabaseURL, which is required.
func LoadConfig() (Config, error) {
	cfg := Config{
		HTTPAddr:        getEnv("BILLING_HTTP_ADDR", ":8082"),
		GRPCAddr:        getEnv("BILLING_GRPC_ADDR", ":9093"),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		KafkaBrokers:    splitCSV(os.Getenv("KAFKA_BROKERS")),
		CatalogVersion:  getEnv("BILLING_CATALOG_VERSION", "launch-v1"),
		QuoteTTL:        15 * time.Minute,
		ReservationTTL:  24 * time.Hour,
		PolarWebhookKey: os.Getenv("BILLING_POLAR_WEBHOOK_SECRET"),
		ShutdownTimeout: 10 * time.Second,
		LogLevel:        getEnv("LOG_LEVEL", "info"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	if v := os.Getenv("BILLING_QUOTE_TTL"); v != "" {
		ttl, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("BILLING_QUOTE_TTL: %w", err)
		}
		cfg.QuoteTTL = ttl
	}

	if v := os.Getenv("BILLING_RESERVATION_TTL"); v != "" {
		ttl, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("BILLING_RESERVATION_TTL: %w", err)
		}
		cfg.ReservationTTL = ttl
	}

	if v := os.Getenv("BILLING_SHUTDOWN_TIMEOUT"); v != "" {
		timeout, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("BILLING_SHUTDOWN_TIMEOUT: %w", err)
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
