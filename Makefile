SHELL := /bin/sh

INFRA_PROJECT := media-notes
INFRA_COMPOSE_FILE := docker-compose.yml
COMPOSE := docker compose -f $(INFRA_COMPOSE_FILE) -p $(INFRA_PROJECT)

.DEFAULT_GOAL := help

.PHONY: help install dev\:web dev\:server dev\:worker build lint typecheck test check \
	db\:migrate db\:studio infra\:up infra\:down infra\:purge

help: ## Show available commands
	@awk 'BEGIN {FS = ": ## "; printf "Usage: make <target>\n\nTargets:\n"} /^[a-zA-Z0-9_\\:-]+: ## / {name = $$1; gsub(/\\/, "", name); printf "  %-16s %s\n", name, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies from the lockfile
	pnpm install --frozen-lockfile

dev\:web: ## Start the web application
	pnpm dev:web

dev\:server: ## Start the API server
	pnpm dev:server

dev\:worker: ## Build and start the worker
	@test -f apps/worker/.env || { cp apps/worker/.env.example apps/worker/.env; echo "Created apps/worker/.env from .env.example"; }
	$(COMPOSE) up --build worker

build: ## Build all applications
	pnpm build

lint: ## Lint the codebase
	pnpm lint

typecheck: ## Type-check the codebase
	pnpm check-types

test: ## Run all tests
	pnpm test

check: ## Run the same checks as CI
	pnpm build
	pnpm lint
	pnpm check-types
	pnpm test

db\:migrate: ## Run database migrations
	pnpm db:migrate

db\:studio: ## Open Drizzle Studio
	pnpm db:studio

infra\:up: ## Start infrastructure
	$(COMPOSE) up -d

infra\:down: ## Stop infrastructure
	$(COMPOSE) down

infra\:purge: ## Remove infrastructure completely
	$(COMPOSE) down --rmi local -v
	docker system prune -a -f
	docker volume prune -a -f
