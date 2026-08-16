# content service: transcript, generated content, summary-audio metadata.
# See services/content/ and docs/services/content.md.

.PHONY: content\:build content\:test content\:test-integration content\:run \
	content\:migrate content\:grpcui content\:docker-build content\:docker-up \
	content\:docker-down content\:docker-logs

content\:build: ## Build content
	cd services/content && go build ./...

content\:test: ## Run content's unit tests
	cd services/content && go test ./...

content\:test-integration: ## Run content's tests, including Testcontainers-backed integration tests (requires Docker)
	cd services/content && V2_INTEGRATION_TESTS=1 go test ./...

content\:run: ## Run content locally against dockerized infra (loads services/content/.env itself)
	@test -f services/content/.env || { cp services/content/.env.example services/content/.env; echo "Created services/content/.env from .env.example"; }
	cd services/content && go run ./cmd/api

content\:migrate: ## Apply content's Flyway migrations (requires infra:up)
	docker run --rm --network $(INFRA_PROJECT)_default \
		-v $(PWD)/services/content/migrations:/flyway/migrations:ro \
		flyway/flyway:11 \
		-url=jdbc:postgresql://postgres:5432/content \
		-user=content -password=content \
		-locations=filesystem:/flyway/migrations \
		-connectRetries=10 \
		migrate

content\:grpcui: ## Open grpcui against a running content service (host or docker-compose)
	grpcui -plaintext localhost:9095

content\:docker-build: ## Build content's Docker image
	docker build -f services/content/content.dockerfile -t media-notes/content:local .

content\:docker-up: ## Run content inside docker-compose, alongside infra (requires infra:up)
	$(COMPOSE) up -d --build content-migrate content

content\:docker-down: ## Stop content's docker-compose containers
	$(COMPOSE) rm -sf content content-migrate

content\:docker-logs: ## Follow content's docker-compose logs
	$(COMPOSE) logs -f content
