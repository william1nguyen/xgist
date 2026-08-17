SHELL := /bin/sh

INFRA_PROJECT := media-notes
INFRA_COMPOSE_FILE := docker-compose.yml
COMPOSE := docker compose -f $(INFRA_COMPOSE_FILE) -p $(INFRA_PROJECT)

.DEFAULT_GOAL := help

.PHONY: help install build lint typecheck test check

help: ## Show available commands
	@awk 'BEGIN {FS = ": ## "; printf "Usage: make <target>\n\nTargets:\n"} /^[a-zA-Z0-9_\\:-]+: ## / {name = $$1; gsub(/\\/, "", name); printf "  %-16s %s\n", name, $$2}' $(MAKEFILE_LIST)

install: ## Install web dependencies from the lockfile
	$(MAKE) web\:install

build: ## Build the web app and every v2 service
	$(MAKE) build\:v2 web\:build

lint: ## Lint the web app
	$(MAKE) web\:lint

typecheck: ## Type-check the web app
	$(MAKE) web\:typecheck

test: ## Run web and v2 service tests
	$(MAKE) test\:v2 web\:test

check: ## Run the same checks as CI
	$(MAKE) build lint typecheck test

# Web app and v2 services/infrastructure: each has its own makefile under
# make/, included here so this file stays an index rather than growing per
# service. Run `make help` after editing to confirm every target still lists.
include make/*.mk
