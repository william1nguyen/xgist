# hermes service: public GraphQL gateway, no database of its own.
# See services/hermes/ and docs/services/hermes.md.

.PHONY: hermes\:build hermes\:test hermes\:run \
	hermes\:docker-build hermes\:docker-up hermes\:docker-down hermes\:docker-logs

hermes\:build: ## Build hermes
	cd services/hermes && go build ./...

hermes\:test: ## Run hermes's unit tests
	cd services/hermes && go test ./...

hermes\:run: ## Run hermes locally against dockerized infra and services (loads services/hermes/.env itself)
	@test -f services/hermes/.env || { cp services/hermes/.env.example services/hermes/.env; echo "Created services/hermes/.env from .env.example"; }
	cd services/hermes && go run ./cmd/hermes

hermes\:docker-build: ## Build hermes's Docker image
	docker build -f services/hermes/hermes.dockerfile -t media-notes/hermes:local .

hermes\:docker-up: ## Run hermes inside docker-compose, alongside infra and the services it calls (requires infra:up and identity/billing/media/content up)
	$(COMPOSE) up -d --build hermes

hermes\:docker-down: ## Stop hermes's docker-compose container
	$(COMPOSE) rm -sf hermes

hermes\:docker-logs: ## Follow hermes's docker-compose logs
	$(COMPOSE) logs -f hermes
