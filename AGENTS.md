<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LifeRise Solutions — Agent Guide

## Monorepo Layout

This is a **monorepo** (`LifeRise-Enterprise`). The two apps live under `apps/`:

```
LifeRise-Enterprise/           # Repo root
├── apps/
│   ├── web/                   # Next.js 16 frontend  ← most UI work happens here
│   └── api/                   # Go 1.26+ backend     ← REST API, workers, migrations
├── Makefile                   # Root orchestration (dev, build-all, docker-up)
├── docker-compose.yml         # Full local stack (MySQL, Redis, all APIs, web)
├── vercel.json                # Vercel build config (rootDirectory=apps/web set via project API)
├── DEPLOYMENT.md              # Platform wiring guide (Vercel + Railway)
├── AGENTS.md                  # ← this file (primary agent guide)
├── CLAUDE.md                  # Points to AGENTS.md
└── docs/                      # Additional planning docs
```

> **Always run frontend commands from `apps/web/`** and backend commands from `apps/api/`. Running `npm install` or `go build` from the repo root will fail.

Sub-guides with deeper conventions:
- `apps/web/AGENTS.md` — frontend-specific supplement
- `apps/api/AGENTS.md` — backend-specific guide

---

## Project Overview

LifeRise Solutions is a **production-grade** Next.js web application for a property-management service marketplace. It is a real, fully wired frontend connected to a **Go REST backend** and **Supabase** (auth + DB). Three user portals are served from a single frontend codebase:

- **Resident Portal** (`/resident/*`) — browse and book home services, manage appointments, view community events, manage favorites.
- **Vendor Portal** (`/vendor/*`) — manage booking queue (Kanban), track earnings, schedule appointments, toggle online/offline status, manage offered services.
- **Manager Portal** (`/manager/*`) — analytics dashboard, resident directory, vendor applications/leaderboard, announcements, property map.

### Backend Services

The frontend connects to a **Go backend** that exposes a REST API. Three binary modes are supported:

| Binary | Default Port | Serves |
|--------|-------------|--------|
| `api` (customer) | `8080` | Residents — bookings, services, favorites, login, signup |
| `vendor-api` | `8081` | Vendors — queue, earnings, offered services |
| `admin-api` | `8082` | Managers — analytics, user management, approvals |

In local development, a single binary on `8080` handles all roles.

### Authentication

The app uses a **three-tier authentication chain** (evaluated in priority order):

1. **Go backend JWT** — checked first. If a valid, non-expired JWT exists in `localStorage`, the user is authenticated against the backend.
2. **Supabase session** — checked second. If `NEXT_PUBLIC_SUPABASE_URL` is set and a Supabase session exists, it is used and bridged to the backend for a JWT.
3. **Mock localStorage auth** — offline fallback only. When no credentials are configured, a `localStorage`-based mock system seeds demo accounts.

**Demo accounts (mock mode only):**
- Resident: `resident@liferise.demo` / `Resident123!`
- Vendor: `vendor@liferise.demo` / `Vendor123!`
- Manager: `manager@liferise.demo` / `Manager123!`
- Pending vendor: `pending@liferise.demo` / `Pending123!`

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.6 |
| React | react / react-dom | 19.2.4 |
| Language | TypeScript | ~5 |
| Styling | Tailwind CSS | 4.x |
| PostCSS | `@tailwindcss/postcss` | 4.x |
| Animation | Framer Motion | ~12.39 |
| Animation (legacy) | GSAP | ~3.15 |
| State | Zustand | ~5.0 |
| Auth / DB | Supabase | `@supabase/supabase-js` + `@supabase/ssr` |
| Charts | Recharts | ~3.8 |
| UI Primitives | Radix UI (avatar, dialog, dropdown, progress, scroll-area, select, separator, switch, tabs, tooltip) | latest |
| Icons | lucide-react | ~1.16 |
| Date Utilities | date-fns | ~4.2 |
| Class Utilities | clsx + tailwind-merge (via `cn()`) | latest |
| Fonts | Google Fonts via `next/font` — Syne (headings) + Inter (body) |

## Build & Development Commands

> All frontend commands must be run from **`apps/web/`**. All backend commands from **`apps/api/`**.

```bash
# ── Frontend (from apps/web/) ─────────────────────────────────────────
cd apps/web

npm install          # Install dependencies
npm run dev          # Development server → localhost:3000
npm run build        # Production build (outputs to .next/)
npm start            # Start production server
npm run lint         # ESLint 9 flat config

# ── Backend (from apps/api/) ──────────────────────────────────────────
cd apps/api

make deps            # Download and tidy Go modules
make build           # Build all binaries → ./build/
make run-api         # Customer API → :8080
make run-vendor      # Vendor API   → :8081
make run-admin       # Admin API    → :8082
make run-worker      # Background worker
make test            # go test ./... with race detection
make lint            # golangci-lint
make fmt             # goimports + vet

# ── Root orchestration ────────────────────────────────────────────────
# (from repo root, requires make)
make dev             # frontend + customer API concurrently
make run-all         # frontend + all 3 APIs + worker
make docker-up       # Full Docker stack (MySQL, Redis, APIs, web)
make docker-down
```

There are **no test scripts** configured for the frontend. The project currently has no JS/TS testing framework.

## Environment Variables

Create `apps/web/.env.local` (never at the repo root — Next.js won't find it there). All variables are optional — the app degrades gracefully to mock mode if omitted.

```bash
# Go backend (defaults to localhost:8080 if omitted)
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_VENDOR_API_URL=http://localhost:8081   # optional; falls back to API_URL
NEXT_PUBLIC_ADMIN_API_URL=http://localhost:8082    # optional; falls back to API_URL

# Supabase (optional — enables real auth + DB)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key    # server-side only
```

## Project Structure

```
app/
  page.tsx                    # Landing page (auth-aware CTAs)
  layout.tsx                  # Root layout with AuthProvider + PWAProvider
  globals.css                 # Tailwind v4 imports + custom design tokens + utilities
  error.tsx                   # Root error boundary
  loading.tsx                 # Root loading state
  login/page.tsx              # Unified login page
  signup/page.tsx             # Role selection
  signup/resident/page.tsx    # Resident signup
  signup/vendor/page.tsx      # Vendor signup (with EIN, description)
  forgot-password/page.tsx    # Password reset request
  reset-password/page.tsx     # Password update (after email link)
  verify-email/page.tsx       # Email verification landing
  pending-approval/page.tsx   # Vendor pending approval screen
  trust-safety/page.tsx       # Trust & safety info page
  offline/page.tsx            # Offline fallback page (PWA)
  auth/callback/route.ts      # OAuth callback handler
  admin/approvals/page.tsx    # Manager-only vendor approval dashboard
  resident/
    layout.tsx                # Sidebar + MobileNav wrapper
    page.tsx                  # Resident dashboard
    services/page.tsx
    bookings/page.tsx
    events/page.tsx
    favorites/page.tsx
    notifications/page.tsx
    profile/page.tsx
    error.tsx
    loading.tsx
    [...slug]/page.tsx        # 404 catch-all
  vendor/
    layout.tsx
    page.tsx                  # Vendor dashboard
    schedule/page.tsx
    queue/page.tsx
    earnings/page.tsx
    services/page.tsx
    profile/page.tsx
  manager/
    layout.tsx
    page.tsx                  # Manager dashboard
    analytics/page.tsx
    residents/page.tsx
    vendors/page.tsx
    announcements/page.tsx
    settings/page.tsx
    error.tsx
    loading.tsx
    [...slug]/page.tsx        # 404 catch-all

components/
  layout/
    Sidebar.tsx               # Auth-aware desktop sidebar
    MobileNav.tsx             # Auth-aware bottom nav for mobile
  auth/
    AuthProvider.tsx          # Route guards and auth state watcher
    GoogleButton.tsx          # Google OAuth button
    FacebookButton.tsx        # Facebook OAuth button
    SocialAuthButtons.tsx     # Combined social auth button group
  ui/
    GlassCard.tsx             # Reusable glassmorphism card wrapper
    EmptyState.tsx
    SectionHeader.tsx
    StatusBadge.tsx
    Tabs.tsx
    ResponsiveModal.tsx       # Sheet on mobile, Dialog on desktop
  modals/
    ResidentModal.tsx         # Resident-specific modal flows
    VendorModal.tsx           # Vendor-specific modal flows
    ManagerModal.tsx          # Manager-specific modal flows
  manager/
    EngagementChart.tsx
    PropertyMap.tsx
  pwa/
    PWAProvider.tsx           # Service worker registration + update detection
    InstallPrompt.tsx         # "Add to home screen" banner
    UpdateToast.tsx           # SW update notification toast
    PageTracker.tsx           # Tracks last-visited page for offline resume
    index.ts                  # Barrel export

lib/
  api/
    client.ts                 # HTTP client — Bearer token injection, auto token refresh on 401
    config.ts                 # API base URL resolution per role (resident/vendor/manager)
    auth.ts                   # Go backend auth endpoints (login, signup, logout, fetchProfile)
    bookings.ts               # Bookings CRUD endpoints
    services.ts               # Services CRUD endpoints + availability slots
    favorites.ts              # Favorites list / toggle / delete endpoints
    hooks.ts                  # React hooks wrapping API calls (useServices, useBookings, useFavorites)
    adapters.ts               # Transforms backend shapes → frontend UI types
    types.ts                  # Backend response types (BackendProfile, TokenPair, ApiError, etc.)
    jwt.ts                    # Client-side JWT payload decoder + expiry checker
  supabase/
    client.ts                 # Browser Supabase client (real or mock)
    server.ts                 # Server-side Supabase client
    middleware.ts             # Session refresh helper
  auth/
    auth-service.ts           # Unified auth service (Supabase + Go backend bridge)
    mock-auth.ts              # Mock localStorage auth (offline fallback)
    hooks.ts                  # useAuth(), useAllProfiles(), doLogin()
  hooks/
    useFocusTrap.ts           # Accessibility focus trap hook
    useMediaQuery.ts          # Responsive breakpoint hook
  types.ts                    # Frontend domain types (Vendor, ResidentBooking, etc.)
  mock-data.ts                # Static mock data for dashboards
  store.ts                    # Zustand global store
  utils.ts                    # cn(), getInitials(), getGreeting(), formatDate()
  animations.ts               # Shared Framer Motion variants
  pwa.ts                      # PWA utility helpers

middleware.ts                 # Next.js middleware (Supabase session refresh)
```

> All paths above are relative to `apps/web/`. For example `lib/api/client.ts` lives at `apps/web/lib/api/client.ts` in the repo.

## Authentication Architecture

### Priority Chain

`useAuth()` (in `lib/auth/hooks.ts`) initialises once per session and resolves auth state in this exact order:

1. **Go backend JWT** — reads `liferise_access_token` from `localStorage`. If present and not expired (decoded via `lib/api/jwt.ts`), builds `AuthUser` from the token payload and fetches `BackendProfile` from `/api/profile`.
2. **Supabase session** — if `NEXT_PUBLIC_SUPABASE_URL` is set, calls `supabase.auth.getSession()`. On success, bridges to backend by calling `authService.signInWithPassword()` to obtain a JWT. Listens to `onAuthStateChange` for subsequent changes.
3. **Mock auth** — if neither of the above yields a session, the client is unauthenticated. The mock Supabase client (`lib/supabase/client.ts`) handles `signInWithPassword` for seeded demo accounts stored in `localStorage`.

### Sign-in Flow

Calling `useAuth().signIn(creds)`:
1. If Supabase is configured → `authService.signInWithPassword()`:
   - Tries Supabase login first.
   - On success, bridges to Go backend (`/api/login`) to get a JWT and stores it in `localStorage`.
   - On Supabase failure, tries backend-only login as fallback.
2. If Supabase is not configured → calls `apiLogin()` directly against the Go backend.

### Sign-out Flow

`useAuth().signOut()`:
- Calls Go backend `/api/logout`
- Signs out of Supabase (if configured)
- Clears `localStorage` tokens
- Resets all Zustand store state
- Resets the `globalInitStarted` flag so the next login re-initialises cleanly

### Supabase Database Setup (if using real Supabase)

```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  first_name text,
  last_name text,
  phone text,
  role text not null check (role in ('resident', 'vendor', 'manager')),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  onboarding_completed boolean default false,
  ein_tax_id text,
  description text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Also enable Email provider and Google OAuth in Supabase Authentication settings, and create a trigger on `auth.users` insert to auto-create profile rows.

### Route Protection

`AuthProvider` (`components/auth/AuthProvider.tsx`) handles all route guards client-side:
- Unauthenticated users on protected routes → `/login`
- Vendors whose `profile.status !== "active"` → `/pending-approval`
- Authenticated users visiting `/login` or `/signup` → their role portal
- Role-based guards: non-managers on `/manager/*` or `/admin/*` → `/resident`; non-vendors on `/vendor/*` → `/resident`

Public routes (no auth required): `/`, `/login`, `/signup`, `/signup/*`, `/forgot-password`, `/reset-password`, `/verify-email`, `/trust-safety`, `/offline`, `/auth/*`

### Auth Hooks

```tsx
import { useAuth } from "@/lib/auth/hooks";

function MyComponent() {
  const { user, profile, isLoading, signIn, signOut, refreshProfile } = useAuth();
  // user: AuthUser | null  — { id, email, userType, roles }
  // profile: BackendProfile | null  — { id, email, first_name, last_name, role, status, ... }
  // profile.role: "resident" | "vendor" | "manager"
  // profile.status: "active" | "inactive" | ...  (vendor pending = status !== "active")
}
```

**Important:** `Profile` (exported from `lib/auth/hooks.ts`) is an alias for `BackendProfile` from `lib/api/types.ts`. It is **not** a Supabase-based type.

## Backend API Layer (`lib/api/`)

This is the primary data layer. All API modules share a common HTTP client in `lib/api/client.ts`.

### HTTP Client (`lib/api/client.ts`)

- Injects `Authorization: Bearer <token>` from `localStorage` on every request
- Automatically retries on `401` with a refreshed token
- Stores tokens as `liferise_access_token` and `liferise_refresh_token` in `localStorage`

### API Modules

| Module | Endpoints |
|--------|-----------|
| `lib/api/auth.ts` | `POST /api/login`, `POST /api/signup`, `POST /api/vendor/signup`, `GET /api/profile`, `POST /api/logout` |
| `lib/api/bookings.ts` | `GET /api/bookings`, `GET /api/bookings/:id`, `POST /api/bookings`, `PATCH /api/bookings/:id/status`, `POST /api/bookings/:id/reschedule` |
| `lib/api/services.ts` | `GET /api/services`, `GET /api/services/:id`, `GET /api/services/:id/slots`, `POST /api/services`, `PATCH /api/services/:id`, `DELETE /api/services/:id` |
| `lib/api/favorites.ts` | `GET /api/favorites`, `POST /api/favorites/toggle`, `DELETE /api/favorites/:id` |

### React Hooks (`lib/api/hooks.ts`)

Wraps all API modules into React hooks with loading/error state and graceful fallback:

```tsx
import { useServices, useBookings, useFavorites } from "@/lib/api/hooks";

function MyComponent() {
  const { services, vendors, details, isLoading, error, refresh } = useServices();
  const { bookings, residentBookings, isLoading, error, refresh } = useBookings();
  const { favorites, isLoading, error, refresh, toggle } = useFavorites();
}
```

### Adapters (`lib/api/adapters.ts`)

Transforms raw backend shapes into the frontend `Vendor`, `ServiceDetail`, and `ResidentBooking` types defined in `lib/types.ts`. This decouples UI components from the backend schema.

### JWT Utilities (`lib/api/jwt.ts`)

- `decodeJwtPayload(token)` — decodes a JWT payload client-side (no signature verification)
- `isTokenExpired(token, bufferSeconds?)` — checks if a token is expired (default 60s buffer)

## Routing & Layout Architecture

The app uses **Next.js App Router** with three parallel route trees under `app/`. Each role has:

1. A dedicated `layout.tsx` that renders `<Sidebar role="..." />`, `<MobileNav role="..." />`, and a `<main>` content area with left padding on desktop (`lg:pl-64`).
2. A `page.tsx` for the dashboard/home view.
3. Sub-pages for specific features.
4. `error.tsx` and `loading.tsx` for error and loading boundaries.
5. A `[...slug]/page.tsx` catch-all (resident and manager portals) to gracefully handle unknown paths.

The root `app/page.tsx` is auth-aware — shows "Sign In / Get Started" for guests, or "Go to Portal" for logged-in users.

## Design System & Styling Conventions

### Tailwind CSS v4

The project uses **Tailwind CSS v4** with the new `@import "tailwindcss"` and `@theme` syntax in `globals.css`. There is **no separate `tailwind.config.ts`**. Custom design tokens are defined via CSS variables inside `@theme`:

```css
@theme {
  --color-midnight: #0A0F1E;
  --color-slate-deep: #1A2235;
  --color-slate-mid: #243049;
  --color-slate-light: #2D3E5A;
  --color-teal: #00D4AA;
  --color-gold: #F5A623;
  --color-purple-accent: #818CF8;
  --color-lr-white: #F8FAFC;
  --color-muted: #94A3B8;
}
```

### Visual Style

- **Dark theme only** — background is `#0A0F1E`, text is `#F8FAFC`.
- **Glassmorphism** — primary surfaces use `.glass` (semi-transparent blur) or `.glass-dark`.
- **Accent colors per role**:
  - Resident: `#00D4AA` (teal)
  - Vendor: `#F5A623` (gold)
  - Manager: `#818CF8` (purple)
- **Typography**: Syne for headings (`font-heading`), Inter for body (`font-sans`).
- **No shadcn/ui** — the project uses raw Radix primitives with custom Tailwind styling.

### Reusable CSS Utilities (in `globals.css`)

| Class | Purpose |
|-------|---------|
| `.glass` | Standard frosted panel |
| `.glass-dark` | Darker frosted panel |
| `.gradient-mesh` | Animated gradient background for login page |
| `.teal-glow` / `.gold-glow` | Box-shadow glow utilities |
| `.pulse-teal` | Pulsing teal ring animation |
| `.orb-teal` / `.orb-gold` / `.orb-purple` | Radial gradient orbs |
| `.btn-signin` | Gradient button for sign-in |
| `.nav-active` / `.nav-item` | Sidebar navigation states |

### Component Patterns

- Cards should prefer `<GlassCard>` from `components/ui/GlassCard.tsx`.
- Modals should use `<ResponsiveModal>` from `components/ui/ResponsiveModal.tsx` — it renders a bottom sheet on mobile and a dialog on desktop.
- Animations should reuse variants from `lib/animations.ts` rather than inlining.
- Icons are imported individually from `lucide-react`.
- Inline role accent colors are passed via `style={{ color: accent, background: `${accent}18` }}` rather than Tailwind arbitrary values.

## Data & State

### Live Data (Primary)

All data is fetched from the Go backend through `lib/api/`. The `lib/api/hooks.ts` hooks are the preferred way to consume data in components — they handle loading state, errors, and expose a `refresh()` callback.

### Mock Data (`lib/mock-data.ts`)

Static fallback data used by dashboard pages when the backend is unreachable or not yet wired. When new UI features are added before a backend endpoint exists, extend `lib/mock-data.ts` and `lib/types.ts`. Progressively replace with real API hooks once the backend endpoint is ready.

### Global State (`lib/store.ts`)

Zustand store (`useAppStore`) tracks:

| Field | Type | Purpose |
|-------|------|---------|
| `role` | `"resident" \| "vendor" \| "manager" \| null` | Current user role |
| `isOnline` | `boolean` | Vendor online/offline toggle |
| `activeCategory` | `string` | Resident services filter |
| `profile` | `BackendProfile \| null` | Full user profile from Go backend |
| `authUser` | `AuthUser \| null` | Lightweight user object (id, email, roles) |
| `isAuthLoading` | `boolean` | Auth initialisation in progress |

Granular selector hooks are exported for reduced re-renders: `useRole`, `useIsOnline`, `useSetIsOnline`, `useActiveCategory`, `useSetActiveCategory`, `useProfile`, `useAuthLoading`.

### Auth State

Prefer `useAuth()` from `lib/auth/hooks.ts` for reading and mutating auth state. It reads directly from Zustand but also handles the async init and sign-in/out logic.

## Animation Conventions

- **Framer Motion** is the primary animation library.
- **GSAP** is installed but rarely used; prefer Framer Motion for new work.
- Dashboard pages use inline `container` / `item` stagger variants.
- Reusable presets live in `lib/animations.ts`: `staggerContainer`, `fadeUpItem`, `scaleInItem`, `pageTransition`, `modalOverlay`, `modalContent`, `listContainer`, `listItem`, `slideInFromRight`, etc.
- Charts and heavy map components are dynamically imported with `ssr: false` to avoid hydration mismatches:
  ```tsx
  const EarningsChart = dynamic(() => import("@/components/vendor/EarningsChart"), { ssr: false });
  ```

## PWA / Offline Support

The app ships a full PWA setup:
- `public/sw.js` — hand-written service worker (not Workbox). Caches shell routes and serves them offline.
- `public/manifest.webmanifest` — makes the app installable.
- `components/pwa/PWAProvider.tsx` — handles SW registration and detects updates.
- `components/pwa/InstallPrompt.tsx` — "Add to home screen" banner.
- `components/pwa/UpdateToast.tsx` — prompts user to reload when a new SW version is available.
- `components/pwa/PageTracker.tsx` — stores last-visited page so the app resumes where it left off.
- `app/offline/page.tsx` — shown when the user is offline and the page is not cached.

## Testing Strategy

**There is currently no testing framework.** No Jest, Vitest, Playwright, Cypress, or React Testing Library is installed. If you add tests, follow the project's TypeScript and client-component patterns. All pages are client components, so tests should render within a Next.js-compatible DOM environment.

## Security Considerations

- **JWT tokens** are stored in `localStorage` — accessible to JavaScript. Ensure no XSS vectors exist.
- **Service role key** (`SUPABASE_SERVICE_ROLE_KEY`) must never appear in client-side code or be exposed via `NEXT_PUBLIC_` prefix.
- **Mock mode** uses no real authentication. Suitable for offline demos only — never deploy to production without real credentials.
- **Real Supabase mode**: Use RLS policies on all tables. The service role key bypasses RLS and must only be used server-side.
- The service worker caches GET requests without origin restrictions. Harden if sensitive API responses are added.
- Route guards in `AuthProvider` are **client-side only**. If server-side protection is needed, enforce it in `middleware.ts`.

## Key Files for Agents

| File | Why it matters |
|------|---------------|
| `apps/web/lib/api/client.ts` | HTTP client — JWT injection, token refresh logic |
| `apps/web/lib/api/config.ts` | API URL resolution per role — update when adding new backend ports |
| `apps/web/lib/api/auth.ts` | Go backend auth endpoints — login, signup, profile |
| `apps/web/lib/api/hooks.ts` | React data hooks — primary way to consume backend data in UI |
| `apps/web/lib/api/adapters.ts` | Backend → frontend type transforms |
| `apps/web/lib/api/types.ts` | Backend response types (BackendProfile, TokenPair, etc.) |
| `apps/web/lib/auth/auth-service.ts` | Unified auth service — Supabase + Go backend bridge |
| `apps/web/lib/auth/hooks.ts` | `useAuth()`, `useAllProfiles()`, `doLogin()` |
| `apps/web/lib/auth/mock-auth.ts` | Mock auth fallback (offline/demo mode) |
| `apps/web/lib/supabase/client.ts` | Supabase browser client (switches mock ↔ real based on env vars) |
| `apps/web/components/auth/AuthProvider.tsx` | Route guards — update when adding new protected routes |
| `apps/web/lib/types.ts` | Frontend domain types — add new UI-facing types here |
| `apps/web/lib/mock-data.ts` | Static dashboard mock data |
| `apps/web/lib/store.ts` | Zustand global store — all auth + app state |
| `apps/web/lib/animations.ts` | Reusable Framer Motion presets |
| `apps/web/lib/utils.ts` | `cn()`, `getInitials()`, `getGreeting()`, `formatDate()` |
| `apps/web/components/ui/GlassCard.tsx` | Standard card primitive |
| `apps/web/components/ui/ResponsiveModal.tsx` | Sheet (mobile) / Dialog (desktop) modal primitive |
| `apps/web/components/layout/Sidebar.tsx` | Navigation config per role |
| `apps/web/app/globals.css` | Tailwind v4 theme tokens + custom utilities |
| `apps/web/next.config.ts` | Next.js config |
| `apps/web/eslint.config.mjs` | ESLint 9 flat config |
| `apps/api/internal/infrastructure/config/config.go` | Backend config — reads `PORT`, `LIFERISE_*` env vars |
| `apps/api/internal/adapters/http/middleware/cors.go` | CORS allow-list (update when adding new origins) |
| `apps/api/internal/application/payment/stripe_usecase.go` | Platform fee (12%) — change here only |

## Boy Scout Rule

> **Leave the codebase cleaner than you found it — every single time.**

This is not optional. It applies to every task, regardless of scope.

### What this means in practice

**Fix it when you see it.** If you encounter any of the following while working on any task, fix it immediately — even if it is outside your current task scope:

- ESLint errors or TypeScript errors (zero tolerance — these are build-blockers)
- Console warnings visible during `npm run build` or `npm run dev`
- Stale file paths in docs or comments (e.g., old `lifeRise-go-backend/` references)
- Dead imports or unused variables
- `any` type annotations where the correct type is obvious
- Hardcoded localhost URLs or placeholder values in non-example files
- `TODO` comments that are trivially fixable right now
- Missing `ssr: false` on components that use `window`/`localStorage`
- Go build warnings (`go vet`, `golangci-lint` findings)
- Incorrect or outdated information in `AGENTS.md`, `DEPLOYMENT.md`, or inline comments

### What this does NOT mean

- Do not refactor large sections of working code to satisfy a style preference
- Do not change behaviour or logic unless it is demonstrably broken
- Do not add new features outside the current task
- If a proper fix requires significant effort, leave a precise `// TODO(boyscout):` comment with a description and move on

### Scope vs. polish

| Situation | Action |
|-----------|--------|
| TypeScript error in a file you're already editing | Fix it now |
| ESLint warning in a file you're already editing | Fix it now |
| Stale path in a doc file you're reading | Fix it now |
| Build warning from a file unrelated to your task | Fix it now if trivial (< 5 lines); otherwise add a `TODO(boyscout):` |
| Architectural issue outside your scope | Note it, do not touch it without user approval |

## Git Workflow & Commit Standards

> **Proactive but disciplined codebase management.**

These rules are mandatory for all AI agents operating on this repository.

### 1. Incremental Commits

Stage and commit changes **immediately** upon the completion of a specific fix, edit, or sub-task. Maintain an **atomic commit history** rather than bundling unrelated changes.

- One logical change = one commit.
- Do not accumulate multiple unrelated edits into a single commit.
- If you finish a task and move to an unrelated file, commit the first task before starting the next.

### 2. No Automated Pushes

Agents are **strictly forbidden** from executing `git push`.

- All pushing to the remote repository must be performed **manually by the user**.
- This ensures final human oversight before any change reaches the remote.
- Commit freely; push never.

### 3. Commit Message Syntax

To prevent shell escaping issues and terminal command errors, **always use single quotes (`'`)** for commit messages instead of double quotes (`"`).

**Correct:**
```bash
git commit -m 'fix: update cors allow-list for production'
```

**Incorrect:**
```bash
git commit -m "fix: update cors allow-list for production"
```

Use concise, descriptive messages in the imperative mood (e.g., `fix:`, `feat:`, `docs:`, `refactor:`).

### Pre-Commit Enforcement

The repository uses **Husky v9** + **lint-staged** to enforce the Boy Scout Rule automatically on every commit. The hook is configured at the monorepo root and runs the appropriate checks based on staged files:

| Staged files | Command executed | Failure behaviour |
|--------------|-----------------|-------------------|
| `apps/web/**/*.{ts,tsx,js,jsx}` | `cd apps/web && npm run lint` | Aborts commit on **any** ESLint warning/error or TypeScript type error |
| `apps/api/**/*.go` | `cd apps/api && make lint` | Aborts commit on any `golangci-lint` finding |

- **Fail-fast:** If either check exits with a non-zero status, the commit is aborted immediately.
- **Zero tolerance:** The frontend lint command runs with `--max-warnings=0` and `tsc --noEmit`, so warnings are treated as failures.

---

## Common Pitfalls

1. **Do not assume a traditional Next.js 14 structure.** This is Next.js 16 with React 19.
2. **No `tailwind.config.ts`.** Custom theme values are in `globals.css` via `@theme`.
3. **Most pages are `"use client"`.** If you need server components, be explicit and be aware of auth limitations.
4. **Role accent colors are inline styles**, not Tailwind classes, because they vary by role at runtime.
5. **Auth priority matters.** The Go backend JWT is checked before Supabase. If you only set Supabase credentials without a running backend, API calls will fail even though auth appears to work.
6. **`profile.status` not `profile.approval_status`** controls the vendor pending redirect. `AuthProvider` checks `profile.status !== "active"`.
7. **`Profile` is `BackendProfile`**, not a Supabase-based type. Do not add Supabase-specific fields to it.
8. **`useAllProfiles()` is a stub.** The vendor approval functionality in `lib/auth/hooks.ts` is not yet wired to the admin API. `approveVendor()` and `rejectVendor()` are no-ops with TODO comments.
9. **The mock auth stores data in localStorage.** Clearing browser data will reset demo accounts.
10. **`globalInitStarted` flag** in `lib/auth/hooks.ts` prevents double-init. It is reset on sign-out. Do not call `init()` directly.
11. **`.env.local` must be in `apps/web/`**, not the repo root. Next.js only reads env files from its own directory.
12. **Never run `npm install` from the repo root.** `package.json` is in `apps/web/`. Running npm at root will fail.
13. **`rootDirectory` for Vercel is a project-level setting**, not a `vercel.json` field. It is already set to `apps/web` via the Vercel API.
