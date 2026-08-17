# Shared Buf module at contracts/ — protobuf contracts for every v2 service.

.PHONY: proto\:lint proto\:generate proto\:generate-python

proto\:lint: ## Lint the v2 protobuf contracts
	cd contracts && buf lint

proto\:generate: ## Generate v2 protobuf Go stubs
	cd contracts && buf generate

proto\:generate-python: ## Generate v2 protobuf Python stubs (used by worker) into contracts/gen/python
	cd services/worker && uv sync --group dev --quiet
	cd services/worker && uv run python -m grpc_tools.protoc \
		-I ../../contracts/proto \
		--python_out=../../contracts/gen/python \
		--grpc_python_out=../../contracts/gen/python \
		--pyi_out=../../contracts/gen/python \
		../../contracts/proto/media_notes/media/v1/media.proto \
		../../contracts/proto/media_notes/content/v1/content.proto \
		../../contracts/proto/media_notes/billing/v1/billing.proto \
		../../contracts/proto/media_notes/identity/v1/identity.proto
