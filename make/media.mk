# media service: uploads, source-media metadata, derivatives, processing
# requests, media deletion. See services/media/ and docs/services/media.md.

.PHONY: media\:build media\:vet media\:test media\:test-integration media\:run \
	media\:migrate media\:grpcui media\:docker-build media\:docker-up \
	media\:docker-down media\:docker-logs

media\:build: ## Build media
	cd services/media && go build ./...

media\:vet: ## Vet media
	cd services/media && go vet ./...

media\:test: ## Run media's unit tests
	cd services/media && go test ./...

media\:test-integration: ## Run media's tests, including Testcontainers-backed integration tests (requires Docker)
	cd services/media && V2_INTEGRATION_TESTS=1 go test ./...

media\:run: ## Run media locally against dockerized infra (loads services/media/.env itself)
	@test -f services/media/.env || { cp services/media/.env.example services/media/.env; echo "Created services/media/.env from .env.example"; }
	cd services/media && go run ./cmd/api

media\:migrate: ## Apply media's Flyway migrations (requires infra:up)
	docker run --rm --network $(INFRA_PROJECT)_default \
		-v $(PWD)/services/media/migrations:/flyway/migrations:ro \
		flyway/flyway:11 \
		-url=jdbc:postgresql://postgres:5432/media \
		-user=media -password=media \
		-locations=filesystem:/flyway/migrations \
		-connectRetries=10 \
		migrate

media\:grpcui: ## Open grpcui against a running media service (host or docker-compose)
	grpcui -plaintext localhost:19095

media\:docker-build: ## Build media's Docker image
	docker build -f services/media/media.dockerfile -t media-notes/media:local .

media\:docker-up: ## Run media inside docker-compose, alongside infra (requires infra:up)
	$(COMPOSE) up -d --build media-migrate media

media\:docker-down: ## Stop media's docker-compose containers
	$(COMPOSE) rm -sf media media-migrate

media\:docker-logs: ## Follow media's docker-compose logs
	$(COMPOSE) logs -f media
