// Command api runs the billing service: gRPC API (quotes and billing
// summaries), the Polar webhook endpoint, health endpoints, the outbox
// relay, and the credit-command consumer.
package main

import (
	"context"
	"errors"
	"fmt"
	"io"
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

	billingv1 "github.com/nolannguyen1212/media-notes/contracts/gen/go/media_notes/billing/v1"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/app"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/credit"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/events"
	grpcserver "github.com/nolannguyen1212/media-notes/services/billing/internal/grpc"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/provider"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/quote"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/store"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/subscription"
)

const (
	outboxRelayInterval  = 2 * time.Second
	outboxRelayBatchSize = 50
)

func main() {
	// Loads services/billing/.env into the process environment for local
	// development, if present. A real deployment sets DATABASE_URL etc.
	// directly, and os.Getenv already sees those; a missing .env is not
	// an error.
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
		logger.Error("billing exited with error", "error", err)
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

	quoteRepo := store.NewQuoteRepository(pool)
	creditRepo := store.NewCreditRepository(pool, cfg.ReservationTTL)
	subscriptionRepo := store.NewSubscriptionRepository(pool)
	outboxRepo := store.NewOutboxRepository(pool)
	inboxRepo := store.NewInboxRepository(pool)
	providerEventRepo := store.NewProviderEventRepository(pool)

	quoteSvc := quote.NewService(quoteRepo, cfg.QuoteTTL)
	creditSvc := credit.NewService(creditRepo)
	subscriptionSvc := subscription.NewService(subscriptionRepo)
	polarHandler := provider.NewPolarHandler(cfg.PolarWebhookKey, providerEventRepo, creditSvc, logger)

	health.SetReady(true)

	grpcSrv := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			grpcserver.UnaryRecoveryInterceptor(logger),
			grpcserver.UnaryLoggingInterceptor(logger),
		),
	)
	billingv1.RegisterBillingServiceServer(grpcSrv, grpcserver.NewServer(quoteSvc, creditSvc, subscriptionSvc))
	// Reflection lets grpcurl/grpcui introspect the API without a local
	// copy of billing.proto. billing is only ever called by hermes and
	// operators on the internal network, so exposing the schema this way
	// is not a public attack surface.
	reflection.Register(grpcSrv)

	mux := http.NewServeMux()
	health.RegisterOn(mux)
	mux.HandleFunc("POST /webhooks/polar", polarWebhookHandler(polarHandler, logger))
	httpSrv := &http.Server{Addr: cfg.HTTPAddr, Handler: mux}

	var kafkaPublisher *events.KafkaPublisher
	if len(cfg.KafkaBrokers) > 0 {
		kafkaPublisher = events.NewKafkaPublisher(cfg.KafkaBrokers)
	} else {
		logger.Warn("KAFKA_BROKERS not set; outbox relay and credit-command consumer are disabled")
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
		logger.Info("http server listening", "addr", cfg.HTTPAddr)
		if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("serve http: %w", err)
		}
		return nil
	})

	if kafkaPublisher != nil {
		relay := events.NewRelay(outboxRepo, kafkaPublisher, logger)
		group.Go(func() error {
			relay.Run(gctx, outboxRelayInterval, outboxRelayBatchSize)
			return nil
		})

		commandConsumer := events.NewCommandConsumer(inboxRepo, creditSvc, creditSvc, logger)
		group.Go(func() error {
			return events.RunCommandConsumer(gctx, cfg.KafkaBrokers, commandConsumer)
		})
	}

	<-gctx.Done()
	logger.Info("shutting down")
	health.SetReady(false)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	grpcSrv.GracefulStop()
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		logger.Error("shut down http server", "error", err)
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

func polarWebhookHandler(handler *provider.PolarHandler, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		signature := r.Header.Get(provider.PolarSignatureHeader)
		err = handler.Handle(r.Context(), body, signature)
		switch {
		case err == nil:
			w.WriteHeader(http.StatusOK)
		case errors.Is(err, provider.ErrInvalidSignature):
			w.WriteHeader(http.StatusUnauthorized)
		default:
			logger.ErrorContext(r.Context(), "handle polar webhook", "error", err)
			w.WriteHeader(http.StatusInternalServerError)
		}
	}
}
