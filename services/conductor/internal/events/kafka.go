package events

import (
	"context"
	"errors"
	"fmt"
	"sync"

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

// ConsumerGroup names one Kafka reader: the topics it reads and the
// consumer group id it reads them under.
type ConsumerGroup struct {
	Topics  []string
	GroupID string
}

// RunConsumer reads every topic in group until ctx is canceled, applying
// each message through consumer.Handle. An offset commits only after
// Handle succeeds, so a crash mid-processing redelivers rather than loses
// the message. Unlike every sibling service's single-group RunConsumer,
// this takes the whole kafka.Message (not just topic/payload): DLQ
// records need the original partition and offset (ADR 0003), which only
// the reader has.
func RunConsumer(ctx context.Context, brokers []string, group ConsumerGroup, consumer *Consumer) error {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:     brokers,
		GroupTopics: group.Topics,
		GroupID:     group.GroupID,
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

		if err := consumer.Handle(ctx, msg); err != nil {
			return fmt.Errorf("handle event: %w", err)
		}

		if err := reader.CommitMessages(ctx, msg); err != nil {
			return fmt.Errorf("commit message: %w", err)
		}
	}
}
