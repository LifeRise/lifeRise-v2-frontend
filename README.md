# LifeRise Solutions

> **The unified service marketplace for modern residential properties.**
> Connecting residents, vendors, and property managers in one seamless, dark-luxury ecosystem.

---

## Overview

LifeRise Solutions is a high-fidelity prototype of a property-management service platform. It demonstrates three fully interactive portals — each tailored to a specific user persona — built on a unified design system with glassmorphism aesthetics, fluid animations, and a strictly dark color palette.

The platform requires no backend. All data is powered by a typed mock-data layer, making it instantly runnable with zero configuration.

---

## Tech Stack

| Layer | Technology | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.x |
| UI Library | React | 19.x |
| Language | TypeScript | ~5 |
| Styling | Tailwind CSS v4 | 4.x |
| Animation | Framer Motion | ~12 |
| State | Zustand | ~5 |
| Charts | Recharts | ~3 |
| UI Primitives | Radix UI | latest |
| Icons | lucide-react | ~1 |
| Fonts | Syne (headings) · Inter (body) | — |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and use the **Quick Demo Access** buttons to enter any portal.

```bash
# Production build
npm run build && npm start

# Lint
npm run lint
```

---

## The Three Portals

### 🏠 Resident Portal — `/resident`
A frictionless concierge experience for building residents. Browse verified service providers, book appointments in one tap, track services in real-time, and manage recurring bookings. Supports promo code redemption at checkout.

### 🔧 Vendor Portal — `/vendor`
A professional operations hub for independent service providers. Manage a real-time booking queue via a Kanban board, track weekly and monthly earnings with analytics charts, toggle online/offline availability, and build client relationships through an integrated CRM.

### 🏢 Manager Portal — `/manager`
A command center for property managers. Every dashboard is **brand-personalized** to match the property's identity. Monitor vendor compliance, analyze facility performance, broadcast announcements, and manage the resident directory — all from a single intelligent interface. Includes a promo code generation system for resident acquisition campaigns.

---

## Design System

LifeRise uses a **Dark Luxury** design language built on Tailwind CSS v4 with custom design tokens defined in `app/globals.css`.

| Token | Value | Role |
| --- | --- | --- |
| `--color-midnight` | `#0A0F1E` | Primary background |
| `--color-slate-deep` | `#1A2235` | Surface / card background |
| `--color-teal` | `#00D4AA` | Resident accent · primary CTA |
| `--color-gold` | `#F5A623` | Vendor accent |
| `--color-purple-accent` | `#818CF8` | Manager accent |
| `--color-muted` | `#94A3B8` | Secondary text |
| `--color-lr-white` | `#F8FAFC` | Primary text |

**Glassmorphism surfaces** — `.glass` and `.glass-dark` — use `backdrop-blur` and semi-transparent backgrounds to create depth without heavy shadows.

---

## Project Structure

```
app/
  page.tsx              # Landing page with role selector + Learn More modals
  layout.tsx            # Root layout (fonts, PWA, service worker)
  globals.css           # Tailwind v4 theme + custom utilities
  resident/             # Resident portal pages
  vendor/               # Vendor portal pages
  manager/              # Manager portal pages

components/
  layout/               # Sidebar, MobileNav
  modals/               # VendorModal, ResidentModal, ManagerModal
  ui/                   # GlassCard, EmptyState, SectionHeader, StatusBadge, Tabs
  vendor/               # KanbanBoard, EarningsChart
  manager/              # EngagementChart, PropertyMap

lib/
  types.ts              # Domain type definitions
  mock-data.ts          # All static application data
  store.ts              # Zustand global state
  animations.ts         # Shared Framer Motion variants
  utils.ts              # cn(), formatDate(), getInitials()

public/
  liferise_logo.png     # App logo / PWA icon
  manifest.webmanifest  # PWA manifest
  sw.js                 # Offline service worker
```

---

## Architecture Notes

- **App Router** — all routes use Next.js 16 App Router conventions with `layout.tsx` wrappers per portal.
- **Client Components** — most pages are `"use client"` for interactive state. Server components are opt-in.
- **No Backend** — extend `lib/mock-data.ts` and `lib/types.ts` when adding new data-driven features.
- **Modals** — persona-specific Learn More modals in `components/modals/` use Radix UI Dialog for accessibility and Framer Motion for animations.
- **PWA** — a hand-written service worker (`public/sw.js`) caches the shell routes for offline access.

