// Command hermes runs the public GraphQL gateway: HTTP server, health
// endpoints, and gRPC clients to identity, billing, media, and content.
// hermes owns no database — its only external dependency besides those
// four services is Redis, for the ADR 0004 rate limiter.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"

	"github.com/nolannguyen1212/media-notes/services/hermes/internal/app"
	"github.com/nolannguyen1212/media-notes/services/hermes/internal/clients"
	"github.com/nolannguyen1212/media-notes/services/hermes/internal/graphql"
	server "github.com/nolannguyen1212/media-notes/services/hermes/internal/http"
	"github.com/nolannguyen1212/media-notes/services/hermes/internal/limits"
)

func main() {
	// Loads services/hermes/.env into the process environment for local
	// development, if present. A real deployment sets HERMES_* etc.
	// directly (docker-compose environment:, orchestrator secrets), and
	// os.Getenv already sees those; a missing .env is not an error.
	_ = godotenv.Load()

	cfg, err := app.LoadConfig()
	if err != nil {
		fmt.Fprintln(os.Stderr, "load config:", err)
		os.Exit(1)
	}

	logger := app.NewLogger(cfg.LogLevel)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := run(ctx, cfg, logger); err != nil {
		logger.Error("hermes exited with error", "error", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, cfg app.Config, logger *slog.Logger) error {
	health := app.NewHealth()

	identityClient, err := clients.NewIdentityClient(cfg.IdentityGRPCAddr)
	if err != nil {
		return fmt.Errorf("dial identity: %w", err)
	}
	defer identityClient.Close()

	billingClient, err := clients.NewBillingClient(cfg.BillingGRPCAddr)
	if err != nil {
		return fmt.Errorf("dial billing: %w", err)
	}
	defer billingClient.Close()

	mediaClient, err := clients.NewMediaClient(cfg.MediaGRPCAddr)
	if err != nil {
		return fmt.Errorf("dial media: %w", err)
	}
	defer mediaClient.Close()

	contentClient, err := clients.NewContentClient(cfg.ContentGRPCAddr)
	if err != nil {
		return fmt.Errorf("dial content: %w", err)
	}
	defer contentClient.Close()

	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})
	defer rdb.Close()
	limiter := limits.NewLimiter(rdb)

	resolver := graphql.NewResolver(identityClient, billingClient, mediaClient, contentClient, limiter, logger)
	mux := server.NewMux(cfg, resolver, identityClient, health, logger)

	httpSrv := &http.Server{Addr: cfg.HTTPAddr, Handler: mux}

	// hermes has no database migration or Kafka consumer to wait on, so
	// it is ready as soon as every downstream client has dialed —
	// grpc.NewClient connects lazily, so "dialed" here means "configured
	// successfully," not "downstream is reachable." Downstream outages
	// surface per-request as a safe GraphQL error, not as hermes itself
	// going unready.
	health.SetReady(true)

	errCh := make(chan error, 1)
	go func() {
		logger.Info("http server listening", "addr", cfg.HTTPAddr)
		if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- fmt.Errorf("serve http: %w", err)
			return
		}
		errCh <- nil
	}()

	select {
	case <-ctx.Done():
	case err := <-errCh:
		if err != nil {
			return err
		}
	}

	logger.Info("shutting down")
	health.SetReady(false)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		logger.Error("shut down http server", "error", err)
	}

	return nil
}
