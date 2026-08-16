# Infrastructure shared by every v2 service: Postgres, Kafka, Kafka UI.

.PHONY: infra\:up infra\:down infra\:purge infra\:kafka-topics

infra\:up: ## Start infrastructure (Postgres, Kafka, Kafka UI, Redis, MinIO)
	$(COMPOSE) up -d

infra\:down: ## Stop infrastructure
	$(COMPOSE) down

infra\:purge: ## Remove infrastructure completely
	$(COMPOSE) down --rmi local -v
	docker system prune -a -f
	docker volume prune -a -f

infra\:kafka-topics: ## Create v2 Kafka topics (idempotent)
	$(COMPOSE) exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 \
		--create --if-not-exists --topic mn.identity.account.deletion.requested.v1 \
		--partitions 3 --replication-factor 1
