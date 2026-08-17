// Command api runs the content service: gRPC API, health endpoints, the
// outbox relay, and the media-deletion-requested consumer.
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

	contentv1 "github.com/nolannguyen1212/media-notes/contracts/gen/go/media_notes/content/v1"
	"github.com/nolannguyen1212/media-notes/services/content/internal/app"
	"github.com/nolannguyen1212/media-notes/services/content/internal/audiojob"
	"github.com/nolannguyen1212/media-notes/services/content/internal/content"
	"github.com/nolannguyen1212/media-notes/services/content/internal/deletion"
	"github.com/nolannguyen1212/media-notes/services/content/internal/events"
	grpcserver "github.com/nolannguyen1212/media-notes/services/content/internal/grpc"
	"github.com/nolannguyen1212/media-notes/services/content/internal/objectstore"
	"github.com/nolannguyen1212/media-notes/services/content/internal/store"
)

const (
	outboxRelayInterval  = 2 * time.Second
	outboxRelayBatchSize = 50
)

func main() {
	// Loads services/content/.env into the process environment for local
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
		logger.Error("content exited with error", "error", err)
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

	contentRepo := store.NewContentRepository(pool)
	deletionRepo := store.NewDeletionRepository(pool)
	audioJobRepo := store.NewAudioJobRepository(pool)
	outboxRepo := store.NewOutboxRepository(pool)
	inboxRepo := store.NewInboxRepository(pool)

	deletionSvc := deletion.NewService(deletionRepo)
	contentSvc := content.NewService(contentRepo, deletionSvc)
	audioJobSvc := audiojob.NewService(audioJobRepo)

	// Declared as the interface, not *objectstore.Client: assigning a nil
	// *Client to an ObjectStore-typed variable would leave a non-nil
	// interface wrapping a nil pointer, and grpcserver's `!= nil` check
	// would then call a method on a nil receiver instead of skipping it.
	var objectStore grpcserver.ObjectStore
	if cfg.MinIOEndpoint != "" {
		client, err := objectstore.New(cfg.MinIOEndpoint, cfg.MinIOAccessKey, cfg.MinIOSecretKey, cfg.MinIOUseSSL, cfg.MinIOBucket)
		if err != nil {
			return fmt.Errorf("new objectstore client: %w", err)
		}
		objectStore = client
	} else {
		logger.Warn("MINIO_ENDPOINT not set; summary-audio playback URLs are disabled")
	}

	health.SetReady(true)

	grpcSrv := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			grpcserver.UnaryRecoveryInterceptor(logger),
			grpcserver.UnaryLoggingInterceptor(logger),
		),
	)
	contentv1.RegisterContentServiceServer(grpcSrv, grpcserver.NewServer(contentSvc, audioJobSvc, objectStore, logger))
	// Reflection lets grpcurl/grpcui introspect the API without a local
	// copy of content.proto. content is only ever called by hermes and
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

		consumer := events.NewConsumer(inboxRepo, deletionSvc, logger)
		group.Go(func() error {
			return events.RunConsumer(gctx, cfg.KafkaBrokers, consumer)
		})
	}

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
