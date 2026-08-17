// Command api runs the media service: gRPC API, health endpoints, the
// outbox relay, the workflow-status/account-deletion consumer, and the
// media-deletion reconciler.
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

	mediav1 "github.com/nolannguyen1212/media-notes/contracts/gen/go/media_notes/media/v1"
	"github.com/nolannguyen1212/media-notes/services/media/internal/app"
	"github.com/nolannguyen1212/media-notes/services/media/internal/deletion"
	"github.com/nolannguyen1212/media-notes/services/media/internal/derivative"
	"github.com/nolannguyen1212/media-notes/services/media/internal/events"
	grpcserver "github.com/nolannguyen1212/media-notes/services/media/internal/grpc"
	"github.com/nolannguyen1212/media-notes/services/media/internal/media"
	"github.com/nolannguyen1212/media-notes/services/media/internal/objectstore"
	"github.com/nolannguyen1212/media-notes/services/media/internal/store"
	"github.com/nolannguyen1212/media-notes/services/media/internal/upload"
)

const (
	outboxRelayInterval  = 2 * time.Second
	outboxRelayBatchSize = 50

	reconcileInterval     = 5 * time.Minute
	reconcileOverdueAfter = 15 * time.Minute
	reconcileBatchSize    = 100

	trashPurgeInterval  = 1 * time.Hour
	trashRetentionDays  = 30 * 24 * time.Hour
	trashPurgeBatchSize = 100
)

func main() {
	// Loads services/media/.env into the process environment for local
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
		logger.Error("media exited with error", "error", err)
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

	objectStore, err := objectstore.New(cfg.MinIOEndpoint, cfg.MinIOAccessKey, cfg.MinIOSecretKey, cfg.MinIOUseSSL, cfg.MediaBucket)
	if err != nil {
		return fmt.Errorf("connect object store: %w", err)
	}

	mediaRepo := store.NewMediaRepository(pool)
	uploadRepo := store.NewUploadRepository(pool)
	derivativeRepo := store.NewDerivativeRepository(pool)
	deletionRepo := store.NewDeletionRepository(pool)
	outboxRepo := store.NewOutboxRepository(pool)
	inboxRepo := store.NewInboxRepository(pool)

	mediaSvc := media.NewService(mediaRepo, objectStore, cfg.PlaybackURLTTL)
	uploadSvc := upload.NewService(uploadRepo, objectStore, cfg.MaxSourceSizeBytes, cfg.MaxActiveUploadSessions, cfg.UploadSessionTTL)
	derivativeSvc := derivative.NewService(derivativeRepo, objectStore, cfg.PlaybackURLTTL)
	deletionSvc := deletion.NewService(deletionRepo, objectStore)

	health.SetReady(true)

	grpcSrv := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			grpcserver.UnaryRecoveryInterceptor(logger),
			grpcserver.UnaryLoggingInterceptor(logger),
		),
	)
	mediav1.RegisterMediaServiceServer(grpcSrv, grpcserver.NewServer(mediaSvc, uploadSvc, derivativeSvc, deletionSvc))
	// Reflection lets grpcurl/grpcui introspect the API without a local
	// copy of media.proto. media is only ever called by hermes and
	// conductor-worker on the internal network, so exposing the schema
	// this way is not a public attack surface.
	reflection.Register(grpcSrv)

	httpSrv := &http.Server{Addr: cfg.HTTPAddr, Handler: health.Handler()}

	var kafkaPublisher *events.KafkaPublisher
	if len(cfg.KafkaBrokers) > 0 {
		kafkaPublisher = events.NewKafkaPublisher(cfg.KafkaBrokers)
	} else {
		logger.Warn("KAFKA_BROKERS not set; outbox relay and event consumer are disabled")
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

		consumer := events.NewConsumer(inboxRepo, mediaSvc, deletionSvc, logger)
		group.Go(func() error {
			return events.RunConsumer(gctx, cfg.KafkaBrokers, consumer)
		})
	}

	reconciler := events.NewReconciler(deletionSvc, logger, reconcileOverdueAfter, reconcileBatchSize)
	group.Go(func() error {
		reconciler.Run(gctx, reconcileInterval)
		return nil
	})

	trashPurge := events.NewTrashPurgeSweep(mediaSvc, deletionSvc, logger, trashRetentionDays, trashPurgeBatchSize)
	group.Go(func() error {
		trashPurge.Run(gctx, trashPurgeInterval)
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
