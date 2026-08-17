// Command conductor runs the conductor service: the workflow state
// machine, health endpoints, the outbox relay, four Kafka consumer
// groups (see internal/events.ConsumerGroups), and the retry/timeout
// scheduler. Unlike hermes/identity/billing/media/content, conductor has
// no gRPC server of its own — architecture.md's gRPC boundaries section
// lists only hermes and conductor-worker as gRPC callers — but it dials
// media and billing as a gRPC client (see internal/clients).
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
	"time"

	"github.com/joho/godotenv"
	"golang.org/x/sync/errgroup"

	"github.com/nolannguyen1212/media-notes/services/conductor/internal/app"
	"github.com/nolannguyen1212/media-notes/services/conductor/internal/clients"
	"github.com/nolannguyen1212/media-notes/services/conductor/internal/events"
	"github.com/nolannguyen1212/media-notes/services/conductor/internal/store"
	"github.com/nolannguyen1212/media-notes/services/conductor/internal/workflow"
)

const (
	outboxRelayInterval  = 2 * time.Second
	outboxRelayBatchSize = 50
)

func main() {
	// Loads services/conductor/.env into the process environment for
	// local development, if present. A real deployment sets DATABASE_URL
	// etc. directly, and os.Getenv already sees those; a missing .env is
	// not an error.
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
		logger.Error("conductor exited with error", "error", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, cfg app.Config, logger *slog.Logger) error {
	health := app.NewHealth()

	pool, err := store.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("connect database: %w", err)
	}
	defer pool.Close()

	if err := store.CheckMigrated(ctx, pool); err != nil {
		return err
	}

	mediaClient, err := clients.NewMediaClient(cfg.MediaGRPCAddr)
	if err != nil {
		return fmt.Errorf("dial media: %w", err)
	}
	defer mediaClient.Close()

	billingClient, err := clients.NewBillingClient(cfg.BillingGRPCAddr)
	if err != nil {
		return fmt.Errorf("dial billing: %w", err)
	}
	defer billingClient.Close()

	workflowRepo := store.NewWorkflowRepository(pool)
	outboxRepo := store.NewOutboxRepository(pool)
	inboxRepo := store.NewInboxRepository(pool)
	dlqRepo := store.NewDLQRepository(pool)

	workflowSvc := workflow.NewService(workflowRepo, mediaClient, billingClient, cfg.MaxStepAttempts)

	health.SetReady(true)

	httpSrv := &http.Server{Addr: cfg.HTTPAddr, Handler: health.Handler()}

	var kafkaPublisher *events.KafkaPublisher
	if len(cfg.KafkaBrokers) > 0 {
		kafkaPublisher = events.NewKafkaPublisher(cfg.KafkaBrokers)
	} else {
		logger.Warn("KAFKA_BROKERS not set; outbox relay and Kafka consumers are disabled")
	}

	group, gctx := errgroup.WithContext(ctx)

	group.Go(func() error {
		logger.Info("health server listening", "addr", cfg.HTTPAddr)
		if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("serve health: %w", err)
		}
		return nil
	})

	if kafkaPublisher != nil {
		relay := events.NewRelay(outboxRepo, kafkaPublisher, logger)
		group.Go(func() error {
			relay.Run(gctx, outboxRelayInterval, outboxRelayBatchSize)
			return nil
		})

		consumer := events.NewConsumer(inboxRepo, dlqRepo, workflowSvc, logger)
		for _, g := range events.ConsumerGroups {
			g := g
			group.Go(func() error {
				return events.RunConsumer(gctx, cfg.KafkaBrokers, g, consumer)
			})
		}
	}

	group.Go(func() error {
		runScheduler(gctx, workflowSvc, cfg.SchedulerInterval, logger)
		return nil
	})

	<-gctx.Done()
	logger.Info("shutting down")
	health.SetReady(false)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		logger.Error("shut down health server", "error", err)
	}
	if kafkaPublisher != nil {
		if err := kafkaPublisher.Close(); err != nil {
			logger.Error("close kafka publisher", "error", err)
		}
	}

	if err := group.Wait(); err != nil && !errors.Is(err, context.Canceled) {
		return err
	}
	return nil
}

// runScheduler ticks ScheduleDueRetries and ExpireTimedOutSteps until ctx
// is canceled, the same polling shape as the outbox relay.
func runScheduler(ctx context.Context, svc *workflow.Service, interval time.Duration, logger *slog.Logger) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			now := time.Now()
			if err := svc.ScheduleDueRetries(ctx, now); err != nil {
				logger.ErrorContext(ctx, "schedule due retries", "error", err)
			}
			if err := svc.ExpireTimedOutSteps(ctx, now); err != nil {
				logger.ErrorContext(ctx, "expire timed out steps", "error", err)
			}
		}
	}
}
