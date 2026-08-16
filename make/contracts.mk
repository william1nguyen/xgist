# Shared Buf module at contracts/ — protobuf contracts for every v2 service.

.PHONY: proto\:lint proto\:generate

proto\:lint: ## Lint the v2 protobuf contracts
	cd contracts && buf lint

proto\:generate: ## Generate v2 protobuf Go stubs
	cd contracts && buf generate
