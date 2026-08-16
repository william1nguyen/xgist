# Aggregate targets across every v2 Go service. Per-service targets live in
# make/<service>.mk.

.PHONY: build\:v2 test\:v2 test\:v2-integration

build\:v2: ## Build every v2 Go service
	@for d in services/*/; do \
		[ -f "$$d/go.mod" ] && (echo "==> $$d" && cd "$$d" && go build ./...) || true; \
	done

test\:v2: ## Test every v2 Go service (unit tests only)
	@for d in services/*/; do \
		[ -f "$$d/go.mod" ] && (echo "==> $$d" && cd "$$d" && go test ./...) || true; \
	done

test\:v2-integration: ## Test every v2 Go service, including Testcontainers-backed integration tests (requires Docker)
	@for d in services/*/; do \
		[ -f "$$d/go.mod" ] && (echo "==> $$d" && cd "$$d" && V2_INTEGRATION_TESTS=1 go test ./...) || true; \
	done
