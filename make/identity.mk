# identity service: users, accounts, sessions, account deletion.
# See services/identity/ and docs/services/identity.md.

.PHONY: identity\:build identity\:vet identity\:test identity\:test-integration identity\:run \
	identity\:migrate identity\:grpcui identity\:docker-build identity\:docker-up \
	identity\:docker-down identity\:docker-logs

identity\:build: ## Build identity
	cd services/identity && go build ./...

identity\:vet: ## Vet identity
	cd services/identity && go vet ./...

identity\:test: ## Run identity's unit tests
	cd services/identity && go test ./...

identity\:test-integration: ## Run identity's tests, including Testcontainers-backed integration tests (requires Docker)
	cd services/identity && V2_INTEGRATION_TESTS=1 go test ./...

identity\:run: ## Run identity locally against dockerized infra (loads services/identity/.env itself)
	@test -f services/identity/.env || { cp services/identity/.env.example services/identity/.env; echo "Created services/identity/.env from .env.example"; }
	cd services/identity && go run ./cmd/api

identity\:migrate: ## Apply identity's Flyway migrations (requires infra:up)
	docker run --rm --network $(INFRA_PROJECT)_default \
		-v $(PWD)/services/identity/migrations:/flyway/migrations:ro \
		flyway/flyway:11 \
		-url=jdbc:postgresql://postgres:5432/identity \
		-user=identity -password=identity \
		-locations=filesystem:/flyway/migrations \
		-connectRetries=10 \
		migrate

identity\:grpcui: ## Open grpcui against a running identity service (host or docker-compose)
	grpcui -plaintext localhost:9091

identity\:docker-build: ## Build identity's Docker image
	docker build -f services/identity/identity.dockerfile -t media-notes/identity:local .

identity\:docker-up: ## Run identity inside docker-compose, alongside infra (requires infra:up)
	$(COMPOSE) up -d --build identity-migrate identity

identity\:docker-down: ## Stop identity's docker-compose containers
	$(COMPOSE) rm -sf identity identity-migrate

identity\:docker-logs: ## Follow identity's docker-compose logs
	$(COMPOSE) logs -f identity
