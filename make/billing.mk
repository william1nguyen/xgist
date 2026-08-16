# billing service: subscriptions, credit reservation, settlement, ledger.
# See services/billing/ and docs/services/billing.md.

.PHONY: billing\:build billing\:test billing\:test-integration billing\:run \
	billing\:migrate billing\:grpcui billing\:docker-build billing\:docker-up \
	billing\:docker-down billing\:docker-logs

billing\:build: ## Build billing
	cd services/billing && go build ./...

billing\:test: ## Run billing's unit tests
	cd services/billing && go test ./...

billing\:test-integration: ## Run billing's tests, including Testcontainers-backed integration tests (requires Docker)
	cd services/billing && V2_INTEGRATION_TESTS=1 go test ./...

billing\:run: ## Run billing locally against dockerized infra (loads services/billing/.env itself)
	@test -f services/billing/.env || { cp services/billing/.env.example services/billing/.env; echo "Created services/billing/.env from .env.example"; }
	cd services/billing && go run ./cmd/api

billing\:migrate: ## Apply billing's Flyway migrations (requires infra:up)
	docker run --rm --network $(INFRA_PROJECT)_default \
		-v $(PWD)/services/billing/migrations:/flyway/migrations:ro \
		flyway/flyway:11 \
		-url=jdbc:postgresql://postgres:5432/billing \
		-user=billing -password=billing \
		-locations=filesystem:/flyway/migrations \
		-connectRetries=10 \
		migrate

billing\:grpcui: ## Open grpcui against a running billing service (host or docker-compose)
	grpcui -plaintext localhost:9093

billing\:docker-build: ## Build billing's Docker image
	docker build -f services/billing/billing.dockerfile -t media-notes/billing:local .

billing\:docker-up: ## Run billing inside docker-compose, alongside infra (requires infra:up)
	$(COMPOSE) up -d --build billing-migrate billing

billing\:docker-down: ## Stop billing's docker-compose containers
	$(COMPOSE) rm -sf billing billing-migrate

billing\:docker-logs: ## Follow billing's docker-compose logs
	$(COMPOSE) logs -f billing
