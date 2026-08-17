// Command api runs the identity service: gRPC API, health endpoints,
// outbox relay, deletion-completion consumer, and deletion reconciler.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	identityv1 "github.com/nolannguyen1212/media-notes/contracts/gen/go/media_notes/identity/v1"
	"github.com/nolannguyen1212/media-notes/services/identity/internal/account"
	"github.com/nolannguyen1212/media-notes/services/identity/internal/app"
	"github.com/nolannguyen1212/media-notes/services/identity/internal/events"
	grpcserver "github.com/nolannguyen1212/media-notes/services/identity/internal/grpc"
	"github.com/nolannguyen1212/media-notes/services/identity/internal/promptsettings"
	"github.com/nolannguyen1212/media-notes/services/identity/internal/session"
	"github.com/nolannguyen1212/media-notes/services/identity/internal/store"
)

const (
	outboxRelayInterval  = 2 * time.Second
	outboxRelayBatchSize = 50

	reconcileInterval     = 5 * time.Minute
	reconcileOverdueAfter = 15 * time.Minute
	reconcileBatchSize    = 100
)

func main() {
	// Loads services/identity/.env into the process environment for local
	// development, if present. A real deployment sets DATABASE_URL etc.
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
		logger.Error("identity exited with error", "error", err)
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

	accountRepo := store.NewAccountRepository(pool)
	sessionRepo := store.NewSessionRepository(pool)
	outboxRepo := store.NewOutboxRepository(pool)
	inboxRepo := store.NewInboxRepository(pool)
	promptSettingsRepo := store.NewPromptSettingsRepository(pool)

	accountSvc := account.NewService(accountRepo, cfg.BcryptCost)
	sessionSvc := session.NewService(sessionRepo, accountSvc, cfg.SessionTTL)
	promptSettingsSvc := promptsettings.NewService(promptSettingsRepo)

	health.SetReady(true)

	grpcSrv := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			grpcserver.UnaryRecoveryInterceptor(logger),
			grpcserver.UnaryLoggingInterceptor(logger),
		),
	)
	identityv1.RegisterIdentityServiceServer(grpcSrv, grpcserver.NewServer(accountSvc, sessionSvc, promptSettingsSvc))
	// Reflection lets grpcurl/grpcui introspect the API without a local
	// copy of identity.proto. identity is only ever called by hermes and
	// operators on the internal network, so exposing the schema this way
	// is not a public attack surface.
	reflection.Register(grpcSrv)

	httpSrv := &http.Server{Addr: cfg.HTTPAddr, Handler: health.Handler()}

	var kafkaPublisher *events.KafkaPublisher
	if len(cfg.KafkaBrokers) > 0 {
		kafkaPublisher = events.NewKafkaPublisher(cfg.KafkaBrokers)
	} else {
		logger.Warn("KAFKA_BROKERS not set; outbox relay and deletion-completion consumer are disabled")
	}

	group, gctx := errgroup.WithContext(ctx)

	group.Go(func() error {
		lis, err := net.Listen("tcp", cfg.GRPCAddr)
		if err != nil {
			return fmt.Errorf("listen grpc: %w", err)
		}
		logger.Info("grpc server listening", "addr", cfg.GRPCAddr)
		if err := grpcSrv.Serve(lis); err != nil {
			return fmt.Errorf("serve grpc: %w", err)
		}
		return nil
	})

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

		if len(cfg.DeletionCompletionTopics) > 0 {
			consumer := events.NewCompletionConsumer(inboxRepo, accountSvc, logger)
			group.Go(func() error {
				return events.RunCompletionConsumer(gctx, cfg.KafkaBrokers, cfg.DeletionCompletionTopics, consumer, logger)
			})
		} else {
			logger.Info("IDENTITY_DELETION_COMPLETION_TOPICS not set; deletion-completion consumer is disabled")
		}
	}

	reconciler := events.NewReconciler(accountSvc, logger, reconcileOverdueAfter, reconcileBatchSize)
	group.Go(func() error {
		reconciler.Run(gctx, reconcileInterval)
		return nil
	})

	<-gctx.Done()
	logger.Info("shutting down")
	health.SetReady(false)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	grpcSrv.GracefulStop()
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
