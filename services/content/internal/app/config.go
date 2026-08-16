// Package app holds content's process-level concerns: configuration,
// logging, and health state.
package app

import (
	"fmt"
	"os"
	"strings"
	"time"
)

// Config is content's runtime configuration, loaded from the environment.
type Config struct {
	HTTPAddr     string
	GRPCAddr     string
	DatabaseURL  string
	KafkaBrokers []string

	ShutdownTimeout time.Duration
	LogLevel        string
}

// LoadConfig reads Config from the environment, applying defaults for
// every field except DatabaseURL, which is required.
func LoadConfig() (Config, error) {
	cfg := Config{
		HTTPAddr:     getEnv("CONTENT_HTTP_ADDR", ":8084"),
		GRPCAddr:     getEnv("CONTENT_GRPC_ADDR", ":9095"),
		DatabaseURL:  os.Getenv("DATABASE_URL"),
		KafkaBrokers: splitCSV(os.Getenv("KAFKA_BROKERS")),

		ShutdownTimeout: 10 * time.Second,
		LogLevel:        getEnv("LOG_LEVEL", "info"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	if v := os.Getenv("CONTENT_SHUTDOWN_TIMEOUT"); v != "" {
		timeout, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("CONTENT_SHUTDOWN_TIMEOUT: %w", err)
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
