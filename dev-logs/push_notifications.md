# Push Notification System — Technical Completion Guide

> **Scope:** This document is the single authoritative reference for completing the FCM push
> notification pipeline end-to-end. Every section maps directly to code that already exists in
> the repository; nothing here requires inventing new abstractions.

---

## Table of Contents

1. [Infrastructure & Configuration](#1-infrastructure--configuration)
2. [Device Token Management](#2-device-token-management)
3. [Backend Implementation](#3-backend-implementation)
4. [Frontend Integration (Next.js PWA)](#4-frontend-integration-nextjs-pwa)
5. [Testing Strategy](#5-testing-strategy)

---

## 1. Infrastructure & Configuration

### 1.1 Firebase Service Account JSON

The Go backend initialises Firebase via `NewFCMClient` in
`internal/adapters/firebase/fcm.go`, which calls
`option.WithCredentialsFile(credentialsPath)`. The credentials path is read from
`cfg.Firebase.CredentialsPath` (struct field `credentials_path` in `FirebaseConfig`,
`internal/infrastructure/config/config.go:88-100`).

**Steps to provision:**

1. Open [Firebase Console](https://console.firebase.google.com) → your project →
   **Project Settings → Service Accounts → Generate New Private Key**.
2. Save the downloaded JSON as `firebase-credentials.json` in the `apps/api/` working
   directory **or** any path you set in config.
3. **Never commit this file.** Add it to `.gitignore`. On Railway/Render, store the JSON
   content as a secret and write it to a temp path at container start.

**Railway deployment pattern (entrypoint wrapper):**

```bash
#!/bin/sh
# docker-entrypoint.sh — injected by Railway via "Start Command"
echo "$FIREBASE_SERVICE_ACCOUNT_JSON" > /tmp/firebase-credentials.json
exec ./build/api-server
```

Then set `LIFERISE_FIREBASE_CREDENTIALS_PATH=/tmp/firebase-credentials.json` in Railway
Variables.

### 1.2 Required `LIFERISE_` Environment Variables

All variables follow the `LIFERISE_` prefix enforced by Viper
(`config.go:223 — v.SetEnvPrefix("LIFERISE")`). Add to `.env` (local) or Railway
Variables (production).

| Variable | Maps to `FirebaseConfig` field | Required for push? |
| --- | --- | --- |
| `LIFERISE_FIREBASE_CREDENTIALS_PATH` | `CredentialsPath` | **Yes — backend** |
| `LIFERISE_FIREBASE_PROJECT_ID` | `ProjectID` | Yes |
| `LIFERISE_FIREBASE_VAPID_KEY` | `VAPIDKey` | **Yes — frontend web push** |
| `LIFERISE_FIREBASE_API_KEY` | `APIKey` | Yes — JS SDK init |
| `LIFERISE_FIREBASE_MESSAGING_SENDER_ID` | `MessagingSenderID` | Yes — JS SDK init |
| `LIFERISE_FIREBASE_APP_ID` | `AppID` | Yes — JS SDK init |
| `LIFERISE_FIREBASE_AUTH_DOMAIN` | `AuthDomain` | Optional |
| `LIFERISE_FIREBASE_MEASUREMENT_ID` | `MeasurementID` | Optional |

Frontend variables must also be exposed as `NEXT_PUBLIC_` prefixed vars in
`apps/web/.env.local` (Next.js client bundle):

```bash
# apps/web/.env.local — Firebase JS SDK config
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BN...   # Web Push certificate public key
```

### 1.3 Config YAML (local dev)

Add to `apps/api/config.yaml` (already gitignored; template is `config.example.yaml:45-47`):

```yaml
firebase:
  credentials_path: "./firebase-credentials.json"
  project_id: "your-firebase-project-id"
  vapid_key: "BN..."
  api_key: "AIza..."
  messaging_sender_id: "123456789"
  app_id: "1:123:web:abc"
```

---

## 2. Device Token Management

### 2.1 Database Schema

FCM device tokens must be persisted in the database and associated with `users.id`. Create
a new migration file `apps/api/migrations/0004_device_tokens.up.sql`:

```sql
-- 0004_device_tokens.up.sql
CREATE TABLE IF NOT EXISTS device_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    token       VARCHAR(512) NOT NULL,
    platform    VARCHAR(20)  NOT NULL DEFAULT 'web',  -- 'web' | 'ios' | 'android'
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_token  ON device_tokens(token);
CREATE        INDEX IF NOT EXISTS idx_device_tokens_user   ON device_tokens(user_id);
```

The companion rollback file `0004_device_tokens.down.sql`:

```sql
DROP TABLE IF EXISTS device_tokens;
```

Run via: `make migrate-up` from `apps/api/`.

### 2.2 Domain Entity

Add to `internal/domain/user/entities.go` alongside the existing `User` struct:

```go
// DeviceToken stores an FCM registration token for push delivery.
type DeviceToken struct {
    ID        uint64    `gorm:"column:id;primaryKey"`
    UserID    uint64    `gorm:"column:user_id;not null;index"`
    Token     string    `gorm:"column:token;size:512;not null;uniqueIndex"`
    Platform  string    `gorm:"column:platform;size:20;not null;default:'web'"`
    CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`
    UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (DeviceToken) TableName() string { return "device_tokens" }
```

### 2.3 Repository Interface

Create `internal/domain/user/device_token_repository.go`:

```go
package user

import "context"

// DeviceTokenRepository defines persistence operations for FCM tokens.
type DeviceTokenRepository interface {
    // Upsert inserts a new token or updates the updated_at timestamp if it already exists.
    Upsert(ctx context.Context, db interface{}, userID uint64, token, platform string) error
    // GetByUser returns all active tokens for a user.
    GetByUser(ctx context.Context, db interface{}, userID uint64) ([]string, error)
    // Delete removes a specific token (e.g. when FCM reports it as invalid).
    Delete(ctx context.Context, db interface{}, token string) error
}
```

### 2.4 GORM Implementation

Create `internal/infrastructure/persistence/device_token_repo.go`:

```go
package persistence

import (
    "context"
    "gorm.io/gorm"
    "gorm.io/gorm/clause"
    domain "github.com/liferise/backend/internal/domain/user"
)

type deviceTokenRepo struct{}

func NewDeviceTokenRepo() *deviceTokenRepo { return &deviceTokenRepo{} }

func (r *deviceTokenRepo) Upsert(ctx context.Context, db interface{}, userID uint64, token, platform string) error {
    gdb := db.(*gorm.DB).WithContext(ctx)
    record := domain.DeviceToken{UserID: userID, Token: token, Platform: platform}
    return gdb.Clauses(clause.OnConflict{
        Columns:   []clause.Column{{Name: "token"}},
        DoUpdates: clause.AssignmentColumns([]string{"user_id", "platform", "updated_at"}),
    }).Create(&record).Error
}

func (r *deviceTokenRepo) GetByUser(ctx context.Context, db interface{}, userID uint64) ([]string, error) {
    gdb := db.(*gorm.DB).WithContext(ctx)
    var tokens []domain.DeviceToken
    if err := gdb.Where("user_id = ?", userID).Find(&tokens).Error; err != nil {
        return nil, err
    }
    result := make([]string, len(tokens))
    for i, t := range tokens {
        result[i] = t.Token
    }
    return result, nil
}

func (r *deviceTokenRepo) Delete(ctx context.Context, db interface{}, token string) error {
    return db.(*gorm.DB).WithContext(ctx).
        Where("token = ?", token).Delete(&domain.DeviceToken{}).Error
}
```

### 2.5 Token Lifecycle Rules

| Event | Action |
| --- | --- |
| User logs in and grants notification permission | Call `POST /api/notifications/device-token` to upsert token |
| FCM returns `messaging/registration-token-not-registered` | Call `deviceTokenRepo.Delete()` to prune the stale token from DB |
| User logs out | Optionally delete or retain token (retain for re-login push; delete for strict privacy) |
| Token refresh (FCM `onTokenRefresh` / JS `getToken` returns new value) | Upsert new token; the unique index on `token` ensures idempotency |

---

## 3. Backend Implementation

### 3.1 `SendPushNotification` Use Case — Current State

`internal/application/notification/usecase.go:46-58` — **already complete for the happy
path.** `SendPushNotification` creates an `FCMNotificationPayload`, enqueues it to the
`"critical"` Asynq queue, and returns. No further changes are required to this method.

The remaining gaps are:

- **No token lookup.** The caller is responsible for providing `[]string` tokens. The
  notification use case intentionally does not own device token retrieval — that belongs in
  the calling use case (e.g. `booking` use case fetches tokens for a customer before
  calling `SendPushNotification`).
- **No stale-token pruning.** `HandleFCMNotification` in `tasks.go:118-129` calls
  `fcmSender` (i.e. `FCMClient.SendToDevices`) but does not inspect partial failure
  responses to prune dead tokens. See §3.3 for the fix.

### 3.2 Wiring the Worker — Current State

`cmd/worker/main.go:83-86` already registers all three handlers:

```go
mux.HandleFunc(tasks.TypeEmailDelivery,   handler.HandleEmailDelivery)
mux.HandleFunc(tasks.TypeFCMNotification, handler.HandleFCMNotification)
mux.HandleFunc(tasks.TypeBookingReminder, handler.HandleBookingReminder)
```

`HandleFCMNotification` (`tasks/tasks.go:118-129`) delegates to `h.FCMSender`, which is
set to `fcm.SendToDevices` when `cfg.Firebase.CredentialsPath != ""`. If the path is
empty, it falls back to a `fmt.Printf` stub — **no code change needed for basic delivery**.

**What still needs to be done:** The stub `fmt.Printf` log line
(`tasks.go:127`) should be replaced with a structured zap warning so it is
observable in production logs:

```go
// In HandleFCMNotification, replace the fmt.Printf fallback:
if h.FCMSender == nil {
    // FCM sender not configured; log and skip silently.
    return nil  // Asynq will not retry; task is marked done.
}
```

### 3.3 Stale-Token Pruning in `SendToDevices`

`fcm.go:52-84` calls `f.client.SendMulticast` and already iterates `resp.Responses` to
detect failures. The `_ = fmt.Errorf(...)` discard on line 79 must be replaced with an
actual prune call. The cleanest pattern is to return a list of failed tokens from
`SendToDevices` and let the task handler delete them via the `DeviceTokenRepository`.

Extend `FCMClient.SendToDevices` signature:

```go
// Returns (failedTokens []string, err error)
func (f *FCMClient) SendToDevices(ctx context.Context, tokens []string, title, body string,
    data map[string]string) ([]string, error)
```

Update `FCMClient` interface in `notification/usecase.go` and the `Handler.FCMSender`
function type in `tasks/tasks.go` to match.

### 3.4 Device Token Registration Endpoint

Add a new authenticated endpoint so mobile/web clients can register their FCM token after
obtaining notification permission.

**Route** — add to `authRequired` group in `internal/adapters/http/routes.go`:

```go
authRequired.POST("/notifications/device-token", cfg.NotificationHandler.RegisterDeviceToken)
authRequired.DELETE("/notifications/device-token", cfg.NotificationHandler.DeleteDeviceToken)
```

**Handler** — add to `internal/adapters/http/handlers/notification_handler.go`:

```go
type RegisterDeviceTokenRequest struct {
    Token    string `json:"token"    validate:"required"`
    Platform string `json:"platform" validate:"required,oneof=web ios android"`
}

func (h *NotificationHandler) RegisterDeviceToken(c *gin.Context) {
    var req RegisterDeviceTokenRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        response.ValidationError(c, validation.ValidationErrorsToMap(err))
        return
    }
    userIDVal, _ := c.Get("user_id")
    userID := userIDVal.(uint64)
    if err := h.uc.RegisterDeviceToken(c.Request.Context(), userID, req.Token, req.Platform); err != nil {
        response.Error(c, http.StatusInternalServerError, "Failed to register device token.", nil)
        return
    }
    response.Success(c, http.StatusOK, "Device token registered.", nil)
}
```

**Use case method** — add to `notification/usecase.go`:

```go
// RegisterDeviceToken persists an FCM token for a user.
func (uc *UseCase) RegisterDeviceToken(ctx context.Context, userID uint64, token, platform string) error {
    return uc.tokenRepo.Upsert(ctx, uc.db, userID, token, platform)
}
```

This requires adding `db *gorm.DB` and `tokenRepo DeviceTokenRepository` fields to
`UseCase` and updating `NewUseCase` accordingly.

**`NotificationHandler` dependency** — `NotificationHandler` currently only holds `uc
*UseCase`. No handler-level change is needed once the use case method exists.

---

## 4. Frontend Integration (Next.js PWA)

### 4.1 Install Firebase JS SDK

```bash
cd apps/web
npm install firebase
```

### 4.2 Firebase Client Initialisation

Create `apps/web/lib/firebase/client.ts`:

```ts
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

/** Returns the Messaging instance or null when the browser does not support FCM. */
export async function getFirebaseMessaging() {
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(firebaseApp);
}
```

### 4.3 Permission Request and Token Retrieval

Create `apps/web/lib/firebase/push.ts`:

```ts
import { getToken } from 'firebase/messaging';
import { getFirebaseMessaging } from './client';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;

/**
 * Requests notification permission and returns the FCM registration token,
 * or null if the user denies or the browser is unsupported.
 */
export async function requestPushToken(): Promise<string | null> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  try {
    return await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    });
  } catch {
    return null;
  }
}
```

### 4.4 Token Sync on Authentication

Call `requestPushToken()` immediately after a successful sign-in and sync the token to
the backend. The ideal hook point is inside `lib/auth/hooks.ts` after the JWT is stored,
or in a dedicated `useEffect` in `components/auth/AuthProvider.tsx`.

Pattern (add to `AuthProvider.tsx` or a new `usePushSync` hook):

```ts
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import { requestPushToken } from '@/lib/firebase/push';
import { apiClient } from '@/lib/api/client';

export function usePushTokenSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    requestPushToken().then((token) => {
      if (!token) return;
      // Fire-and-forget; non-critical — do not block the UI.
      apiClient.post('/api/notifications/device-token', {
        token,
        platform: 'web',
      }).catch(() => { /* silent — push is best-effort */ });
    });
  }, [user?.id]);  // Re-run only when the user identity changes
}
```

Call `usePushTokenSync()` inside `AuthProvider` (it is already a client component) or
at the root layout level. Because the hook fires after the JWT is set in `localStorage`,
`apiClient` will automatically inject the `Authorization: Bearer` header
(`lib/api/client.ts`).

### 4.5 Service Worker — Background `push` Event Handler

The existing `public/sw.js` handles caching but has **no `push` event listener**. Append
the following block to `apps/web/public/sw.js` (after the `fetch` handler):

```js
/* ─── Background Push Notifications ───────────────────────────── */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'LifeRise', body: event.data.text() };
  }

  const title = payload.notification?.title ?? payload.title ?? 'LifeRise';
  const options = {
    body:    payload.notification?.body  ?? payload.body ?? '',
    icon:    '/icons/icon-192x192.png',
    badge:   '/icons/badge-72x72.png',
    data:    payload.data ?? {},
    tag:     payload.data?.booking_id ?? 'liferise-general',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/resident';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
```

**Important:** FCM requires the service worker file to import the Firebase messaging
compat SDK when the SW itself handles background messages (i.e. when the app tab is
closed). Add at the very top of `public/sw.js`:

```js
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'NEXT_PUBLIC_FIREBASE_API_KEY_VALUE',
  projectId:         'NEXT_PUBLIC_FIREBASE_PROJECT_ID_VALUE',
  messagingSenderId: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_VALUE',
  appId:             'NEXT_PUBLIC_FIREBASE_APP_ID_VALUE',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title   = payload.notification?.title ?? 'LifeRise';
  const options = { body: payload.notification?.body ?? '', icon: '/icons/icon-192x192.png' };
  self.registration.showNotification(title, options);
});
```

> **Note:** Service workers cannot access `process.env`. The Firebase config values must
> be inlined as string literals. Use a build-time script or Next.js `next.config.ts`
> rewrites to inject them, or generate `public/firebase-messaging-sw.js` via a custom
> build step that reads `NEXT_PUBLIC_` vars.

**Recommended approach for production:** rename the SW to
`public/firebase-messaging-sw.js` (the name FCM's JS SDK looks for by default) so that
`getToken()` in `push.ts` can supply a `serviceWorkerRegistration` pointing to it, and
register it separately from the main `sw.js` in `PWAProvider.tsx`.

---

## 5. Testing Strategy

### 5.1 Unit Tests — `notification_usecase_test.go`

The existing tests in
`internal/application/notification/notification_usecase_test.go` cover the queue-enqueue
path using `fakeAsynqClient`. Extend the file with the following additional cases:

**a) Empty-token guard** — `SendPushNotification` should be a no-op when `tokens` is empty:

```go
func TestSendPushNotification_NoTokens(t *testing.T) {
    client := newFakeAsynqClient()
    uc := NewUseCase(client, nil, nil)
    err := uc.SendPushNotification(context.Background(), []string{}, "T", "B", nil)
    if err != nil {
        t.Fatalf("unexpected error for empty tokens: %v", err)
    }
    if _, ok := client.enqueued[tasks.TypeFCMNotification]; ok {
        t.Errorf("expected no FCM task to be enqueued for empty token list")
    }
}
```

> **Note:** `SendPushNotification` currently enqueues even for empty token slices because
> `FCMClient.SendToDevices` has the guard (`fcm.go:55`), not the use case. Add an early
> return in `usecase.go:46` before creating the task:
> `if len(tokens) == 0 { return nil }`.

**b) Device token registration** — once `RegisterDeviceToken` is added:

```go
func TestRegisterDeviceToken(t *testing.T) {
    client := newFakeAsynqClient()
    repo   := newFakeDeviceTokenRepo()  // implement analogously to fakeAsynqClient
    uc     := NewUseCase(client, nil, nil, /* db, repo */ )
    err    := uc.RegisterDeviceToken(context.Background(), 1, "fcm-token-abc", "web")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if !repo.HasToken("fcm-token-abc") {
        t.Errorf("expected token to be stored")
    }
}
```

### 5.2 Task-Handler Unit Tests — `handler_test.go`

`internal/adapters/queue/tasks/handler_test.go:46-80` covers the happy path. Add:

**a) Nil FCM sender — no panic:**

```go
func TestHandleFCMNotification_NilSender(t *testing.T) {
    handler := NewHandler(nil, nil, nil)  // FCMSender is nil
    payload, _ := json.Marshal(FCMNotificationPayload{
        Tokens: []string{"t1"}, Title: "T", Body: "B",
    })
    err := handler.HandleFCMNotification(context.Background(),
        asynq.NewTask(TypeFCMNotification, payload))
    if err != nil {
        t.Fatalf("nil FCMSender must not return error: %v", err)
    }
}
```

**b) Invalid JSON payload — returns error (Asynq will retry):**

```go
func TestHandleFCMNotification_BadPayload(t *testing.T) {
    handler := NewHandler(nil, nil, nil)
    err := handler.HandleFCMNotification(context.Background(),
        asynq.NewTask(TypeFCMNotification, []byte("not-json")))
    if err == nil {
        t.Fatal("expected error for malformed payload")
    }
}
```

### 5.3 Manual End-to-End Verification

Use the existing `POST /api/notifications/push` endpoint
(`notification_handler.go:56-69`, route registered at `routes.go:109`) to fire a push
without going through a booking flow.

**Step 1 — Obtain a JWT:**

```bash
curl -s -X POST http://localhost:8080/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"resident@example.com","password":"secret"}' | jq .data.access_token
```

**Step 2 — Register your browser's FCM token** (obtained from `requestPushToken()` in the
browser console):

```bash
curl -X POST http://localhost:8080/api/notifications/device-token \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"token":"<FCM_REGISTRATION_TOKEN>","platform":"web"}'
```

**Step 3 — Send a test push via `NotificationHandler.SendPush`:**

```bash
curl -X POST http://localhost:8080/api/notifications/push \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "tokens": ["<FCM_REGISTRATION_TOKEN>"],
    "title":  "LifeRise Test",
    "body":   "Push notification delivery confirmed.",
    "data":   {"type": "test"}
  }'
```

Expected response: `202 Accepted` — `"Push notification queued for delivery."`.

**Step 4 — Confirm worker processing.** With the worker binary running
(`make run-worker`), the task should appear and be processed within seconds. Watch
worker stdout for the `[FCM]` log line (stub mode) or for the absence of errors (live
Firebase mode). The browser/device should display the notification.

### 5.4 Integration Test Checklist

Run the existing test suites to confirm no regressions after adding the device token
wiring:

```bash
cd apps/api
make test   # go test ./... -race -coverprofile=coverage.out
```

Key packages to verify:

| Package | What it exercises |
| --- | --- |
| `internal/application/notification` | `SendPushNotification`, `SendBookingConfirmation`, `SendBookingReminder` enqueue logic |
| `internal/adapters/queue/tasks` | `HandleFCMNotification` with real/nil/error sender |
| `tests/integration` | Booking status transitions that trigger notifications |

---

## Summary — Outstanding Work Items

| # | Area | File(s) to Change | Status |
| --- | --- | --- | --- |
| 1 | DB migration for `device_tokens` table | `migrations/0004_device_tokens.up.sql` | ❌ Not created |
| 2 | `DeviceToken` domain entity | `internal/domain/user/entities.go` | ❌ Not added |
| 3 | `DeviceTokenRepository` interface | `internal/domain/user/device_token_repository.go` | ❌ Not created |
| 4 | GORM `deviceTokenRepo` implementation | `internal/infrastructure/persistence/device_token_repo.go` | ❌ Not created |
| 5 | `RegisterDeviceToken` use case method | `internal/application/notification/usecase.go` | ❌ Not added |
| 6 | `RegisterDeviceToken` / `DeleteDeviceToken` HTTP handlers | `internal/adapters/http/handlers/notification_handler.go` | ❌ Not added |
| 7 | New routes in `authRequired` group | `internal/adapters/http/routes.go` | ❌ Not added |
| 8 | Stale-token pruning in `SendToDevices` | `internal/adapters/firebase/fcm.go` | ❌ Partial (errors discarded) |
| 9 | Empty-token guard in use case | `internal/application/notification/usecase.go:46` | ❌ Not added |
| 10 | Firebase JS SDK installation | `apps/web/` (`npm install firebase`) | ❌ Not done |
| 11 | `lib/firebase/client.ts` + `lib/firebase/push.ts` | `apps/web/lib/firebase/` | ❌ Not created |
| 12 | `usePushTokenSync` hook wired in `AuthProvider` | `apps/web/components/auth/AuthProvider.tsx` | ❌ Not added |
| 13 | `push` + `notificationclick` events in SW | `apps/web/public/sw.js` | ❌ Not added |
| 14 | Firebase compat SDK `importScripts` in SW | `apps/web/public/sw.js` | ❌ Not added |
| 15 | Unit test: empty-token guard | `notification_usecase_test.go` | ❌ Not added |
| 16 | Unit test: nil sender no-panic | `handler_test.go` | ❌ Not added |
| 17 | Unit test: bad payload returns error | `handler_test.go` | ❌ Not added |
