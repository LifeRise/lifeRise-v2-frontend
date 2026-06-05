# LifeRise — Agent Guide

This repository contains two independent codebases for the **LifeRise** property-management service marketplace:

1. **`lifeRise-go-backend/`** — Production Go backend API serving mobile clients and admin portals. Built with Go 1.26+ using Clean Architecture (Ports & Adapters).
2. **`lifeRise-v2-frontend/`** — Production-grade Next.js 16 web application for resident, vendor, and manager portals. Connected to the Go backend REST API and Supabase for auth. Can also run in mock/demo mode.

> **Important:** These are independent projects with different tech stacks, build processes, and data sources. Always verify which subdirectory you are working in before running commands or installing dependencies.

---

## Repository Layout

```
.
├── lifeRise-go-backend/          # Go 1.26 production backend
│   ├── cmd/                      # Entry-point binaries (api, vendor-api, admin-api, worker, migrate)
│   ├── internal/
│   │   ├── domain/               # GORM entities, repository interfaces, enums
│   │   ├── application/          # Use cases / application services
│   │   ├── adapters/             # HTTP handlers, middleware, Stripe, Firebase, email, queue tasks
│   │   └── infrastructure/       # Config (Viper), database (GORM), persistence implementations
│   ├── pkg/                      # Shared utilities (auth, errors, response, validation)
│   ├── tests/integration/        # Integration test suites
│   ├── migrations/               # golang-migrate SQL files
│   ├── docs/swagger.yaml         # OpenAPI specification
│   ├── Makefile                  # Build, test, lint, migrate, run targets
│   ├── config.example.yaml       # Configuration template
│   ├── docker-compose.yml        # Local MySQL + Redis + API stack
│   ├── Dockerfile.api            # API container build
│   ├── go.mod / go.sum           # Go module dependencies
│   └── AGENTS.md                 # Backend-specific agent guide
│
└── lifeRise-v2-frontend/         # Next.js 16 web application
    ├── app/                      # Next.js App Router pages
    ├── components/               # React components (layout, ui, modals, pwa)
    ├── lib/                      # Types, mock data, store, utils, animations, auth, hooks
    ├── public/                   # Static assets (PWA manifest, icons, sw.js)
    ├── scripts/                  # Utility scripts (icon generation)
    ├── package.json              # Dependencies + npm scripts
    ├── next.config.ts            # Next.js configuration
    ├── tsconfig.json             # TypeScript config
    ├── postcss.config.mjs        # PostCSS config (Tailwind v4)
    ├── eslint.config.mjs         # ESLint 9 flat config
    ├── middleware.ts             # Supabase session refresh middleware
    ├── app/globals.css           # Tailwind v4 theme + custom utilities
    └── AGENTS.md                 # Demo-specific agent guide
```

Each subdirectory contains its own `AGENTS.md` with deeper conventions. This root file provides the cross-project overview.

---

## `lifeRise-go-backend/` — Go Backend API

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

All commands must be run from inside `lifeRise-go-backend/`.

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
make run-api      # Customer API
make run-vendor   # Vendor API
make run-admin    # Admin API
make run-worker   # Background worker

# Database migrations
make migrate-up
make migrate-down
make migrate-version

# Docker
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

---

## `lifeRise-v2-frontend/` — Next.js Web Application

### Technology Stack

| Concern | Library / Tool | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.6 |
| React | react / react-dom | 19.2.4 |
| Language | TypeScript | ~5 |
| Styling | Tailwind CSS | 4.x |
| PostCSS | `@tailwindcss/postcss` | 4.x |
| Animation | Framer Motion | ~12.39 |
| Animation (legacy) | GSAP | ~3.15 |
| State | Zustand | ~5.0 |
| Charts | Recharts | ~3.8 |
| UI Primitives | Radix UI (avatar, dialog, dropdown, progress, scroll-area, select, separator, switch, tabs, tooltip) | latest |
| Icons | lucide-react | ~1.16 |
| Auth (optional) | `@supabase/supabase-js`, `@supabase/ssr` | 2.x |
| Fonts | Google Fonts via `next/font` — Syne (headings) + Inter (body) | — |

### Architecture

- **App Router:** Next.js 16 App Router. Most pages are `"use client"` for interactive state. Server components are opt-in.
- **No backend by default:** All data is hard-coded in `lib/mock-data.ts`. Do not write `fetch` calls expecting an API unless explicitly adding Supabase integration.
- **Dual-mode auth:** Works offline with mock auth by default. Can connect to a real Supabase backend by setting `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
- **Role-based layouts:** Three portals (resident, vendor, manager) each have their own `layout.tsx` rendering `<Sidebar>` and `<MobileNav>`.
- **PWA:** Service worker (`public/sw.js`) caches shell routes for offline access. Install prompt with engagement gating.

### Build & Development Commands

All commands must be run from inside `lifeRise-v2-frontend/`.

```bash
# Install dependencies
npm install

# Development server (localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint (ESLint 9 flat config)
npm run lint
```

### Code Style Guidelines

- **Tailwind v4:** Uses `@import "tailwindcss"` and `@theme` in `app/globals.css`. There is **no separate `tailwind.config.ts`**.
- **Design tokens:** Colors like `--color-midnight`, `--color-teal`, `--color-gold`, `--color-purple-accent` are defined in `globals.css` inside `@theme`.
- **Glassmorphism:** Surfaces use `.glass` or `.glass-dark` classes (backdrop blur + semi-transparent background).
- **Role accent colors:**
  - Resident: `#00D4AA` (teal)
  - Vendor: `#F5A623` (gold)
  - Manager: `#818CF8` (purple)
- **Typography:** Syne for headings (`font-heading`), Inter for body (`font-sans`).
- **Reusable components:** Prefer `<GlassCard>` for cards. Reuse animation variants from `lib/animations.ts`.
- **Dynamic imports:** Heavy components (charts, maps) are dynamically imported with `ssr: false` to avoid hydration mismatches.
- **Role accent colors at runtime** are passed via inline `style={{ color: accent, background: \`\${accent}18\` }}` rather than Tailwind arbitrary values.

### Testing Instructions

- **No test framework is currently configured.** There are no `*.test.*` or `*.spec.*` files in the project.
- Searching for tests only finds files inside `node_modules/`.

### Security Considerations

- This is a **frontend demo only**. No real authentication, authorization, API, or secrets when running in mock mode.
- The login page is cosmetic; the actual entry points are the "Quick Demo Access" role buttons.
- Mock auth stores sessions in `localStorage`. Pre-seeded demo accounts exist in `lib/auth/mock-auth.ts`.
- No sensitive data is handled in mock mode. Mock data uses fake emails and phone numbers.
- The service worker caches GET requests without origin restrictions — acceptable for a static demo but should be hardened if a real backend is introduced.
- When Supabase credentials are provided, auth state is managed via `@supabase/ssr` cookies and middleware session refresh.

---

## Cross-Project Notes for Agents

1. **Always check your working directory.** `lifeRise-go-backend/` and `lifeRise-v2-frontend/` are independent. Running `npm install` in the wrong folder will not install the needed dependencies.
2. **Do not assume Next.js 14 patterns** in the web demo. It is Next.js 16 with React 19 and Tailwind v4.
3. **Do not write backend API calls** in the web demo unless you are explicitly wiring Supabase integration. It has no backend by default.
4. **Do not put secrets in source files.** The Go backend uses `LIFERISE_*` environment variables. The web demo uses `.env.local` for optional Supabase credentials.
5. **Both folders have their own `package.json`, `tsconfig.json`, and lock files** (Go backend has `go.mod`/`go.sum`). Do not mix dependencies between them.
6. **Never leave development servers or background processes running after a task completes.** If you start `npm run dev`, `npm start`, `go run ./cmd/api`, or any other long-running process, you must terminate it before finishing. Always verify the port is released (e.g., port 3000 for Next.js, port 8080 for Go API) and kill any dangling processes you spawned.
7. **Refer to subdirectory `AGENTS.md` files** for deeper conventions specific to each codebase.
