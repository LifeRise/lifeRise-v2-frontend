# LifeRise — Frontend Agent Guide (`apps/web/`)

This is the **Next.js 16 frontend** for the LifeRise property-management service marketplace. It lives at `apps/web/` inside the `LifeRise-Enterprise` monorepo.

> **Always run frontend commands from `apps/web/`.** The repo root has no `package.json`.  
> The backend lives at `apps/api/` — see `apps/api/AGENTS.md` for backend conventions.  
> The root `AGENTS.md` contains the full cross-project guide and is the primary reference.

---

## Quick-Start Commands

```bash
cd apps/web

npm install          # Install dependencies
npm run dev          # Dev server → http://localhost:3000
npm run build        # Production build (validates types + routes)
npm start            # Serve production build
npm run lint         # ESLint 9 flat config
```

---

## Environment Variables

Create `apps/web/.env.local` — **never at the repo root** (Next.js only reads from its own directory).

```bash
# Go backend URLs (all optional — falls back to mock mode)
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_VENDOR_API_URL=http://localhost:8081   # optional; falls back to API_URL
NEXT_PUBLIC_ADMIN_API_URL=http://localhost:8082    # optional; falls back to API_URL

# Supabase (optional — enables real auth + DB)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key    # server-side only — never expose
```

> `NEXT_PUBLIC_*` variables are **baked into the bundle at build time**. Changing them requires a new deployment.

---

## Directory Layout (relative to `apps/web/`)

```
app/              # Next.js App Router pages and layouts
components/
  auth/           # AuthProvider (route guards), social OAuth buttons
  layout/         # Sidebar, MobileNav
  manager/        # Manager-specific charts and map
  modals/         # Role-specific modal flows
  pwa/            # PWAProvider, InstallPrompt, UpdateToast, PageTracker
  ui/             # GlassCard, ResponsiveModal, EmptyState, StatusBadge, Tabs
lib/
  api/            # HTTP client, config, auth endpoints, hooks, adapters, types, jwt
  auth/           # Unified auth service, mock auth, useAuth() hook
  hooks/          # useFocusTrap, useMediaQuery
  supabase/       # Browser + server Supabase clients, middleware helper
  animations.ts   # Shared Framer Motion variants
  mock-data.ts    # Static fallback data for all three portals
  store.ts        # Zustand global store (role, profile, authUser, isAuthLoading)
  types.ts        # Frontend domain types (Vendor, ResidentBooking, etc.)
  utils.ts        # cn(), getInitials(), getGreeting(), formatDate()
  pwa.ts          # PWA utility helpers
public/
  sw.js           # Hand-written service worker (caches shell routes)
  manifest.webmanifest
middleware.ts     # Supabase session refresh on every request
next.config.ts    # Next.js config (output: standalone for Docker)
postcss.config.mjs
eslint.config.mjs
tsconfig.json
```

---

## Key Conventions

### Authentication Priority

`useAuth()` in `lib/auth/hooks.ts` checks in this exact order:

1. Go backend JWT in `localStorage` (`liferise_access_token`) — checked first
2. Supabase session — bridges to backend for a JWT if Supabase is configured
3. Mock auth — falls back to `localStorage`-seeded demo accounts

**Demo accounts (mock mode only):**

| Email | Password | Role |
|-------|----------|------|
| `resident@liferise.demo` | `Resident123!` | Resident |
| `vendor@liferise.demo` | `Vendor123!` | Vendor |
| `manager@liferise.demo` | `Manager123!` | Manager |
| `pending@liferise.demo` | `Pending123!` | Vendor (pending) |

### Design System

- **Dark theme only** — `#0A0F1E` background, `#F8FAFC` text.
- **No `tailwind.config.ts`** — theme tokens are in `app/globals.css` via `@theme`.
- **No shadcn/ui** — raw Radix UI primitives with custom Tailwind.
- **Glassmorphism surfaces** — use `.glass` or `.glass-dark` classes.
- **Role accent colors** (passed as inline styles, not Tailwind classes):
  - Resident: `#00D4AA` (teal)
  - Vendor: `#F5A623` (gold)
  - Manager: `#818CF8` (purple)
- **Cards** → `<GlassCard>`. **Modals** → `<ResponsiveModal>` (sheet on mobile, dialog on desktop).
- **Animations** → reuse presets from `lib/animations.ts` (Framer Motion).
- **Dynamic imports** — use `{ ssr: false }` for any component that touches `window` or `localStorage`.

### Data Layer

- Primary: Go backend via `lib/api/hooks.ts` (`useServices`, `useBookings`, `useFavorites`)
- Fallback: `lib/mock-data.ts` when backend is unreachable
- State: Zustand `useAppStore` in `lib/store.ts`

### Route Guards

`AuthProvider` in `components/auth/AuthProvider.tsx` enforces all redirects client-side:

- Unauthenticated → `/login`
- Vendor with `profile.status !== "active"` → `/pending-approval`
- Wrong role on portal → `/resident`

Public routes (no auth): `/`, `/login`, `/signup/*`, `/forgot-password`, `/reset-password`, `/verify-email`, `/trust-safety`, `/offline`, `/auth/*`

---

## Common Pitfalls

1. **`useAllProfiles()` is a stub** — `approveVendor()` and `rejectVendor()` are no-ops. Not yet wired to the admin API.
2. **`Profile` = `BackendProfile`** — not a Supabase type. Do not add Supabase-specific fields to it.
3. **`profile.status` not `profile.approval_status`** — the vendor pending guard uses `status !== "active"`.
4. **`globalInitStarted`** flag prevents double-init on auth. It resets on sign-out. Never call `init()` directly.
5. **`.env.local` belongs in `apps/web/`** — placing it at the repo root will be silently ignored.
6. **Backend JWT is checked before Supabase** — if Supabase is configured but the backend is down, API calls will fail even though login succeeds.

## Strict Operational Rules

The following rules are mandatory and designed to prevent architectural drift and hallucinations encountered during implementation.

### 1. Zero-Hallucination Policy (Digital Oath)

The agent must operate under a "digital oath" of factual accuracy. Every claim, summary, or architectural statement made regarding the current state of the repository must be verified against the actual files. Assumptions about existing logic, schema structures, or available variables are strictly prohibited.

### 2. Pre-Edit Verification Loop

Before performing any file modification or finalizing an implementation plan, the agent must explicitly verify the target code's current state. This ensures that the plan is grounded in reality rather than an outdated or assumed mental model of the codebase.

### 3. Mandatory Visual Grounding

If a screenshot or image is provided (such as the legacy dashboard UI), the agent must perform a comprehensive analysis of every visible element, label, and data point. The agent is forbidden from assuming the contents of an image; it must map visual components directly to technical requirements and database entities.
