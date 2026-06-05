# LifeRise — Production Deployment Guide

> **Last Updated:** 2026-06-01

This document explains how to wire the **Vercel frontend** and **Railway backend** so they communicate correctly.

---

## Architecture Overview

| Service | Platform | Purpose | Default Port |
|---------|----------|---------|--------------|
| Frontend | Vercel | Next.js 16 web app (resident / vendor / manager portals) | — |
| API | Railway | Customer-facing REST API (`cmd/api`) | 8080 |
| Vendor API | Railway | Vendor-facing REST API (`cmd/vendor-api`) | 8081 |
| Admin API | Railway | Admin portal REST API (`cmd/admin-api`) | 8082 |
| Worker | Railway | Background job processor (`cmd/worker`) | — |

All three HTTP services are independent. You can deploy them as **separate Railway services** (recommended) or run a single `api` service and route all roles through it.

---

## 1. Backend (Railway)

### 1.1 Create Services

Create one Railway service for each binary you want to run:

| Service | Start Command / Dockerfile | Notes |
|---------|---------------------------|-------|
| `api` | `Dockerfile.api` | Main customer API. |
| `vendor-api` | `Dockerfile.vendor` | Vendor API. |
| `admin-api` | `Dockerfile.admin` | Admin API. |
| `worker` | `Dockerfile.worker` | Consumes Redis/Asynq queues. |

If you are using **Railway's Nixpacks** (auto-detect) instead of Docker, set the **Start Command** explicitly:

```bash
# api service
./api-server

# vendor-api service
./vendor-server

# admin-api service
./admin-server

# worker service
./worker
```

### 1.2 Required Environment Variables

Set these in each Railway service dashboard (**Variables** tab).

#### All HTTP Services (api, vendor-api, admin-api)

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `LIFERISE_APP_ENV` | `production` | Runs Gin in release mode. |
| `LIFERISE_DATABASE_URL` | `postgres://...` | Supabase PostgreSQL connection string. |
| `LIFERISE_JWT_SECRET` | `min-32-char-secret...` | Shared secret for signing JWTs. **Must be identical across all three API services.** |
| `LIFERISE_CORS_ALLOW_ORIGINS` | `https://app.liferise.com` | Your Vercel domain. **Comma-separated** if you also want preview deployments: `https://app.liferise.com,https://liferise-xyz.vercel.app` |
| `LIFERISE_STRIPE_SECRET_KEY` | `sk_live_...` | Stripe secret key. |
| `LIFERISE_STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe webhook endpoint secret. |
| `LIFERISE_SUPABASE_PROJECT_REF` | `bbiebzxbgiiobjhuougr` | Supabase project reference. |
| `LIFERISE_SUPABASE_ANON_KEY` | `eyJhbG...` | Supabase anon key. |
| `LIFERISE_SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Supabase service-role key. |

#### Worker Service Only

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `LIFERISE_REDIS_HOST` | `...upstash.io` | Redis host for Asynq queues. |
| `LIFERISE_REDIS_PORT` | `6379` | Redis port. |
| `LIFERISE_REDIS_PASSWORD` | `...` | Redis password (if any). |
| `LIFERISE_MAIL_HOST` | `smtp.gmail.com` | SMTP host for outbound email. |
| `LIFERISE_MAIL_PORT` | `587` | SMTP port. |
| `LIFERISE_MAIL_USERNAME` | `noreply@liferise.com` | SMTP username. |
| `LIFERISE_MAIL_PASSWORD` | `...` | SMTP password. |

> **Note on `PORT`:** Railway automatically injects a `PORT` environment variable. The backend now respects this variable (see `config.go`), so **do not** manually set `LIFERISE_SERVER_PORT` unless you need to override the platform port.

### 1.3 CORS Checklist

The frontend makes cross-origin `fetch` requests with:
- `Authorization: Bearer <token>` header
- `Content-Type: application/json`
- `credentials: include` (via the custom client)

Your backend CORS settings must allow this. The updated config supports comma-separated origins:

```
LIFERISE_CORS_ALLOW_ORIGINS=https://app.liferise.com,https://liferise-git-dev-ib310.vercel.app
```

If you want to allow **all Vercel preview deployments**, you can use a wildcard subdomain (but be aware this is less secure):

```
LIFERISE_CORS_ALLOW_ORIGINS=https://*.vercel.app,https://app.liferise.com
```

---

## 2. Frontend (Vercel)

### 2.1 Environment Variables

Go to **Vercel Dashboard → Project Settings → Environment Variables** and add:

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://liferise-api.up.railway.app` | Customer API base URL. |
| `NEXT_PUBLIC_VENDOR_API_URL` | `https://liferise-vendor.up.railway.app` | *(Optional)* Vendor API base URL. If omitted, falls back to `NEXT_PUBLIC_API_URL`. |
| `NEXT_PUBLIC_ADMIN_API_URL` | `https://liferise-admin.up.railway.app` | *(Optional)* Admin API base URL. If omitted, falls back to `NEXT_PUBLIC_API_URL`. |

> **Important:** Variables prefixed with `NEXT_PUBLIC_` are baked into the JavaScript bundle at **build time**. If you change them, you must trigger a new Vercel deployment.

### 2.2 Local Development

For local development, keep `.env.local` pointing to localhost:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
# NEXT_PUBLIC_VENDOR_API_URL=http://localhost:8081
# NEXT_PUBLIC_ADMIN_API_URL=http://localhost:8082
```

Vercel automatically ignores `.env.local` during production builds and uses dashboard variables instead.

---

## 3. Integration Verification

After deploying, verify the connection with these checks:

### 3.1 Backend Health

```bash
curl -i https://<your-api>.railway.app/health
# Expected: 200 OK with {"status":"ok","service":"liferise-api",...}
```

> The health endpoint is at `/health` (not `/api/health`). All three binaries (api, vendor-api, admin-api) expose this route.

### 3.2 CORS Preflight

```bash
curl -i -X OPTIONS \
  -H "Origin: https://<your-vercel-domain>" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  https://<your-api>.railway.app/api/login

# Expected: 204 No Content + Access-Control-Allow-Origin: https://<your-vercel-domain>
```

### 3.3 Frontend Network Tab

1. Open your Vercel deployment in a browser.
2. Open DevTools → Network.
3. Trigger a login or any API call.
4. Confirm:
   - Request URL points to your Railway domain (not `localhost:8080`).
   - Status is `200` (not `CORS error` or `blocked`).
   - Response contains valid JSON.

---

## 4. Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `CORS error` in browser | Backend `AllowOrigins` does not include Vercel domain. | Update `LIFERISE_CORS_ALLOW_ORIGINS` in Railway. Redeploy backend. |
| `Connection refused` | Frontend still pointing to `localhost:8080`. | Check Vercel env vars `NEXT_PUBLIC_API_URL`. Rebuild frontend. |
| `401 Unauthorized` on every request | JWT secret mismatch between API services. | Ensure `LIFERISE_JWT_SECRET` is identical across api, vendor-api, and admin-api. |
| `404 Not Found` on vendor endpoints | All traffic routed to customer API. | Set `NEXT_PUBLIC_VENDOR_API_URL` to the vendor-api Railway service. |
| Worker not processing jobs | Redis not reachable or worker not running. | Check `LIFERISE_REDIS_*` vars. Ensure the worker service is deployed and healthy. |

---

## 5. Files Changed for Platform Compatibility

The following changes were made to support Railway / Vercel out of the box:

1. **`lifeRise-go-backend/internal/infrastructure/config/config.go`**
   - Reads `PORT` env var (injected by Railway) and overrides `cfg.Server.Port`.
   - Parses comma-separated `LIFERISE_CORS_ALLOW_ORIGINS` into a string slice.

2. **`lifeRise-go-backend/cmd/vendor-api/main.go`**
   - Only overrides port to `8081` when `PORT` is **not** set by the platform.

3. **`lifeRise-go-backend/cmd/admin-api/main.go`**
   - Only overrides port to `8082` when `PORT` is **not** set by the platform.

4. **`lifeRise-go-backend/Dockerfile.vendor`** — New
5. **`lifeRise-go-backend/Dockerfile.admin`** — New
6. **`lifeRise-go-backend/Dockerfile.worker`** — New
7. **`lifeRise-go-backend/Makefile`** — Updated `docker-build` target to build all images.
8. **`lifeRise-v2-frontend/.env.local`** — Updated with production template and documentation.
