# LifeRise Backend Migration: Technical Roadmap — Initial Phase

**From:** Laravel 12 (PHP 8.2) → Go 1.24  
**Architecture:** Modular Monolith (Clean Architecture / Ports & Adapters)  
**Prepared:** 2026-05-14  
**Status:** Phase 0 — Foundation & Planning

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [Architecture Mapping: Laravel → Go](#2-architecture-mapping-laravel--go)
3. [Feature Parity & Prioritization](#3-feature-parity--prioritization)
4. [API Consistency Strategy](#4-api-consistency-strategy)
5. [Implementation Strategy: Modular Monolith](#5-implementation-strategy-modular-monolith)
6. [Phase 0 Deliverables (Weeks 1-4)](#6-phase-0-deliverables-weeks-1-4)
7. [Phase 1 Deliverables (Weeks 5-8)](#7-phase-1-deliverables-weeks-5-8)
8. [Appendix: Tech Stack Decisions](#appendix-tech-stack-decisions)

---

## 1. Executive Overview

This document translates the high-level `MigrationPlan.md` into an executable technical roadmap for the **initial phase** of the LifeRise backend migration. The existing Laravel application is a mature, multi-tenant service marketplace with:

- **53 Eloquent models** across 50+ tables
- **172 migrations** spanning 2+ years of schema evolution
- **137 controllers** serving customer mobile apps, vendor mobile apps, complex manager web portals, and an AdminLTE admin dashboard
- **8 distinct user roles** with company-scoped permissions
- **Stripe Connect** marketplace payments with 12% platform fee logic
- **Firebase Cloud Messaging** for push notifications
- **L5-Swagger OpenAPI 3.0** spec (~9,500 lines JSON)

The Go rewrite will adopt a **modular monolith** architecture (not microservices) to minimize operational complexity during the transition while preserving Clean Architecture boundaries that allow future extraction if needed.

---

## 2. Architecture Mapping: Laravel → Go

### 2.1 Structural Translation Matrix

| Laravel Concept | Go Equivalent | Location in Go Project |
|-----------------|---------------|------------------------|
| `app/Models` (Eloquent) | GORM structs + domain entities | `internal/domain/{module}/entities.go` |
| `app/Http/Controllers` | Gin handlers + DTOs | `internal/adapters/http/handlers/` |
| `app/Services` | Use cases / application services | `internal/application/{module}/` |
| `app/Traits` (ApiResponse, etc.) | Shared packages | `pkg/response/`, `pkg/errors/` |
| `routes/*.php` | Route registration | `internal/adapters/http/routes.go` |
| `database/migrations` | SQL migrations (golang-migrate) | `migrations/` |
| `app/Jobs` | Asynq task handlers | `internal/adapters/queue/tasks/` |
| `app/Mail` | Email use cases | `internal/application/notification/` |
| `app/Middleware` | Gin middleware chain | `internal/adapters/http/middleware/` |
| `config/*.php` | Viper configuration | `internal/infrastructure/config/` |
| `storage/` | S3/Local file storage adapter | `internal/adapters/storage/` |

### 2.2 Eloquent → GORM: Model Translation Rules

The Laravel application uses **direct Eloquent models without repositories**. The Go migration will introduce explicit repository interfaces to enable testing and future database flexibility.

#### Rule 1: One Domain Module Per Bounded Context

```text
Laravel: app/Models/Booking.php, app/Models/AvailableSlot.php, app/Models/BookingAvailableSlot.php
Go:      internal/domain/booking/entities.go (all three structs)
```

#### Rule 2: Preserve Column Names Exactly

The `feedbacks` table uses camelCase columns (`serviceProviderId`, `bookingId`) — these must be preserved verbatim in GORM tags to avoid schema rewrites:

```go
type Feedback struct {
    ID                uint64     `gorm:"column:id;primaryKey"`
    ServiceProviderID uint64     `gorm:"column:serviceProviderId;not null"`
    BookingID         *uint64    `gorm:"column:bookingId"`
    CustomerID        uint64     `gorm:"column:customerId;not null"`
    ServiceID         *uint64    `gorm:"column:serviceId"`
    ServiceDate       *time.Time `gorm:"column:serviceDate;type:datetime"`
    Rating            *float64   `gorm:"column:rating"`
    Review            *string    `gorm:"column:review;type:text"`
    Images            datatypes.JSON `gorm:"column:images"`
    CreatedAt         time.Time  `gorm:"column:created_at;autoCreateTime"`
    UpdatedAt         time.Time  `gorm:"column:updated_at;autoUpdateTime"`
}

func (Feedback) TableName() string { return "feedbacks" }
```

#### Rule 3: Generated Columns Are Read-Only

The Laravel migration `2025_10_08_151952_alter_users_unique_email_when_verified.php` creates MySQL STORED generated columns for verified-user uniqueness. These **must** remain in the database and be marked read-only in GORM:

```sql
-- Preserved verbatim in 0001_baseline.up.sql
ALTER TABLE `users`
ADD COLUMN `email_unique_if_verified` VARCHAR(255)
    GENERATED ALWAYS AS (IF(`email_verified_at` IS NULL, NULL, `email`)) STORED,
ADD COLUMN `phone_unique_if_verified` VARCHAR(50)
    GENERATED ALWAYS AS (IF(`email_verified_at` IS NULL, NULL, `phone`)) STORED;

CREATE UNIQUE INDEX `users_email_verified_unique` ON `users` (`email_unique_if_verified`);
CREATE UNIQUE INDEX `users_phone_verified_unique` ON `users` (`phone_unique_if_verified`);
```

```go
type User struct {
    Email                 string  `gorm:"size:255"`
    Phone                 string  `gorm:"size:50"`
    EmailVerifiedAt       *time.Time
    EmailUniqueIfVerified *string `gorm:"->;column:email_unique_if_verified"` // read-only
    PhoneUniqueIfVerified *string `gorm:"->;column:phone_unique_if_verified"` // read-only
}
```

#### Rule 4: ENUMs Become Typed Constants

All MySQL ENUMs convert to application-level validation with `VARCHAR` storage:

```go
type BookingStatus string

const (
    BookingStatusCurrent   BookingStatus = "Current"
    BookingStatusPending   BookingStatus = "Pending"
    BookingStatusConfirmed BookingStatus = "Confirmed"
    BookingStatusCompleted BookingStatus = "Completed"
    BookingStatusCancelled BookingStatus = "Cancelled"
    BookingStatusRejected  BookingStatus = "Rejected"
)

func (s BookingStatus) Valid() bool {
    switch s {
    case BookingStatusCurrent, BookingStatusPending, BookingStatusConfirmed,
         BookingStatusCompleted, BookingStatusCancelled, BookingStatusRejected:
        return true
    }
    return false
}
```

#### Rule 5: Soft Deletes Stay Native

Laravel's `SoftDeletes` trait maps directly to GORM's `gorm.DeletedAt`:

```go
import "gorm.io/gorm"

type AvailableSlot struct {
    ID        uint64         `gorm:"primaryKey"`
    // ...
    DeletedAt gorm.DeletedAt `gorm:"index"`
}
```

### 2.3 Migration Consolidation Strategy

Instead of translating 172 Laravel migrations one-to-one, create a **single baseline migration** representing the current production schema:

```text
migrations/
├── 0001_baseline.up.sql          -- mysqldump --no-data of current schema
├── 0001_baseline.down.sql        -- DROP TABLE for all tables
├── 0002_seed_roles.up.sql        -- INSERT roles, permissions, admin user
└── 0002_seed_roles.down.sql
```

**Why baseline instead of 1:1 migrations?**
- Laravel migrations contain dead code (added/dropped columns that no longer exist)
- The production schema is the single source of truth
- `golang-migrate` manages future schema changes from this baseline
- GORM `AutoMigrate` is **disabled in production** — only used for dev/test schema validation

**Critical preservation checklist for baseline:**
- [ ] All foreign key constraints
- [ ] All unique indexes (especially custom-named ones like `favorites_unique`)
- [ ] Generated columns (`email_unique_if_verified`, `phone_unique_if_verified`)
- [ ] Composite indexes from Laravel's `index()` calls
- [ ] Full-text indexes if any exist

---

## 3. Feature Parity & Prioritization

### 3.1 Critical Path Services (Must-Have for Mobile App Functionality)

These three services are **non-negotiable** because the mobile apps depend on them for core functionality. They must be implemented first and verified via contract testing before any traffic migration.

#### A. Authentication & RBAC (Priority: P0)

**Laravel Implementation:**
- Sanctum token auth for mobile APIs
- Laravel Breeze session auth for AdminLTE
- Custom `roles` + `permissions` + `role_permissions` + `role_user` tables
- OTP system (`customer_otps`, `user_otps` tables)
- Password reset via token + OTP code

**Go Implementation:**

```go
// internal/domain/user/entities.go
type User struct {
    ID        uint64    `gorm:"primaryKey"`
    FirstName string    `gorm:"size:255"`
    LastName  string    `gorm:"size:255"`
    Email     string    `gorm:"size:255;index"`
    PasswordHash string `gorm:"size:255"`
    RoleID    *uint64
    // ... 30+ fields
}

type Customer struct {
    ID           uint64  `gorm:"primaryKey"`
    FirstName    string  `gorm:"size:255"`
    LastName     string  `gorm:"size:255"`
    Email        string  `gorm:"size:255;uniqueIndex"`
    PasswordHash string  `gorm:"size:255"`
    // ... 15+ fields
}
```

**JWT Strategy (Mobile Apps):**
- Short-lived access tokens (15 minutes, HS256)
- Long-lived refresh tokens (7 days) stored in Redis
- JWT claims must include: `sub` (user ID), `type` ("customer" | "user"), `roles`, `permissions`, `email_verified_at`, `timezone`
- **Critical compatibility requirement:** Mobile apps currently parse Laravel Sanctum responses. The Go JWT must use identical claim names and signing algorithm.

```go
// pkg/auth/jwt.go
type Claims struct {
    jwt.RegisteredClaims
    UserID    uint64   `json:"sub"`
    UserType  string   `json:"type"`  // "customer" | "user"
    Roles     []string `json:"roles"`
    Permissions []string `json:"permissions"`
    Timezone  string   `json:"timezone,omitempty"`
    EmailVerifiedAt *int64 `json:"email_verified_at,omitempty"`
}
```

**Session Strategy (Admin Portal):**
- Gorilla Sessions backed by Redis
- Cookie-based auth for AdminLTE Blade pages
- CSRF token generation for form submissions

**RBAC Implementation:**

The Laravel system supports **8+ roles** with company-scoped assignments:

| Role | Slug | Scope |
|------|------|-------|
| Super Admin | `admin` | Global |
| Sales | `sales` | Global (read-mostly) |
| PMO | `pmo` | Global (read-mostly) |
| Complex Manager | `complex_manager` | Company-scoped |
| Company Staff | `company_staff` | Company-scoped |
| Service Provider | `service_provider` | Self + Company |
| Customer | `customer` | Self-only |
| API Consumer | `api_consumer` | Scoped token |

The Go RBAC middleware must handle **dynamic company-scoped permissions**: a user can be `company_staff` for Company A and `service_provider` for Company B simultaneously.

```go
// internal/adapters/http/middleware/rbac.go
func RequireCompanyScopedRole(allowedRoles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        claims := auth.ExtractClaims(c)
        companyID := extractCompanyIDFromPath(c) // e.g., /api/companies/:id/...
        
        for _, assignment := range claims.RoleAssignments {
            if slices.Contains(allowedRoles, assignment.Role) {
                // If no company scope required, or scope matches
                if assignment.CompanyID == nil || *assignment.CompanyID == companyID {
                    c.Set("company_id", assignment.CompanyID)
                    c.Next()
                    return
                }
            }
        }
        c.AbortWithStatusJSON(403, gin.H{"error": "insufficient permissions"})
    }
}
```

#### B. Stripe Connect Payments (Priority: P0)

**Laravel Implementation:** `StripeService.php` (570 lines) handles:
- PaymentIntent creation/confirmation
- Customer payment method storage
- Refund processing
- **Stripe Connect** marketplace with 12% platform fee
- `releasePayment()` — transfers to vendor + platform fee to LifeRise
- Webhook handling with event processing

**Go Implementation:**

```go
// internal/domain/payment/entities.go
type StripePayment struct {
    ID                    uint64          `gorm:"primaryKey"`
    BookingID             *uint64
    CustomerID            *uint64
    StripePaymentIntentID string          `gorm:"size:255;uniqueIndex"`
    Amount                decimal.Decimal `gorm:"type:decimal(10,2)"`
    Currency              string          `gorm:"size:3"`
    Status                string          `gorm:"size:50"`
    Description           string          `gorm:"type:text"`
    BillingDetails        datatypes.JSON
    Metadata              datatypes.JSON
    CreatedAt             time.Time
    UpdatedAt             time.Time
}

type UserStripeConnect struct {
    ID                 uint64  `gorm:"primaryKey"`
    UserID             uint64  `gorm:"uniqueIndex"`
    StripeAccountID    string  `gorm:"size:255"`
    Status             string  `gorm:"size:50"` // "pending", "active", "restricted"
    // ...
}
```

**Platform Fee Logic (12%):**

```go
// internal/application/payment/stripe_usecase.go
const PlatformFeePercent = 12.0

func (uc *StripeUseCase) CalculatePlatformFee(amount decimal.Decimal) decimal.Decimal {
    return amount.Mul(decimal.NewFromFloat(PlatformFeePercent)).Div(decimal.NewFromInt(100))
}

func (uc *StripeUseCase) ReleasePayment(ctx context.Context, bookingID uint64) error {
    return uc.db.Transaction(func(tx *gorm.DB) error {
        payment, err := uc.paymentRepo.GetByBookingID(ctx, tx, bookingID)
        if err != nil {
            return err
        }
        
        booking, err := uc.bookingRepo.GetByID(ctx, tx, bookingID)
        if err != nil {
            return err
        }
        
        providerConnect, err := uc.connectRepo.GetByUserID(ctx, tx, booking.ServiceProviderID)
        if err != nil {
            return err
        }
        
        platformFee := uc.CalculatePlatformFee(payment.Amount)
        vendorAmount := payment.Amount.Sub(platformFee)
        
        // Transfer to vendor's Connect account
        _, err = uc.stripeClient.Transfers.New(&stripe.TransferParams{
            Amount:        stripe.Int64(vendorAmount.Mul(decimal.NewFromInt(100)).IntPart()), // cents
            Currency:      stripe.String(payment.Currency),
            Destination:   stripe.String(providerConnect.StripeAccountID),
            TransferGroup: stripe.String(fmt.Sprintf("booking_%d", bookingID)),
        })
        if err != nil {
            return fmt.Errorf("transfer to vendor failed: %w", err)
        }
        
        // Platform fee captured automatically via Stripe Connect configuration
        return uc.paymentRepo.MarkAsReleased(ctx, tx, payment.ID, platformFee)
    })
}
```

**Webhook Idempotency (Critical for Cutover):**

```go
// internal/adapters/stripe/webhook_handler.go
type WebhookIdempotency struct {
    ID          uint64    `gorm:"primaryKey"`
    EventID     string    `gorm:"size:255;uniqueIndex"`
    EventType   string    `gorm:"size:100"`
    ProcessedAt time.Time
}

func (h *WebhookHandler) HandleWebhook(c *gin.Context) {
    event, err := h.stripeClient.Webhooks.ConstructEvent(payload, signature, h.webhookSecret)
    if err != nil {
        c.AbortWithStatusJSON(400, gin.H{"error": "invalid signature"})
        return
    }
    
    // Idempotency check
    exists, err := h.idempotencyRepo.Exists(c.Request.Context(), event.ID)
    if err != nil || exists {
        c.JSON(200, gin.H{"status": "already processed"})
        return
    }
    
    // Process event...
    // Store idempotency record in same transaction as business logic
}
```

#### C. Firebase Cloud Messaging (Priority: P0)

**Laravel Implementation:** `FirebaseService.php` (142 lines) using `kreait/firebase-php`

**Go Implementation:**

```go
// internal/adapters/firebase/fcm.go
package firebase

import (
    "context"
    firebase "firebase.google.com/go/v4"
    "firebase.google.com/go/v4/messaging"
)

type FCMClient struct {
    client *messaging.Client
}

func NewFCMClient(ctx context.Context, credentialsPath string) (*FCMClient, error) {
    app, err := firebase.NewApp(ctx, nil, option.WithCredentialsFile(credentialsPath))
    if err != nil {
        return nil, err
    }
    client, err := app.Messaging(ctx)
    if err != nil {
        return nil, err
    }
    return &FCMClient{client: client}, nil
}

func (f *FCMClient) SendToDevice(ctx context.Context, token string, title, body string, data map[string]string) error {
    message := &messaging.Message{
        Token: token,
        Notification: &messaging.Notification{
            Title: title,
            Body:  body,
        },
        Data: data,
        Android: &messaging.AndroidConfig{
            Priority: "high",
        },
        APNS: &messaging.APNSConfig{
            Payload: &messaging.APNSPayload{
                Aps: &messaging.Aps{
                    Sound: "default",
                },
            },
        },
    }
    _, err := f.client.Send(ctx, message)
    return err
}

func (f *FCMClient) SendToDevices(ctx context.Context, tokens []string, title, body string, data map[string]string) (*messaging.BatchResponse, error) {
    message := &messaging.MulticastMessage{
        Tokens: tokens,
        Notification: &messaging.Notification{
            Title: title,
            Body:  body,
        },
        Data: data,
    }
    return f.client.SendMulticast(ctx, message)
}
```

### 3.2 High-Priority Services (P1)

| Service | Laravel Location | Complexity | Rationale |
|---------|-----------------|------------|-----------|
| Booking Engine | `BookingController`, `Booking.php`, `AvailableSlot.php` | HIGH | Core revenue engine; transaction-level reliability required |
| Vendor Onboarding | `VerificationDocumentPortalService.php`, `UserDocument.php` | MEDIUM | Blocks vendor operations if broken |
| Favorites | `FavoriteController`, pivot tables | LOW | High user visibility, well-understood pattern |
| Promo Codes | `PromoCodeService.php` (241 lines) | MEDIUM | Welcome offers auto-applied at registration |

### 3.3 Medium-Priority Services (P2)

| Service | Laravel Location | Complexity | Rationale |
|---------|-----------------|------------|-----------|
| Calendar Events | `CalendarEventController`, event bookings | MEDIUM | Distinct from service bookings but shared slot logic |
| Document Management | `DocumentsChecklist`, S3 upload | MEDIUM | Compliance-critical but lower traffic |
| Notifications (Email) | `Jobs/`, `Mail/` | MEDIUM | Async delivery via Asynq |
| Admin REST API | `AdminController` (35+ controllers) | MEDIUM | Internal operational efficiency |

---

## 4. API Consistency Strategy

### 4.1 Contract Preservation Requirements

The mobile applications (iOS/Android) must function **without modification** during the transition. This means:

1. **Identical request/response JSON shapes** — every field name, type, and nesting level preserved
2. **Identical HTTP status codes** — Laravel's `200`, `201`, `422`, `403`, `401` patterns replicated exactly
3. **Identical error response format** — Laravel returns `{"message": "...", "errors": {...}}` for validation errors
4. **Identical pagination format** — Laravel's `data`, `links`, `meta` structure preserved
5. **Identical JWT handling** — same secret, same algorithm, same claims

### 4.2 Swagger/OpenAPI Migration

The existing L5-Swagger spec (`storage/api-docs/api-docs.json`, 452 KB) is the authoritative API contract.

**Approach:**
1. **Do not regenerate from Go code initially.** Use the existing `api-docs.json` as the contract to implement against.
2. Port the spec to `docs/swagger.yaml` in the Go repo.
3. Use `swaggo/swag` to generate Go handler annotations from the ported spec (or annotate handlers manually).
4. Serve Swagger UI via `gin-swagger` at `/api/documentation` (same route as Laravel).

### 4.3 Response Format Compatibility

Laravel's `ApiResponse` trait returns consistent wrapper objects. Replicate exactly:

```go
// pkg/response/response.go
package response

import "github.com/gin-gonic/gin"

type APIResponse struct {
    Status  bool        `json:"status"`
    Message string      `json:"message,omitempty"`
    Data    interface{} `json:"data,omitempty"`
    Errors  interface{} `json:"errors,omitempty"`
}

func Success(c *gin.Context, status int, message string, data interface{}) {
    c.JSON(status, APIResponse{
        Status:  true,
        Message: message,
        Data:    data,
    })
}

func Error(c *gin.Context, status int, message string, errors interface{}) {
    c.JSON(status, APIResponse{
        Status: false,
        Message: message,
        Errors:  errors,
    })
}

// Laravel validation error format compatibility
func ValidationError(c *gin.Context, errors map[string][]string) {
    c.JSON(422, APIResponse{
        Status: false,
        Message: "The given data was invalid.",
        Errors:  errors,
    })
}
```

### 4.4 Endpoint Inventory & Mapping

First step in Phase 0: generate complete endpoint inventory from Laravel:

```bash
# Run inside Laravel directory
cd Liferise-Solutions(PHP,Laravel)
php artisan route:list --json > ../Go/docs/laravel_routes.json
php artisan route:list --format=csv > ../Go/docs/laravel_routes.csv
```

Map each endpoint to a Go handler with these columns:

| Method | Route | Laravel Controller | Go Handler | Middleware | Status |
|--------|-------|-------------------|------------|------------|--------|
| POST | /api/signup | AuthController@register | authHandler.Register | - | P0 |
| POST | /api/login | AuthController@login | authHandler.Login | - | P0 |
| GET | /api/profile | AuthController@profile | authHandler.Profile | AuthRequired | P0 |
| POST | /api/bookings | BookingController@store | bookingHandler.Create | AuthRequired | P0 |
| GET | /api/services | ServiceController@index | serviceHandler.List | - | P0 |
| ... | ... | ... | ... | ... | ... |

### 4.5 Diffing Proxy for Shadow Testing

Build a lightweight proxy that mirrors requests to both Laravel and Go, comparing responses:

```go
// internal/adapters/http/diffproxy/proxy.go
func ShadowProxy(laravelURL, goURL string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Clone request for both backends
        laravelReq := cloneRequest(c.Request, laravelURL)
        goReq := cloneRequest(c.Request, goURL)
        
        // Fire both requests concurrently
        var laravelResp, goResp *http.Response
        var wg sync.WaitGroup
        wg.Add(2)
        go func() { laravelResp = doRequest(laravelReq); wg.Done() }()
        go func() { goResp = doRequest(goReq); wg.Done() }()
        wg.Wait()
        
        // Compare JSON bodies (ignoring timestamps, IDs)
        diff := compareResponses(laravelResp, goResp)
        if diff.HasDifferences {
            zap.L().Warn("api shadow mismatch",
                zap.String("path", c.Request.URL.Path),
                zap.String("method", c.Request.Method),
                zap.Any("diff", diff.Fields),
            )
        }
        
        // Return Laravel response to caller during shadow mode
        c.DataFromReader(laravelResp.StatusCode, 
            laravelResp.ContentLength,
            laravelResp.Header.Get("Content-Type"),
            laravelResp.Body, nil)
    }
}
```

---

## 5. Implementation Strategy: Modular Monolith

### 5.1 Why Modular Monolith (Not Microservices)

| Factor | Microservices | Modular Monolith |
|--------|--------------|------------------|
| Deployment Complexity | High (orchestration, service mesh) | Low (single binary, single container) |
| Transaction Integrity | Distributed sagas required | Database transactions natively |
| Cutover Risk | High (network latency, partial failures) | Low (all-or-nothing deployment) |
| Team Size Required | Larger (DevOps, SRE) | Smaller (existing team) |
| Future Extraction | Possible | Possible (clean boundaries enable later extraction) |

**Decision:** Start as modular monolith with Clean Architecture boundaries. Extract to microservices only after stabilization if operational needs justify it.

### 5.2 Module Dependency Graph

```text
                    ┌─────────────────────────────────────┐
                    │         cmd/api (Gin server)        │
                    └─────────────────┬───────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐             ┌───────────────┐
│   User/Auth   │◄─────────►│   Booking     │◄───────────►│   Payment     │
│   (P0)        │           │   (P1)        │             │   (P0)        │
└───────┬───────┘           └───────┬───────┘             └───────┬───────┘
        │                           │                             │
        ▼                           ▼                             ▼
┌───────────────┐           ┌───────────────┐             ┌───────────────┐
│  RBAC/Company │           │   Slots       │             │   Stripe      │
│  (P0)         │           │   (P1)        │             │   (P0)        │
└───────────────┘           └───────┬───────┘             └───────────────┘
                                    │
                                    ▼
                          ┌───────────────┐
                          │   Service     │
                          │   Catalog     │
                          │   (P1)        │
                          └───────────────┘
```

**Dependency Rules:**
- Higher-level modules (Booking) can depend on lower-level modules (User, Service)
- No circular dependencies between domains
- Infrastructure adapters (Stripe, Firebase, S3) are injected, not imported directly by domain

### 5.3 Entry Points

The Go project will have **4 separate entry points** (binaries), all sharing the same `internal/` code:

```text
cmd/
├── api/              # Customer mobile API (port 8080)
├── vendor-api/       # Vendor mobile API (port 8081)
├── admin-api/        # Admin portal REST API (port 8082)
└── worker/           # Background job processor (Asynq)
```

**Rationale for separate entry points:**
- Independent scaling (customer API gets 10x traffic of admin API)
- Independent deployment (hotfix admin without touching customer API)
- Different middleware chains (API JWT vs Session auth)
- Cleaner failure domains

---

## 6. Phase 0 Deliverables (Weeks 1-4)

### Week 1: Scaffold & Tooling

| Task | Output | Owner |
|------|--------|-------|
| Initialize Go module (`go.mod`) | `github.com/liferise/backend` | Backend |
| Set up project structure (Clean Architecture) | `cmd/`, `internal/`, `pkg/`, `migrations/` | Backend |
| Configure Docker & docker-compose | `Dockerfile`, `docker-compose.yml` | DevOps |
| Set up CI pipeline (GitHub Actions) | `.github/workflows/ci.yml` | DevOps |
| Configure linting (golangci-lint) + formatting | `.golangci.yml` | Backend |
| Generate endpoint inventory from Laravel | `docs/laravel_routes.json` | Backend |

**Go module dependencies to add:**

```bash
go get github.com/gin-gonic/gin
go get gorm.io/gorm gorm.io/driver/mysql
go get github.com/golang-jwt/jwt/v5
go get github.com/go-playground/validator/v10
go get github.com/hibiken/asynq
go get github.com/redis/go-redis/v9
go get github.com/stripe/stripe-go/v81
go get firebase.google.com/go/v4
go get github.com/spf13/viper
go get go.uber.org/zap
go get github.com/shopspring/decimal
go get github.com/golang-migrate/migrate/v4
go get github.com/stretchr/testify
go get github.com/testcontainers/testcontainers-go
go get github.com/swaggo/swag github.com/swaggo/gin-swagger
```

### Week 2: Database Baseline & Models

| Task | Output | Notes |
|------|--------|-------|
| Generate baseline schema from production | `migrations/0001_baseline.up.sql` | `mysqldump --no-data` |
| Verify baseline against Laravel schema | Comparison report | Automated diff |
| Create GORM models for all 53 entities | `internal/domain/*/entities.go` | Preserve column names |
| Set up golang-migrate runner | `cmd/migrate/` | CLI for up/down |
| Set up test database (testcontainers) | `tests/integration/` | MySQL 8.0 container |
| Configure connection pooling | `internal/infrastructure/database/` | Max 25 open, 10 idle |

**Model generation approach:**
1. Use `gorm-gen` or `jet` to auto-generate from baseline SQL
2. Hand-tune all models for:
   - JSON tags (camelCase for API compatibility)
   - GORM tags (column names, indexes, associations)
   - Custom types (decimal, datatypes.JSON)
   - Read-only generated columns

### Week 3: Auth Foundation (JWT + Password Compatibility)

| Task | Output | Notes |
|------|--------|-------|
| Implement JWT issuance/validation | `pkg/auth/jwt.go` | HS256, identical claims |
| Implement bcrypt password verification | `pkg/auth/password.go` | Must verify Laravel hashes |
| Implement customer registration/login | `internal/application/user/` | Replicate Laravel validation rules |
| Implement user (admin/vendor) login | `internal/application/user/` | Session + JWT paths |
| Implement OTP generation/verification | `internal/application/user/otp.go` | Redis-backed, 5-min TTL |
| Write auth integration tests | `tests/integration/auth_test.go` | 90%+ coverage |

**Password compatibility verification:**

```go
// pkg/auth/password.go
package auth

import "golang.org/x/crypto/bcrypt"

// VerifyPassword checks a plain password against a Laravel bcrypt hash.
// Laravel uses bcrypt cost 10-12 by default. Go's bcrypt is fully compatible.
func VerifyPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

**Critical test:** Export a sample Laravel bcrypt hash, verify Go can validate it.

### Week 4: RBAC + Middleware Pipeline

| Task | Output | Notes |
|------|--------|-------|
| Seed roles & permissions tables | `migrations/0002_seed_roles.up.sql` | All 8+ roles |
| Implement RBAC middleware | `internal/adapters/http/middleware/rbac.go` | JWT claim inspection |
| Implement company-scoped permission check | `internal/application/user/rbac.go` | Multi-tenant |
| Implement rate limiting middleware | `internal/adapters/http/middleware/ratelimit.go` | Redis-backed |
| Implement timezone middleware | `internal/adapters/http/middleware/timezone.go` | UTC + user profile |
| Implement structured logging middleware | `internal/adapters/http/middleware/logging.go` | Zap + request ID |
| Implement recovery/panic handler | `internal/adapters/http/middleware/recovery.go` | Stack trace logging |
| Write RBAC matrix tests | `tests/integration/rbac_test.go` | All role/endpoint pairs |

---

## 7. Phase 1 Deliverables (Weeks 5-8)

### Week 5: Stripe Integration

| Task | Output | Notes |
|------|--------|-------|
| Implement Stripe SDK adapter | `internal/adapters/stripe/` | `stripe-go/v81` |
| Implement PaymentIntent creation | `internal/application/payment/` | 12% fee calculation |
| Implement webhook handler | `internal/adapters/http/handlers/stripe_webhook.go` | Idempotency table |
| Implement refund workflow | `internal/application/payment/refund.go` | Partial + full |
| Implement vendor Connect onboarding | `internal/application/payment/connect.go` | OAuth flow |
| Write Stripe integration tests | `tests/integration/stripe_test.go` | Mock Stripe server |

### Week 6: Service Catalog + Favorites

| Task | Output | Notes |
|------|--------|-------|
| Implement service listing endpoints | `internal/application/service/` | Public + filtered |
| Implement provider profile endpoints | `internal/application/user/provider.go` | With cached ratings |
| Implement favorites toggle | `internal/application/favorite/` | Atomic insert/delete |
| Implement favorites query | `internal/application/favorite/` | Authenticated + anonymous |
| Write service/favorites tests | `tests/integration/` | Contract tests |

### Week 7: Booking Engine (Core)

| Task | Output | Notes |
|------|--------|-------|
| Implement booking creation | `internal/application/booking/` | Transaction boundary |
| Implement slot conflict prevention | `internal/domain/booking/slot.go` | `SELECT FOR UPDATE` |
| Implement booking status lifecycle | `internal/application/booking/` | State machine |
| Implement reschedule tracking | `internal/application/booking/` | `BookingRescheduleRecord` |
| Implement waitlist | `internal/application/booking/waitlist.go` | FIFO queue |
| Write booking race-condition tests | `tests/integration/booking_race_test.go` | Concurrent requests |

### Week 8: Notifications + Background Jobs

| Task | Output | Notes |
|------|--------|-------|
| Set up Asynq Redis queue | `internal/adapters/queue/` | Task definitions |
| Implement FCM push delivery | `internal/adapters/firebase/` | Device token management |
| Implement email delivery jobs | `internal/application/notification/email.go` | SMTP/Postmark |
| Implement booking confirmation flow | `internal/application/booking/` | Push + email |
| Write notification tests | `tests/integration/notify_test.go` | Mock FCM + mail catch |

---

## Appendix: Tech Stack Decisions

### A.1 Framework: Gin

**Chosen:** `gin-gonic/gin`  
**Rationale:** Fastest mature framework, excellent validation binding, largest middleware ecosystem. LifeRise has mixed high-read and write-heavy traffic — Gin handles both well.

### A.2 ORM: GORM + sqlx

**Chosen:** `gorm.io/gorm` (primary) + `jmoiron/sqlx` (escape hatch)  
**Rationale:** 50+ tables with complex associations (pivots, polymorphic tokens, soft deletes). GORM's `Preload`/`Joins` significantly reduces boilerplate for favorites and booking queries. sqlx for reporting/dashboard aggregations.

### A.3 Auth: JWT (golang-jwt/jwt/v5)

**Chosen:** `github.com/golang-jwt/jwt/v5` with HS256  
**Rationale:** Mobile apps currently parse JWT-style claims from Sanctum. Keeping HS256 ensures identical signature verification. Refresh tokens stored in Redis with 7-day TTL.

### A.4 Background Jobs: Asynq

**Chosen:** `github.com/hibiken/asynq`  
**Rationale:** Redis-backed (already in stack), supports delayed tasks/retries/dead-letter, dashboard UI (`asynqmon`), Go-native.

### A.5 Migrations: golang-migrate

**Chosen:** `github.com/golang-migrate/migrate/v4`  
**Rationale:** Plain SQL migrations for auditability, up/down support, CLI tooling. Baseline SQL preserves exact Laravel schema.

### A.6 Configuration: Viper

**Chosen:** `github.com/spf13/viper`  
**Rationale:** Supports env vars, config files, remote config. Familiar to team migrating from Laravel's `config/` directory.

### A.7 Logging: Zap

**Chosen:** `go.uber.org/zap`  
**Rationale:** Structured JSON logging, high performance, request ID injection, Sentry integration available.

### A.8 Validation: go-playground/validator

**Chosen:** `github.com/go-playground/validator/v10`  
**Rationale:** Tag-based struct validation similar to Laravel Form Requests. Custom validators for `exists`, `unique`, `after:date` rules.

### A.9 Decimal: shopspring/decimal

**Chosen:** `github.com/shopspring/decimal`  
**Rationale:** MySQL `DECIMAL(10,2)` for monetary values. Avoids float precision issues in Stripe fee calculations.

### A.10 Testing Stack

| Layer | Tool |
|-------|------|
| Unit tests | `stretchr/testify` + `testing` |
| Integration tests | `testcontainers-go` (MySQL 8.0) |
| API contract tests | Pact (consumer-driven) |
| E2E browser tests | Playwright (admin portal) |
| Load tests | k6 |
| Mock generation | `mockery` or `gomock` |

---

## Next Steps

1. **Approve this roadmap** and confirm modular monolith approach
2. **Provision staging environment** (MySQL 8.0, Redis, separate Go DB instance)
3. **Generate endpoint inventory** (`php artisan route:list --json`)
4. **Begin Week 1 scaffold** — initialize Go module and project structure
5. **Schedule mobile team coordination** — JWT compatibility testing plan

---

*Document prepared for LifeRise Engineering. For questions, contact the CTO.*
