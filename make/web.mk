# web app: standalone Vite/React Router SPA talking to hermes's GraphQL API.
# See services/web/ and docs/architecture.md.

.PHONY: web\:install web\:dev web\:build web\:lint web\:typecheck web\:test web\:codegen \
	web\:docker-build web\:docker-up web\:docker-down web\:docker-logs

web\:install: ## Install web's dependencies from its own lockfile
	cd services/web && pnpm install --frozen-lockfile

web\:dev: ## Start the web dev server (proxies /graphql to a locally running hermes)
	@test -f services/web/.env || { cp services/web/.env.example services/web/.env; echo "Created services/web/.env from .env.example"; }
	cd services/web && pnpm dev

web\:build: ## Build web for production
	cd services/web && pnpm build

web\:lint: ## Lint web
	cd services/web && pnpm lint

web\:typecheck: ## Type-check web
	cd services/web && pnpm check-types

web\:test: ## Run web's unit tests
	cd services/web && pnpm test

web\:codegen: ## Regenerate web's GraphQL types from hermes's schema
	cd services/web && pnpm codegen

web\:docker-build: ## Build web's Docker image
	docker build -f services/web/Dockerfile -t media-notes/web:local .

web\:docker-up: ## Run web inside docker-compose, alongside hermes (requires infra:up and hermes up)
	$(COMPOSE) up -d --build web

web\:docker-down: ## Stop web's docker-compose container
	$(COMPOSE) rm -sf web

web\:docker-logs: ## Follow web's docker-compose logs
	$(COMPOSE) logs -f web
