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

// RunCommandConsumer reads reserve and settle commands from their topics
// until ctx is canceled, applying each through consumer. An offset commits
// only after Handle succeeds, so a crash mid-processing redelivers rather
// than loses the command.
func RunCommandConsumer(ctx context.Context, brokers []string, consumer *CommandConsumer) error {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:     brokers,
		GroupTopics: []string{ReserveCommandTopic, SettleCommandTopic},
		GroupID:     commandsConsumerGroup,
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

		if err := consumer.Handle(ctx, msg.Topic, msg.Value); err != nil {
			return fmt.Errorf("handle command: %w", err)
		}

		if err := reader.CommitMessages(ctx, msg); err != nil {
			return fmt.Errorf("commit message: %w", err)
		}
	}
}
