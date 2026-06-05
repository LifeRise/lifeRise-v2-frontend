# LifeRise Enterprise — Monorepo Makefile
# Targets the post-migration structure:
#   apps/web  → Next.js frontend
#   apps/api  → Go backend
#
# Prerequisites:
#   - Node.js + npm  (frontend)
#   - Go 1.26+       (backend)
#   - Docker + Docker Compose (docker-* targets)
#   - golangci-lint  (lint-api target)
#
# Windows users: run via Git Bash, WSL, or install Make for Windows.
# Alternatively, use the scripts in apps/api/ (run_all.bat / run_api.bat).

.PHONY: install install-web install-api \
        dev dev-web dev-api \
        run-all run-api run-vendor run-admin run-worker \
        build build-web build-api \
        test test-api \
        lint lint-web lint-api \
        migrate-up migrate-down migrate-version \
        docker-build docker-up docker-down docker-logs \
        clean clean-web clean-api

# ── Paths ─────────────────────────────────────────────────────────────────────
WEB_DIR := apps/web
API_DIR := apps/api

# ── Install ───────────────────────────────────────────────────────────────────
## Install all dependencies for both apps.
install: install-web install-api

install-web:
	cd $(WEB_DIR) && npm install

install-api:
	cd $(API_DIR) && go mod download && go mod tidy

# ── Development ───────────────────────────────────────────────────────────────
## Start frontend (Next.js dev server on :3000) and all backend APIs concurrently.
dev:
	$(MAKE) -j2 dev-web dev-api

## Start Next.js dev server only.
dev-web:
	cd $(WEB_DIR) && npm run dev

## Start the customer API (port 8080) only.
dev-api:
	cd $(API_DIR) && go run ./cmd/api

## Start all backend services (customer :8080, vendor :8081, admin :8082).
run-api:
	cd $(API_DIR) && go run ./cmd/api

run-vendor:
	cd $(API_DIR) && go run ./cmd/vendor-api

run-admin:
	cd $(API_DIR) && go run ./cmd/admin-api

run-worker:
	cd $(API_DIR) && go run ./cmd/worker

## Start frontend + all three backend APIs + worker concurrently.
run-all:
	$(MAKE) -j5 dev-web run-api run-vendor run-admin run-worker

# ── Build ─────────────────────────────────────────────────────────────────────
## Build both the frontend (Next.js) and all backend binaries.
build: build-web build-api

build-web:
	cd $(WEB_DIR) && npm run build

build-api:
	cd $(API_DIR) && \
		mkdir -p build && \
		go build -o build/api-server    ./cmd/api && \
		go build -o build/vendor-server ./cmd/vendor-api && \
		go build -o build/admin-server  ./cmd/admin-api && \
		go build -o build/worker        ./cmd/worker && \
		go build -o build/migrate       ./cmd/migrate
	@echo "Backend binaries written to $(API_DIR)/build/"

# ── Test ──────────────────────────────────────────────────────────────────────
test: test-api

test-api:
	cd $(API_DIR) && go test -race -coverprofile=coverage.out ./...
	cd $(API_DIR) && go tool cover -func=coverage.out

# ── Lint ──────────────────────────────────────────────────────────────────────
lint: lint-web lint-api

lint-web:
	cd $(WEB_DIR) && npm run lint

lint-api:
	cd $(API_DIR) && golangci-lint run ./...

# ── Migrations ────────────────────────────────────────────────────────────────
## Run database migrations up.
migrate-up:
	cd $(API_DIR) && go run ./cmd/migrate -direction=up

## Roll back the last migration.
migrate-down:
	cd $(API_DIR) && go run ./cmd/migrate -direction=down

## Show current migration version.
migrate-version:
	cd $(API_DIR) && go run ./cmd/migrate -direction=version

# ── Docker ────────────────────────────────────────────────────────────────────
## Build all Docker images (mysql, redis, api, vendor-api, admin-api, web).
docker-build:
	docker compose build

## Start all services in detached mode.
docker-up:
	docker compose up -d

## Stop all services and remove containers.
docker-down:
	docker compose down

## Tail logs from all running services.
docker-logs:
	docker compose logs -f

# ── Clean ─────────────────────────────────────────────────────────────────────
clean: clean-web clean-api

clean-web:
	cd $(WEB_DIR) && rm -rf .next/

clean-api:
	cd $(API_DIR) && rm -rf build/ coverage.out

# ── Help ──────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "LifeRise Enterprise — available targets:"
	@echo ""
	@echo "  make install       Install all deps (npm + go mod)"
	@echo "  make dev           Start frontend + customer API concurrently"
	@echo "  make run-all       Start frontend + all 3 APIs + worker"
	@echo "  make build         Build Next.js app + Go binaries"
	@echo "  make test          Run Go test suite"
	@echo "  make lint          Lint frontend (ESLint) + backend (golangci-lint)"
	@echo "  make migrate-up    Run DB migrations up"
	@echo "  make migrate-down  Roll back last migration"
	@echo "  make docker-up     Start full stack via Docker Compose"
	@echo "  make docker-down   Stop Docker Compose stack"
	@echo "  make clean         Remove build artefacts"
	@echo ""
