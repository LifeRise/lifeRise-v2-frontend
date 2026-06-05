.PHONY: all build test lint migrate-up migrate-down run-api run-vendor run-admin run-all run-worker clean

# Build variables
BINARY_API=api-server
BINARY_VENDOR=vendor-server
BINARY_ADMIN=admin-server
BINARY_WORKER=worker
BINARY_MIGRATE=migrate
BUILD_DIR=./build
GO=go
GOLANGCI_LINT=golangci-lint

# Load environment variables from .env if it exists
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

all: lint test build

build:
	mkdir -p $(BUILD_DIR)
	$(GO) build -o $(BUILD_DIR)/$(BINARY_API) ./cmd/api
	$(GO) build -o $(BUILD_DIR)/$(BINARY_VENDOR) ./cmd/vendor-api
	$(GO) build -o $(BUILD_DIR)/$(BINARY_ADMIN) ./cmd/admin-api
	$(GO) build -o $(BUILD_DIR)/$(BINARY_WORKER) ./cmd/worker
	$(GO) build -o $(BUILD_DIR)/$(BINARY_MIGRATE) ./cmd/migrate

test:
	$(GO) test -race -coverprofile=coverage.out ./...
	$(GO) tool cover -func=coverage.out

lint:
	$(GOLANGCI_LINT) run ./...

fmt:
	$(GO) fmt ./...
	$(GO) vet ./...

migrate-up:
	$(GO) run ./cmd/migrate -direction=up

migrate-down:
	$(GO) run ./cmd/migrate -direction=down

migrate-version:
	$(GO) run ./cmd/migrate -direction=version

run-api:
	$(GO) run ./cmd/api

run-vendor:
	$(GO) run ./cmd/vendor-api

run-admin:
	$(GO) run ./cmd/admin-api

run-all:
	@echo "Starting all backend services..."
	@echo "  API        -> http://localhost:8080"
	@echo "  Vendor API -> http://localhost:8081"
	@echo "  Admin API  -> http://localhost:8082"
	@echo ""
	@bash ./run_all.sh

run-worker:
	$(GO) run ./cmd/worker

clean:
	rm -rf $(BUILD_DIR)
	rm -f coverage.out
	rm -f api vendor-api admin-api

deps:
	$(GO) mod download
	$(GO) mod tidy

# Docker targets
docker-build:
	docker build -t liferise/backend-api:latest -f Dockerfile.api .
	docker build -t liferise/backend-vendor:latest -f Dockerfile.vendor .
	docker build -t liferise/backend-admin:latest -f Dockerfile.admin .
	docker build -t liferise/backend-worker:latest -f Dockerfile.worker .

docker-compose-up:
	docker-compose up -d

docker-compose-down:
	docker-compose down

# Generate mocks (requires mockery or gomock)
generate:
	$(GO) generate ./...
