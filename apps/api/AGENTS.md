# LifeRise — Backend Agent Guide (`apps/api/`)

This is the **Go backend** for the LifeRise property-management service marketplace. It lives at `apps/api/` inside the `LifeRise-Enterprise` monorepo.

> **Always run backend commands from `apps/api/`.** The repo root has no `go.mod`.
> The frontend lives at `apps/web/` — see `apps/web/AGENTS.md` and the root `AGENTS.md` for frontend conventions.

---

## Directory Layout

```
apps/api/
├── cmd/
│   ├── api/            # Customer-facing API entry point (port 8080)
│   ├── vendor-api/     # Vendor-facing API entry point (port 8081)
│   ├── admin-api/      # Admin/manager API entry point (port 8082)
│   ├── worker/         # Asynq background worker
│   └── migrate/        # Database migration CLI
├── internal/
│   ├── domain/         # GORM entities, repository interfaces, enums
│   ├── application/    # Use cases / application services
│   ├── adapters/       # HTTP handlers (Gin), Stripe, Firebase, email, Asynq tasks
│   └── infrastructure/ # Config (Viper), GORM connection, repository implementations
├── pkg/                # Shared utilities (auth/JWT, errors, response helpers, validation)
├── tests/
│   └── integration/    # In-memory fake-repo integration test suites
├── migrations/         # golang-migrate SQL files
├── docs/
│   └── swagger.yaml    # OpenAPI specification
├── Makefile            # Build, test, lint, migrate, run targets
├── railway.toml        # Railway deployment config
├── config.example.yaml # Configuration template (copy → config.yaml, gitignored)
├── docker-compose.yml  # Local MySQL + Redis + API stack
├── Dockerfile.api      # Customer API container
├── Dockerfile.vendor   # Vendor API container
├── Dockerfile.admin    # Admin API container
├── Dockerfile.worker   # Worker container
├── go.mod / go.sum     # Go module dependencies
└── AGENTS.md           # ← this file
```

---

## Go Backend API

### Technology Stack

| Concern | Library / Tool | Version |
|---|---|---|
| Language | Go | 1.26+ |
| Web Framework | Gin | 1.12.0 |
| ORM | GORM | 1.31.1 |
| Database Drivers | PostgreSQL (pgx), SQLite (glebarez), MySQL | various |
| Migrations | golang-migrate | 4.19.1 |
| Background Jobs | Asynq (Redis) | 0.26.0 |
| Auth | JWT (golang-jwt/jwt/v5, HS256), bcrypt | 5.3.1 |
| Validation | go-playground/validator | 10.30.2 |
| Payments | Stripe SDK | v81 |
| Push Notifications | Firebase Admin SDK | 4.20.0 |
| Config | Viper | 1.21.0 |
| Logging | Zap | 1.28.0 |
| Decimal | shopspring/decimal | 1.4.0 |
| Testing | testify | 1.11.1 |

### Architecture

**Clean Architecture / Ports & Adapters (Hexagonal):**

- **Domain** (`internal/domain/{module}/`) — Pure Go structs, enums, repository interfaces. No framework dependencies except GORM tags.
- **Application** (`internal/application/{module}/`) — Use cases orchestrate domain objects; depend only on domain interfaces.
- **Adapters** (`internal/adapters/`) — HTTP handlers (Gin), Stripe SDK wrapper, Firebase Admin, SMTP/email, Asynq task definitions.
- **Infrastructure** (`internal/infrastructure/`) — Viper config, GORM connection/pagination, repository implementations.
- **Shared Packages** (`pkg/`) — JWT service, bcrypt password hashing, Laravel-compatible JSON response helpers, application error types, validator wrappers.

### Entry Points

| Binary | Port | Purpose |
|--------|------|---------|
| `api` | 8080 | Customer-facing mobile API |
| `vendor-api` | 8081 | Vendor-facing API |
| `admin-api` | 8082 | Admin portal REST API (RBAC-protected) |
| `worker` | — | Asynq background worker (email, FCM push, booking reminders) |
| `migrate` | — | Database migration CLI |

### Build & Development Commands

All commands must be run from inside `apps/api/`.

```bash
# Download and tidy dependencies
make deps

# Build all binaries into ./build/
make build

# Run tests with race detection and coverage
make test

# Lint (golangci-lint)
make lint

# Format and vet
make fmt

# Run individual services
make run-api      # Customer API → :8080
make run-vendor   # Vendor API   → :8081
make run-admin    # Admin API    → :8082
make run-worker   # Background worker

# Database migrations
make migrate-up
make migrate-down
make migrate-version

# Docker (local stack)
make docker-build
make docker-compose-up
make docker-compose-down

# Clean build artifacts
make clean
```

### Code Style Guidelines

- **Go version:** 1.26+ (specified in `.golangci.yml` and `go.mod`).
- **Imports:** Grouped with `goimports`; local prefix `github.com/liferise/backend`.
- **Domain models:** One module per bounded context under `internal/domain/{module}/`. Preserve existing column names exactly (including camelCase like `serviceProviderId`).
- **Enums:** Typed string constants with a `Valid()` method.
- **Generated columns:** Marked read-only with `gorm:"->;column:name"`.
- **Soft deletes:** Use `gorm.DeletedAt`.
- **JSON fields:** Use `gorm.io/datatypes.JSON`.
- **Monetary fields:** Use `github.com/shopspring/decimal`.
- **API responses:** Always use `pkg/response.Success()`, `response.Error()`, or `response.ValidationError()`. Validation errors must match Laravel format: `{"message": "The given data was invalid.", "errors": {"field": ["message"]}}`. Pagination must include `data`, `links`, and `meta` keys.
- **Error handling:** Return `pkg/errors` sentinel errors (`ErrNotFound`, `ErrConflict`, etc.) from repositories.

### Testing Instructions

- **Unit tests:** `go test ./...` or `make test`.
- **Integration tests:** Located in `tests/integration/`. Currently use in-memory fake repositories (maps + mutexes). Four suites cover auth, booking, service, and Stripe use cases.
- **Coverage:** `make test` generates `coverage.out` and prints per-function coverage.

### Security Considerations

- **JWT:** HS256 symmetric signing. Access token expiry: 15 minutes. Refresh token expiry: 168 hours.
- **RBAC:** 8 roles (admin, sales, pmo, complex_manager, company_staff, service_provider, customer, api_consumer). Company-scoped roles support multi-tenancy.
- **Stripe:** Secret key and webhook secret are configuration-only (env var / YAML). Platform fee is **12%** — defined as `PlatformFeePercent = 12.0` in `internal/application/payment/stripe_usecase.go`. Webhook processing checks idempotency via `webhook_idempotencies` table.
- **Config:** All config keys map to env vars with `LIFERISE_` prefix. `config.yaml` contains credentials and must never be committed (it is currently in the repo — treat as a development convenience only).
- **Database:** Supports Supabase PostgreSQL (direct DSN or pooler). Docker Compose provides local MySQL + Redis for development.

### Environment Variables

All config keys have a `LIFERISE_` env-var equivalent (read by Viper). Key vars:

| Variable | Purpose |
|----------|---------|
| `LIFERISE_APP_ENV` | Set to `production` to enable Gin release mode |
| `LIFERISE_DATABASE_URL` | Supabase PostgreSQL connection string |
| `LIFERISE_JWT_SECRET` | Shared HS256 signing secret (min 32 chars) — **must be identical across all API services** |
| `LIFERISE_CORS_ALLOW_ORIGINS` | Comma-separated list of allowed frontend origins |
| `LIFERISE_STRIPE_SECRET_KEY` | Stripe secret key |
| `LIFERISE_STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `PORT` | Injected by Railway — takes priority over `LIFERISE_SERVER_PORT` |

> **Do not manually set `LIFERISE_SERVER_PORT` on Railway** — the platform injects `PORT` automatically and the config reads it first.

---

## Key Files for Backend Agents

| File | Why it matters |
|------|---------------|
| `internal/infrastructure/config/config.go` | Reads all `LIFERISE_*` env vars via Viper; `PORT` override logic lives here |
| `internal/adapters/http/middleware/cors.go` | CORS allow-list — update when adding new frontend origins |
| `internal/application/payment/stripe_usecase.go` | Platform fee constant (`PlatformFeePercent = 12.0`) — change here only |
| `pkg/response/` | Laravel-compatible JSON response helpers used by all handlers |
| `pkg/errors/` | Sentinel error types (`ErrNotFound`, `ErrConflict`, etc.) |
| `pkg/auth/` | JWT service (sign, verify, decode) |
| `migrations/` | golang-migrate SQL files — run with `make migrate-up` |
| `docs/swagger.yaml` | OpenAPI spec — keep in sync with handler changes |
| `railway.toml` | Railway deployment config (Dockerfile path, restart policy) |
| `config.example.yaml` | Template for local `config.yaml` (gitignored) |

---

## Agent Notes

1. **Always work from `apps/api/`** — the repo root has no `go.mod`.
2. **Never change the platform fee** without explicit user instruction. It is `12.0` in `stripe_usecase.go`.
3. **CORS must be updated** in `cors.go` or via `LIFERISE_CORS_ALLOW_ORIGINS` when adding new frontend domains.
4. **`PORT` takes priority** over `LIFERISE_SERVER_PORT` — this is intentional for Railway.
5. **`config.yaml` is gitignored** — copy from `config.example.yaml` and fill in real values for local dev.
6. **Never leave background processes running.** Kill `go run ./cmd/api` and release port 8080 before finishing a task.
7. **Frontend lives at `apps/web/`** — see root `AGENTS.md` and `apps/web/AGENTS.md` for frontend conventions.

## Strict Operational Rules

The following rules are mandatory and designed to prevent architectural drift and hallucinations encountered during implementation.

### 1. Zero-Hallucination Policy (Digital Oath)

The agent must operate under a "digital oath" of factual accuracy. Every claim, summary, or architectural statement made regarding the current state of the repository must be verified against the actual files. Assumptions about existing logic, schema structures, or available variables are strictly prohibited.

### 2. Pre-Edit Verification Loop

Before performing any file modification or finalizing an implementation plan, the agent must explicitly verify the target code's current state. This ensures that the plan is grounded in reality rather than an outdated or assumed mental model of the codebase.

### 3. Mandatory Visual Grounding

If a screenshot or image is provided (such as the legacy dashboard UI), the agent must perform a comprehensive analysis of every visible element, label, and data point. The agent is forbidden from assuming the contents of an image; it must map visual components directly to technical requirements and database entities.
