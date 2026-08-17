// Package app holds conductor's process-level concerns: configuration,
// logging, and health state.
package app

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config is conductor's runtime configuration, loaded from the environment.
type Config struct {
	HTTPAddr     string
	DatabaseURL  string
	KafkaBrokers []string

	// MediaGRPCAddr and BillingGRPCAddr are the addresses conductor dials
	// as a gRPC client: GetMedia (to resolve a processing request's owner)
	// and GetQuote (to price a workflow's selected options) — see "Key
	// design decisions" #2 in the implementation plan.
	MediaGRPCAddr   string
	BillingGRPCAddr string

	// MaxStepAttempts bounds retry.Compute: a step's attempt beyond this
	// count is exhausted rather than rescheduled.
	MaxStepAttempts int

	// SchedulerInterval paces ScheduleDueRetries/ExpireTimedOutSteps, the
	// same way outboxRelayInterval paces the outbox relay.
	SchedulerInterval time.Duration

	ShutdownTimeout time.Duration
	LogLevel        string
}

// LoadConfig reads Config from the environment, applying defaults for
// every field except DatabaseURL, which is required.
func LoadConfig() (Config, error) {
	cfg := Config{
		HTTPAddr:     getEnv("CONDUCTOR_HTTP_ADDR", ":8085"),
		DatabaseURL:  os.Getenv("DATABASE_URL"),
		KafkaBrokers: splitCSV(os.Getenv("KAFKA_BROKERS")),

		MediaGRPCAddr:   getEnv("CONDUCTOR_MEDIA_GRPC_ADDR", "localhost:19095"),
		BillingGRPCAddr: getEnv("CONDUCTOR_BILLING_GRPC_ADDR", "localhost:9093"),

		MaxStepAttempts:   3,
		SchedulerInterval: 5 * time.Second,

		ShutdownTimeout: 10 * time.Second,
		LogLevel:        getEnv("LOG_LEVEL", "info"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	if v := os.Getenv("CONDUCTOR_MAX_STEP_ATTEMPTS"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			return Config{}, fmt.Errorf("CONDUCTOR_MAX_STEP_ATTEMPTS: %w", err)
		}
		cfg.MaxStepAttempts = n
	}

	if v := os.Getenv("CONDUCTOR_SCHEDULER_INTERVAL"); v != "" {
		interval, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("CONDUCTOR_SCHEDULER_INTERVAL: %w", err)
		}
		cfg.SchedulerInterval = interval
	}

	if v := os.Getenv("CONDUCTOR_SHUTDOWN_TIMEOUT"); v != "" {
		timeout, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("CONDUCTOR_SHUTDOWN_TIMEOUT: %w", err)
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
