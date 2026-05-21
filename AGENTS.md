<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LifeRise Solutions — Agent Guide

## Project Overview

LifeRise Solutions is a **demo/prototype** Next.js web application for a property-management service marketplace. It simulates three user portals from a single frontend codebase:

- **Resident Portal** (`/resident/*`) — browse and book home services, manage appointments, view community events.
- **Vendor Portal** (`/vendor/*`) — manage booking queue via a Kanban board, track earnings, schedule appointments, toggle online/offline status.
- **Manager Portal** (`/manager/*`) — analytics dashboard, resident directory, vendor applications/leaderboard, announcements, property map.

There is **no backend API or database**. All data is hard-coded mock data in `lib/mock-data.ts`. The landing page (`/`) acts as a login screen with one-click "Quick Demo Access" buttons that route into each portal.

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
  page.tsx                 # Landing / login page with role selector
  layout.tsx               # Root layout (fonts, PWA manifest, service worker)
  globals.css              # Tailwind v4 imports + custom design tokens + utilities
  resident/
    layout.tsx             # Sidebar + MobileNav wrapper for resident pages
    page.tsx               # Resident dashboard
    services/page.tsx
    bookings/page.tsx
    events/page.tsx
    favorites/page.tsx
    notifications/page.tsx
    profile/page.tsx
    [...slug]/page.tsx     # Catch-all for unmatched resident routes
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
    Sidebar.tsx            # Role-aware desktop sidebar with nav + portal switcher
    MobileNav.tsx          # Role-aware bottom nav bar for mobile
  ui/
    GlassCard.tsx          # Reusable glassmorphism card wrapper
    EmptyState.tsx
    SectionHeader.tsx
    StatusBadge.tsx
    Tabs.tsx
  vendor/
    KanbanBoard.tsx        # Framer Motion drag-free kanban with accept/decline
    EarningsChart.tsx      # Recharts bar chart
  manager/
    EngagementChart.tsx    # Recharts pie/donut chart
    PropertyMap.tsx        # Leaflet-based map (dynamically imported, SSR disabled)

lib/
  types.ts                 # All TypeScript domain types
  mock-data.ts             # All static mock data (vendors, bookings, events, etc.)
  store.ts                 # Zustand global store (role, online status, active category)
  utils.ts                 # cn(), getInitials(), getGreeting(), formatDate()
  animations.ts            # Shared Framer Motion variants & transitions

public/
  liferise_logo.png        # App logo / PWA icon
  manifest.webmanifest     # PWA manifest
  sw.js                    # Basic service worker for offline shell caching
```

## Routing & Layout Architecture

The app uses **Next.js App Router** with three parallel route trees under `app/`. Each role has:

1. A dedicated `layout.tsx` that renders `<Sidebar role="..." />`, `<MobileNav role="..." />`, and a `<main>` content area with left padding on desktop (`lg:pl-64`).
2. A `page.tsx` for the dashboard/home view.
3. Sub-pages for specific features.
4. A `[...slug]/page.tsx` catch-all to gracefully handle unknown paths.

The root `app/page.tsx` is a client component (`"use client"`) that renders a login screen with a "Quick Demo Access" section. Clicking a portal button simulates a loading state and navigates to the role's home.

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

All application data lives in a single file. It exports typed arrays and objects for:
- Vendors / service details / service offerings
- Resident bookings and booking history
- Community events
- Vendor Kanban data, schedule, earnings
- Manager analytics, resident directory, vendor applications, announcements
- Notifications, payment methods, profiles

**When adding new features that need data, extend `lib/mock-data.ts` and `lib/types.ts`.**

### Global State (`lib/store.ts`)

A minimal Zustand store tracks:
- `role`: `"resident" | "vendor" | "manager" | null`
- `isOnline`: boolean (vendor online toggle)
- `activeCategory`: string (resident services filter)

Most pages are client components that manage local state with `useState`.

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

- This is a **frontend demo only**. There is no authentication, authorization, API, or secrets management.
- The login page is purely cosmetic — clicking "Sign In" does nothing; the actual entry points are the "Quick Demo Access" role buttons.
- No sensitive data is handled. Mock data uses fake emails and phone numbers.
- The service worker caches GET requests without origin restrictions. This is acceptable for a static demo but should be hardened if a real backend is introduced.

## Key Files for Agents

| File | Why it matters |
|------|---------------|
| `lib/types.ts` | Domain model — add new types here |
| `lib/mock-data.ts` | All data — extend when building new screens |
| `lib/store.ts` | Global state — use for cross-page shared state |
| `lib/animations.ts` | Reusable Framer Motion presets |
| `lib/utils.ts` | `cn()` (clsx + tailwind-merge) and formatting helpers |
| `components/ui/GlassCard.tsx` | Standard card primitive |
| `components/layout/Sidebar.tsx` | Navigation config per role is hard-coded here |
| `app/globals.css` | Tailwind v4 theme tokens + custom utilities |
| `next.config.ts` | Next.js config — `optimizePackageImports` for heavy libs |
| `eslint.config.mjs` | ESLint 9 flat config extending Next.js core-web-vitals + typescript |

## Common Pitfalls

1. **Do not assume a traditional Next.js 14 structure.** This is Next.js 16 with React 19. Check `node_modules/next/dist/docs/` for current APIs.
2. **No `tailwind.config.ts`.** Custom theme values are in `globals.css` via `@theme`.
3. **Most pages are `"use client"`.** If you need server components, be explicit — the default in this codebase is client-side for interactivity.
4. **Mock data is the only data source.** Do not write `fetch` calls expecting a backend; there is none.
5. **Role accent colors are inline styles**, not Tailwind classes, because they vary by role at runtime.
