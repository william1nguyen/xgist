package events

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"

	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"
)

// KafkaPublisher publishes outbox records to Kafka, creating one writer
// per topic lazily.
type KafkaPublisher struct {
	brokers []string

	mu      sync.Mutex
	writers map[string]*kafka.Writer
}

// NewKafkaPublisher returns a KafkaPublisher for the given brokers.
func NewKafkaPublisher(brokers []string) *KafkaPublisher {
	return &KafkaPublisher{brokers: brokers, writers: make(map[string]*kafka.Writer)}
}

// Publish implements Publisher.
func (p *KafkaPublisher) Publish(ctx context.Context, topic, key string, payload []byte) error {
	return p.writerFor(topic).WriteMessages(ctx, kafka.Message{Key: []byte(key), Value: payload})
}

func (p *KafkaPublisher) writerFor(topic string) *kafka.Writer {
	p.mu.Lock()
	defer p.mu.Unlock()

	if w, ok := p.writers[topic]; ok {
		return w
	}
	// Hash balancing keys on the record key preserves the per-key
	// ordering ADR 0003 requires within a topic partition.
	w := &kafka.Writer{
		Addr:                   kafka.TCP(p.brokers...),
		Topic:                  topic,
		Balancer:               &kafka.Hash{},
		AllowAutoTopicCreation: false,
	}
	p.writers[topic] = w
	return w
}

// Close closes every writer opened by Publish.
func (p *KafkaPublisher) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	var firstErr error
	for _, w := range p.writers {
		if err := w.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}

// completionEnvelope is the wire shape expected from deletion-completion
// producers: {event_id, deletion_id, owner, status}.
type completionEnvelope struct {
	EventID    uuid.UUID `json:"event_id"`
	DeletionID uuid.UUID `json:"deletion_id"`
	Owner      string    `json:"owner"`
	Status     string    `json:"status"`
}

// RunCompletionConsumer reads deletion-completion events from topics
// until ctx is canceled, decoding each as completionEnvelope and applying
// it through consumer. An offset commits only after Handle succeeds, so a
// crash mid-processing redelivers rather than loses the event.
func RunCompletionConsumer(ctx context.Context, brokers, topics []string, consumer *CompletionConsumer, logger *slog.Logger) error {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:     brokers,
		GroupTopics: topics,
		GroupID:     deletionCompletionsConsumerGroup,
	})
	defer reader.Close()

	for {
		msg, err := reader.FetchMessage(ctx)
		if err != nil {
			if errors.Is(err, context.Canceled) {
				return nil
			}
			return fmt.Errorf("fetch message: %w", err)
		}

		var env completionEnvelope
		if err := json.Unmarshal(msg.Value, &env); err != nil {
			logger.ErrorContext(ctx, "decode deletion completion event, skipping", "error", err)
			if commitErr := reader.CommitMessages(ctx, msg); commitErr != nil {
				return fmt.Errorf("commit message: %w", commitErr)
			}
			continue
		}

		if err := consumer.Handle(ctx, env.EventID, CompletionEvent{
			DeletionID: env.DeletionID,
			Owner:      env.Owner,
			Status:     env.Status,
		}); err != nil {
			return fmt.Errorf("handle deletion completion event: %w", err)
		}

		if err := reader.CommitMessages(ctx, msg); err != nil {
			return fmt.Errorf("commit message: %w", err)
		}
	}
}
