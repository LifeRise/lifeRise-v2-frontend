<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LifeRise Solutions — Agent Guide

## Project Overview

LifeRise Solutions is a **demo/prototype** Next.js web application for a property-management service marketplace. It simulates three user portals from a single frontend codebase:

- **Resident Portal** (`/resident/*`) — browse and book home services, manage appointments, view community events.
- **Vendor Portal** (`/vendor/*`) — manage booking queue, track earnings, schedule appointments, toggle online/offline status.
- **Manager Portal** (`/manager/*`) — analytics dashboard, resident directory, vendor applications/leaderboard, announcements, property map.

### Authentication

The app uses a **mock Supabase auth system** for offline demos. When real Supabase credentials are provided in `.env.local`, it connects to live Supabase. Without credentials, all auth works via `localStorage` with seeded demo accounts.

**Demo accounts:**
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
| Auth | Supabase (mock or real) | `@supabase/supabase-js` + `@supabase/ssr` |
| Charts | Recharts | ~3.8 |
| UI Primitives | Radix UI (avatar, dialog, dropdown, progress, scroll-area, select, separator, switch, tabs, tooltip) | latest |
| Icons | lucide-react | ~1.16 |
| Fonts | Google Fonts via `next/font` — Syne (headings) + Inter (body) |

## Build & Development Commands

```bash
# Install dependencies
npm install

# Development server (localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint (ESLint 9 with flat config)
npm run lint
```

There are **no test scripts** configured. The project currently has no testing framework.

## Project Structure

```
app/
  page.tsx                 # Landing page (auth-aware CTAs)
  layout.tsx               # Root layout with AuthProvider
  globals.css              # Tailwind v4 imports + custom design tokens + utilities
  login/page.tsx           # Unified login (resident/vendor toggle)
  signup/page.tsx          # Role selection
  signup/resident/page.tsx # Resident signup
  signup/vendor/page.tsx   # Vendor signup (with EIN, description)
  forgot-password/page.tsx # Password reset request
  verify-email/page.tsx    # Email verification landing
  pending-approval/page.tsx# Vendor pending approval screen
  auth/callback/route.ts   # OAuth callback handler
  admin/approvals/page.tsx # Manager-only vendor approval dashboard
  resident/
    layout.tsx             # Sidebar + MobileNav wrapper for resident pages
    page.tsx               # Resident dashboard
    services/page.tsx
    bookings/page.tsx
    events/page.tsx
    favorites/page.tsx
    notifications/page.tsx
    profile/page.tsx
    [...slug]/page.tsx
  vendor/
    layout.tsx
    page.tsx               # Vendor dashboard
    schedule/page.tsx
    queue/page.tsx
    earnings/page.tsx
    services/page.tsx
    profile/page.tsx
    [...slug]/page.tsx
  manager/
    layout.tsx
    page.tsx               # Manager dashboard
    analytics/page.tsx
    residents/page.tsx
    vendors/page.tsx
    announcements/page.tsx
    settings/page.tsx
    [...slug]/page.tsx

components/
  layout/
    Sidebar.tsx            # Auth-aware desktop sidebar
    MobileNav.tsx          # Auth-aware bottom nav for mobile
  auth/
    AuthProvider.tsx       # Global auth state + route guards
    GoogleButton.tsx       # Google OAuth button
  ui/
    GlassCard.tsx          # Reusable glassmorphism card wrapper
    EmptyState.tsx
    SectionHeader.tsx
    StatusBadge.tsx
    Tabs.tsx
  vendor/
    KanbanBoard.tsx
    EarningsChart.tsx
  manager/
    EngagementChart.tsx
    PropertyMap.tsx

lib/
  supabase/
    client.ts              # Browser Supabase client (mock or real)
    server.ts              # Server-side Supabase client
    middleware.ts          # Session refresh helper
  auth/
    mock-auth.ts           # Mock Supabase auth (localStorage-based)
    hooks.ts               # useAuth, useAllProfiles hooks
  types.ts                 # TypeScript domain types
  mock-data.ts             # Static mock data
  store.ts                 # Zustand global store (auth + app state)
  utils.ts                 # cn(), getInitials(), getGreeting(), formatDate()
  animations.ts            # Shared Framer Motion variants

middleware.ts              # Next.js middleware (session refresh)
```

## Authentication Architecture

### Mock Auth (Default — no env vars needed)

When `NEXT_PUBLIC_SUPABASE_URL` is empty, the app uses a mock auth system:
- `lib/auth/mock-auth.ts` implements `signUp`, `signInWithPassword`, `signInWithOAuth`, `signOut`, `getSession`, `resetPasswordForEmail`, `onAuthStateChange`
- Users and profiles are stored in `localStorage`
- Demo accounts are auto-seeded on first load
- Vendor signups default to `approval_status: "pending"`

### Real Supabase (Optional)

Fill in `.env.local` with real Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Required Supabase setup:
1. **Database**: Create a `profiles` table extending `auth.users`:
   ```sql
   create table profiles (
     id uuid references auth.users on delete cascade primary key,
     email text not null,
     first_name text,
     last_name text,
     phone text,
     role text not null check (role in ('resident', 'vendor', 'manager')),
     approval_status text not null default 'pending',
     onboarding_completed boolean default false,
     ein_tax_id text,
     description text,
     avatar_url text,
     created_at timestamptz default now(),
     updated_at timestamptz default now()
   );
   ```
2. **Auth**: Enable Email provider and Google OAuth in Authentication settings
3. **Trigger**: Create a trigger on `auth.users` insert to auto-create profile rows

### Route Protection

`AuthProvider` (in `app/layout.tsx`) handles all route guards client-side:
- Unauthenticated users on protected routes → redirected to `/login`
- Vendors with `approval_status === "pending"` → redirected to `/pending-approval`
- Authenticated users on auth pages (`/login`, `/signup`) → redirected to their portal
- Role-based guards: residents can't access `/manager/*` or `/vendor/*`

### Auth Hooks

```tsx
import { useAuth } from "@/lib/auth/hooks";

function MyComponent() {
  const { user, profile, isLoading, signOut } = useAuth();
  // profile.role: "resident" | "vendor" | "manager"
  // profile.approval_status: "pending" | "approved" | "rejected"
}
```

## Routing & Layout Architecture

The app uses **Next.js App Router** with three parallel route trees under `app/`. Each role has:

1. A dedicated `layout.tsx` that renders `<Sidebar role="..." />`, `<MobileNav role="..." />`, and a `<main>` content area with left padding on desktop (`lg:pl-64`).
2. A `page.tsx` for the dashboard/home view.
3. Sub-pages for specific features.
4. A `[...slug]/page.tsx` catch-all to gracefully handle unknown paths.

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
- Animations should reuse variants from `lib/animations.ts` rather than inlining.
- Icons are imported individually from `lucide-react`.
- Inline role accent colors are passed via `style={{ color: accent, background: `${accent}18` }}` rather than Tailwind arbitrary values.

## Data & State

### Mock Data (`lib/mock-data.ts`)

Application data for dashboards lives in a single file. It exports typed arrays and objects for vendors, bookings, events, analytics, etc.

**When adding new features that need data, extend `lib/mock-data.ts` and `lib/types.ts`.**

### Global State (`lib/store.ts`)

Zustand store tracks:
- `role`: `"resident" | "vendor" | "manager" | null`
- `isOnline`: boolean (vendor online toggle)
- `activeCategory`: string (resident services filter)
- `user`: Supabase User | null
- `profile`: Profile | null
- `isAuthLoading`: boolean

### Auth State

Prefer `useAuth()` from `lib/auth/hooks.ts` for reading auth state. The hook syncs with Zustand automatically via `AuthProvider`.

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

The app registers a basic service worker (`public/sw.js`) that caches the shell routes (`/`, `/resident`, `/vendor`, `/manager`) and serves them offline. `manifest.webmanifest` makes it installable. The service worker is **not a Workbox-generated** SW; it is a hand-written simple cache-first script.

## Testing Strategy

**There is currently no testing framework.** No Jest, Vitest, Playwright, Cypress, or React Testing Library is installed. If you add tests, follow the project's TypeScript and client-component patterns. All pages are client components, so tests should render within a Next.js-compatible DOM environment.

## Security Considerations

- **Mock mode**: No real authentication. Demo accounts are hard-coded. Suitable for demos and prototyping only.
- **Real Supabase mode**: Uses Supabase Auth with RLS policies. Stripe secrets and service role keys must never be exposed to the client.
- The service worker caches GET requests without origin restrictions. This is acceptable for a static demo but should be hardened if a real backend is introduced.

## Key Files for Agents

| File | Why it matters |
|------|---------------|
| `lib/auth/mock-auth.ts` | Mock auth implementation — update when adding auth features |
| `lib/auth/hooks.ts` | `useAuth()` and `useAllProfiles()` hooks |
| `lib/supabase/client.ts` | Supabase browser client (switches mock ↔ real) |
| `components/auth/AuthProvider.tsx` | Route guards and auth state sync |
| `lib/types.ts` | Domain model — add new types here |
| `lib/mock-data.ts` | Dashboard mock data |
| `lib/store.ts` | Global state — auth + app state |
| `lib/animations.ts` | Reusable Framer Motion presets |
| `lib/utils.ts` | `cn()` and formatting helpers |
| `components/ui/GlassCard.tsx` | Standard card primitive |
| `components/layout/Sidebar.tsx` | Navigation config per role |
| `app/globals.css` | Tailwind v4 theme tokens + custom utilities |
| `next.config.ts` | Next.js config |
| `eslint.config.mjs` | ESLint 9 flat config |

## Common Pitfalls

1. **Do not assume a traditional Next.js 14 structure.** This is Next.js 16 with React 19.
2. **No `tailwind.config.ts`.** Custom theme values are in `globals.css` via `@theme`.
3. **Most pages are `"use client"`.** If you need server components, be explicit.
4. **Role accent colors are inline styles**, not Tailwind classes, because they vary by role at runtime.
5. **The mock auth stores data in localStorage.** Clearing browser data will reset demo accounts.
