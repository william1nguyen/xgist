# conductor service: workflow state machine, commands, dependencies,
# joins, retry, timeout. See services/conductor/ and
# docs/services/conductor.md.

.PHONY: conductor\:build conductor\:vet conductor\:test conductor\:test-integration conductor\:run \
	conductor\:migrate conductor\:docker-build conductor\:docker-up \
	conductor\:docker-down conductor\:docker-logs

conductor\:build: ## Build conductor
	cd services/conductor && go build ./...

conductor\:vet: ## Vet conductor
	cd services/conductor && go vet ./...

conductor\:test: ## Run conductor's unit tests
	cd services/conductor && go test ./...

conductor\:test-integration: ## Run conductor's tests, including Testcontainers-backed integration tests (requires Docker)
	cd services/conductor && V2_INTEGRATION_TESTS=1 go test ./...

conductor\:run: ## Run conductor locally against dockerized infra (loads services/conductor/.env itself)
	@test -f services/conductor/.env || { cp services/conductor/.env.example services/conductor/.env; echo "Created services/conductor/.env from .env.example"; }
	cd services/conductor && go run ./cmd/conductor

conductor\:migrate: ## Apply conductor's Flyway migrations (requires infra:up)
	docker run --rm --network $(INFRA_PROJECT)_default \
		-v $(PWD)/services/conductor/migrations:/flyway/migrations:ro \
		flyway/flyway:11 \
		-url=jdbc:postgresql://postgres:5432/workflow \
		-user=conductor -password=conductor \
		-locations=filesystem:/flyway/migrations \
		-connectRetries=10 \
		migrate

conductor\:docker-build: ## Build conductor's Docker image
	docker build -f services/conductor/conductor.dockerfile -t media-notes/conductor:local .

conductor\:docker-up: ## Run conductor inside docker-compose, alongside infra (requires infra:up)
	$(COMPOSE) up -d --build conductor-migrate conductor

conductor\:docker-down: ## Stop conductor's docker-compose containers
	$(COMPOSE) rm -sf conductor conductor-migrate

conductor\:docker-logs: ## Follow conductor's docker-compose logs
	$(COMPOSE) logs -f conductor
