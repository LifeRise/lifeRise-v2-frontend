# LifeRise Web — Portal Screens Roadmap

> **Goal:** Replace every `[...slug]` catch-all "Coming Soon" placeholder with a high-fidelity, functional demo screen.  
> **Constraint:** No backend integration — all state is local or mocked.  
> **Design System:** Dark Luxury (Midnight `#0A0F1E`, Electric Teal `#00D4AA`, Gold `#F5A623`, Purple `#818CF8`, Syne/Inter).

---

## Legend

| Priority | Meaning |
|----------|---------|
| **P0** | Blocking foundation — must be completed first |
| **P1** | Core user experience — high visual impact |
| **P2** | Important depth — secondary screens |
| **P3** | Polish & fallback hygiene |

---

## Phase 0 — Foundation (Data & Shared UI)

> **Principle:** Build once, reuse everywhere. Every screen in Phases 1–3 depends on these primitives.

### P0.1 Type-Safe Mock Data Expansion
**File:** `lib/mock-data.ts`  
**Also creates:** `lib/types.ts` (new — centralize all interfaces)

- [x] **Extract and export explicit TypeScript interfaces** for all existing inferred shapes (`Vendor`, `ResidentBooking`, `KanbanCard`, `Event`, `Announcement`, etc.).
- [x] **Resident domain data**
  - `residentProfile`: `{ name, email, avatar, unit, phone, moveInDate, preferences: { notifications: boolean, marketing: boolean } }`
  - `paymentMethods`: `{ id, type: "visa" | "mastercard" | "amex", last4, expiry, isDefault, cardholderName }[]`
  - `serviceDetails`: Extend `vendors` with `{ description: string, tags: string[], portfolio: string[], estimatedDuration: string, cancellationPolicy: string }`
  - `notifications`: `{ id, title, body, timestamp, read: boolean, type: "booking" | "promo" | "system" | "alert", actionUrl?: string }[]`
  - `bookingHistory`: Extend `residentBookings` with `{ history: { status, timestamp, note }[], rating?: number, review?: string, isRecurring: boolean }`
- [x] **Vendor domain data**
  - `vendorProfile`: `{ name, email, avatar, bio, specialties: string[], serviceRadius: string, joinedDate: string, idVerified: boolean }`
  - `earningsBreakdown`: `{ jobs: { id, client, service, date, amount, commission, net, status: "paid" | "pending" }[], weeklyTotal, monthlyTotal, pendingPayout, ytdTotal }`
  - `vendorServices`: `{ id, name, category, basePrice, duration, description, isActive, bookingsCount, viewsCount }[]`
  - `scheduleSlots`: `{ id, day: string, startTime, endTime, client, service, status: "available" | "booked" | "blocked" }[]`
- [x] **Manager domain data**
  - `residentDirectory`: `{ id, name, unit, building, email, phone, status: "active" | "inactive", lastActivity, totalBookings, outstandingBalance }[]`
  - `vendorApplications`: `{ id, name, email, specialty, appliedDate, status: "pending" | "approved" | "rejected", documents: string[], rating, totalJobs }[]`
  - `analyticsTimeSeries`: `{ date, bookings, revenue, newResidents, complaints }[]` (30-day mock)
  - `categoryRevenue`: `{ category, revenue, bookings, color }[]`

**Tech Notes:**
- Keep shapes flat and serializable (no class instances, no functions).
- Use `as const` for category lists to enable union types.

---

### P0.2 Shared UI Primitives
**New Directory:** `components/ui/`  
*(These are thin, styled wrappers — not a full design-system package.)*

- [x] **`GlassCard`** — `components/ui/GlassCard.tsx`
  - Props: `children`, `className`, `hover?: boolean`, `glow?: "teal" | "gold" | "purple" | null`
  - Base: `glass rounded-2xl p-5` (or `glass-dark`). Optional `teal-glow` / `gold-glow` classes.
- [x] **`StatusBadge`** — `components/ui/StatusBadge.tsx`
  - Props: `status: string`, `variant: "resident" | "vendor" | "manager"`
  - Maps statuses to portal-accurate colors (teal/gold/purple) with subtle bg tints.
- [x] **`EmptyState`** — `components/ui/EmptyState.tsx`
  - Props: `icon`, `title`, `description`, `action?`
  - Centered, muted text, `Sparkles` or portal-specific icon.
- [x] **`SectionHeader`** — `components/ui/SectionHeader.tsx`
  - Props: `title`, `subtitle?`, `action?` (React node for a "View All" link/button)
  - Uses `font-heading` for title, `text-muted` for subtitle.
- [x] **`Tabs`** — `components/ui/Tabs.tsx`
  - Minimal local-state tabs using `framer-motion` `layoutId` for the active underline pill.
  - Avoid importing heavy headless libraries; keep it under 60 lines.

**Tech Notes:**
- All primitives must be Server-Component-safe by default (no hooks). Export a `"use client"` wrapper only if interactivity is required (e.g. `Tabs`).
- Use `cn()` from `lib/utils.ts` for every conditional class.

---

### P0.3 Animation Utilities
**New File:** `lib/animations.ts`

- [x] **`staggerContainer(delay = 0.07)`** — returns Framer Motion `variants` for parent containers.
- [x] **`fadeUpItem`** — child variant for staggered fade-up cards.
- [x] **`pageTransition`** — wrapper variant for route-level entrance (`opacity: 0 → 1`, `y: 12 → 0`, `duration: 0.35`).
- [x] **`layoutSpring`** — shared spring config for layout animations (`type: "spring", stiffness: 300, damping: 30`).

**Tech Notes:**
- Reuse these in every new page instead of copying inline variants.
- For tab switches, wrap content in `AnimatePresence` + `mode="wait"`.

---

## Phase 1 — Resident Portal

> **Accent:** Electric Teal (`#00D4AA`)  
> **Base Route:** `/resident/*`

### P1.1 Services Marketplace
**Route:** `app/resident/services/page.tsx`  
**Replaces:** `app/resident/[...slug]` for slug `services`

- [x] **Search & Filter Bar**
  - Sticky top bar with search input (`bg-midnight/60 border-white/10`), category pills (horizontal scroll), and a "Filter" button.
  - Pills reuse the `categories` array; active pill gets `bg-teal text-midnight`.
- [x] **Service Grid**
  - `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
  - Card content: gradient header (reuse existing vendor gradient pattern), vendor initials circle, name, specialty, star rating with review count, short `description` (2-line clamp), price range, "Book Now" CTA.
  - Availability overlay (subtle pulse dot + "Available Today" text).
- [x] **Empty States**
  - No search results: `EmptyState` with `SearchX` icon.
  - Category filter yielding nothing: prompt to clear filters.
- [x] **Animations**
  - Grid uses `staggerContainer` / `fadeUpItem` on mount.
  - Filter changes trigger `AnimatePresence` exit/enter on cards (`layout` prop enabled for smooth reordering).

**Data Dependency:** P0.1 `serviceDetails`

---

### P1.2 My Bookings Management
**Route:** `app/resident/bookings/page.tsx`  
**Replaces:** `app/resident/[...slug]` for slug `bookings`

- [x] **Tab Navigation**
  - Tabs: **Active**, **Past**, **Cancelled**.
  - Active tab underline uses `layoutId` spring animation (teal).
- [x] **Booking List**
  - Vertical list of `GlassCard` rows.
  - Each row: vendor avatar, service name, date/time block, `StatusBadge`, amount.
  - Active bookings show action buttons: "Reschedule" (opens mock modal), "Cancel" (confirms + moves to Cancelled tab).
  - Past bookings show: "Rebook" (copies details to new booking) and "Rate" (star input local state).
- [x] **Booking Detail Sheet** (optional P2 enhancement)
  - Clicking a row expands inline or opens a bottom sheet with full history timeline.
- [x] **Animations**
  - `AnimatePresence` crossfade between tabs.
  - List items stagger in on tab switch.

**Data Dependency:** P0.1 `bookingHistory`

---

### P1.3 Profile & Payment Methods
**Route:** `app/resident/profile/page.tsx`  
**Replaces:** `app/resident/[...slug]` for slug `profile`

- [x] **Profile Header**
  - Large avatar circle with initials, name, email, unit number.
  - "Edit" button toggles inline form fields (name, phone, unit).
- [x] **Payment Methods Section**
  - List of cards as horizontal `GlassCard`s showing card brand icon (Lucide `CreditCard`), masked number (`**** **** **** 4242`), expiry, `isDefault` badge.
  - "Add Payment Method" button opens a mock form (card number, expiry, CVC, zip) — validates format with regex but does NOT call any API.
  - "Remove" button with confirmation per card.
- [x] **Preferences Section**
  - Toggle switches: Push Notifications, Email Updates, SMS Alerts.
  - Toggle uses a custom styled switch with teal active state.
- [x] **Animations**
  - Form expand uses `motion.div` with `animate={{ height: "auto" }}`.
  - Card add/remove uses `AnimatePresence` with slide-out.

**Data Dependency:** P0.1 `residentProfile`, `paymentMethods`

---

### P1.4 Events Listing
**Route:** `app/resident/events/page.tsx`  
**Replaces:** `app/resident/[...slug]` for slug `events`

- [x] **Events Grid**
  - `grid-cols-1 md:grid-cols-2` large cards.
  - Each card: event image placeholder with gradient overlay, title, date pill, location, spots remaining progress bar (`bg-slate-mid` track, `bg-teal` fill), "I'm Interested" toggle button.
- [x] **Animations**
  - Stagger fade-up on mount.
  - Interest toggle triggers a small `scale` spring pop on the heart icon.

**Data Dependency:** Existing `events` (sufficient)

---

### P1.5 Favorites
**Route:** `app/resident/favorites/page.tsx`  
**Replaces:** `app/resident/[...slug]` for slug `favorites`

- [x] **Favorites Grid**
  - Reuse service card component from P1.1.
  - "Remove" action (heart icon toggle) with `AnimatePresence` exit animation.
- [x] **Empty State**
  - `Heart` icon + "No favorites yet." + CTA to browse services.

**Data Dependency:** P0.1 `serviceDetails` (filter by a new `isFavorite` flag or local state)

---

### P1.6 Notifications Center
**Route:** `app/resident/notifications/page.tsx`  
**Replaces:** `app/resident/[...slug]` for slug `notifications`

- [x] **Notification List**
  - Vertical list of `GlassCard` rows.
  - Unread items have a left teal border (`border-l-2 border-teal`) and slightly brighter bg.
  - Each row: icon (varies by `type`), title, body snippet, relative timestamp ("2h ago"), mark-as-read dot.
- [x] **Bulk Actions**
  - "Mark All Read" and "Clear All" buttons in header.
- [x] **Animations**
  - Swipe-to-dismiss on mobile (Framer Motion `drag="x"` with `dragConstraints` and exit animation).
  - Mark-as-read triggers a subtle fade to muted opacity.

**Data Dependency:** P0.1 `notifications`

---

## Phase 2 — Vendor Portal

> **Accent:** Gold (`#F5A623`)  
> **Base Route:** `/vendor/*`

### P2.1 My Schedule (Calendar View)
**Route:** `app/vendor/schedule/page.tsx`  
**Replaces:** `app/vendor/[...slug]` for slug `schedule`

- [x] **Week View Grid**
  - Custom CSS grid: 7 columns (Mon–Sun), time rows from 06:00 to 22:00 in 1h increments.
  - Header shows day name + date; current day gets gold underline.
  - Scrollable vertically on all viewports.
- [x] **Event Blocks**
  - Booked appointments rendered as absolute-positioned cards inside the grid spanning their duration.
  - Block shows client initials, service name, and time range.
  - Color code: `bg-gold/20 border-gold/40` for bookings, `bg-slate-mid` for blocked slots.
- [x] **Day Navigation**
  - "Previous Week / Next Week" chevrons; week switch triggers a Framer Motion `AnimatePresence` slide transition (slide left/right based on direction).
- [x] **Interactions**
  - Click an empty slot to "Block Time" (local state toggle).
  - Click a booking to see mock details (modal).

**Data Dependency:** P0.1 `scheduleSlots`

**Tech Notes:**
- No external calendar library (FullCalendar, react-big-calendar) — keep it lightweight with Tailwind grid.
- Use `layout` prop on motion blocks if drag-to-resize is desired (optional P3).

---

### P2.2 Detailed Earnings Breakdown
**Route:** `app/vendor/earnings/page.tsx`  
**Replaces:** `app/vendor/[...slug]` for slug `earnings`

- [x] **KPI Header**
  - 4 cards: Total Earnings, This Week, Pending Payout, Lifetime Jobs.
  - Reuse existing dashboard KPI styling but with gold accents.
- [x] **Expanded Chart**
  - Reuse `EarningsChart` (`components/vendor/EarningsChart.tsx`) but add a **time-range toggle** (Week / Month / Year).
  - Each range swaps the `data` prop to a different mock slice.
  - Wrap in `dynamic(() => import(...), { ssr: false })` + `mounted` guard.
- [x] **Job Breakdown Table**
  - Scrollable list under the chart.
  - Columns: Date, Client, Service, Gross, Commission (15%), Net, Status (paid/pending).
  - Status uses `StatusBadge` with gold variant for pending, teal for paid.
- [x] **Tax / Payout Summary**
  - Bottom card with mock tax withholdings and estimated next payout date.

**Data Dependency:** P0.1 `earningsBreakdown`

---

### P2.3 My Services Editor
**Route:** `app/vendor/services/page.tsx`  
**Replaces:** `app/vendor/[...slug]` for slug `services`

- [x] **Service List**
  - Each service is a `GlassCard` with:
    - Service name, category badge, price, duration.
    - Toggle switch for `isActive`.
    - Mini stats: bookings count, views count.
    - "Edit" button that expands inline form fields (name, description, price, duration).
- [x] **Add Service Form**
  - "Add New Service" card at the bottom.
  - Fields: Name, Category (dropdown), Description, Base Price, Estimated Duration.
  - On "Save", append to local state array with `AnimatePresence` entrance.
- [x] **Animations**
  - Expand/collapse edit form uses `motion.div` height animation.
  - New service card slides in from top (`initial={{ opacity: 0, y: -20 }}`).

**Data Dependency:** P0.1 `vendorServices`

---

### P2.4 Booking Queue (Dedicated Full View)
**Route:** `app/vendor/queue/page.tsx`  
**Replaces:** `app/vendor/[...slug]` for slug `queue`

- [x] **Extract Kanban from Dashboard**
  - Move the kanban board logic out of `app/vendor/page.tsx` into a new shared component: `components/vendor/KanbanBoard.tsx`.
- [x] **Dashboard Refactor**
  - Replace the inline kanban on `app/vendor/page.tsx` with a preview showing the first 3 cards per column + a "View Full Queue →" link to `/vendor/queue`.
- [x] **Full Queue Page**
  - Same 3-column layout (`new`, `accepted`, `inProgress`) but with more vertical space and scrollable columns.
  - Add column headers with item count badges.
  - Drag-and-drop reordering within a column (Framer Motion `drag` + `dragConstraints` on the column, or `@dnd-kit` if preferred — but prefer Framer Motion for consistency).
- [x] **Animations**
  - Card accept/decline uses existing dashboard animations.
  - Column reordering uses `layout` prop.

**Data Dependency:** Existing `kanbanData` (sufficient)

---

### P2.5 Vendor Profile
**Route:** `app/vendor/profile/page.tsx`  
**Replaces:** `app/vendor/[...slug]` for slug `profile`

- [x] **Profile Header**
  - Avatar, name, rating stars, total jobs, join date, ID verified badge.
- [x] **Editable Bio**
  - Textarea for bio, specialty tags (chips), service radius selector.
- [x] **Stats Snapshot**
  - Small grid: 30-Day Earnings, Response Rate, Completion Rate, Repeat Client %.

**Data Dependency:** P0.1 `vendorProfile`

---

## Phase 3 — Manager Portal

> **Accent:** Purple (`#818CF8`)  
> **Base Route:** `/manager/*`

### P3.1 Full Analytics Suite
**Route:** `app/manager/analytics/page.tsx`  
**Replaces:** `app/manager/[...slug]` for slug `analytics`

- [x] **Date Range Selector**
  - Pill buttons: 7D, 30D, 90D, YTD. Mock data slices swap on toggle.
- [x] **KPI Row**
  - 4 stat cards with delta badges (green up / red down) vs previous period.
- [x] **Chart Grid**
  - **Line Chart** (Recharts): Bookings + New Residents over time.
  - **Bar Chart** (Recharts): Revenue by service category.
  - **Pie Chart** (Recharts): Reuse `EngagementChart` logic for "Service Mix".
  - **Area Chart** (Recharts): Complaints vs Resolutions trend.
  - All charts wrapped in `dynamic(..., { ssr: false })` + `mounted` guard.
- [x] **Top Performers**
  - Horizontal bar mini-chart of top 5 vendors by bookings this month.

**Data Dependency:** P0.1 `analyticsTimeSeries`, `categoryRevenue`, existing `engagementData`

**Tech Notes:**
- Use `ResponsiveContainer` from Recharts with `min-height` wrappers to prevent layout shift.
- Animate chart entrance with `motion.div` fade-in after `mounted === true`.

---

### P3.2 Resident Directory
**Route:** `app/manager/residents/page.tsx`  
**Replaces:** `app/manager/[...slug]` for slug `residents`

- [x] **Search & Filters**
  - Search input (name, unit, email), building filter dropdown, status filter pills.
- [x] **Directory Grid**
  - `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
  - Each card: initials, name, unit, building tag, email, phone, status dot, total bookings.
  - "View Activity" button opens a modal with a mock activity log (list of recent bookings / payments).
- [x] **Table Toggle**
  - Icon toggle to switch from grid cards to a dense table view (useful for managers).
- [x] **Empty State**
  - No search results: `Users` icon + "No residents found."

**Data Dependency:** P0.1 `residentDirectory`

---

### P3.3 Vendor Management Center
**Route:** `app/manager/vendors/page.tsx`  
**Replaces:** `app/manager/[...slug]` for slug `vendors`

- [x] **Application Pipeline**
  - Tabs: **Applications**, **Active Vendors**, **Suspended**.
  - Applications tab shows cards with applicant info, applied date, documents list (mock), Approve / Reject buttons.
  - On Approve, card animates out and moves to Active tab (optimistic local state).
- [x] **Active Vendor Table**
  - Dense table: Name, Specialty, Rating, Total Jobs, Earnings, Trend icon, Actions (Suspend, View Details).
  - Reuse leaderboard styling from manager dashboard.
- [x] **Vendor Detail Modal**
  - Full profile + services offered + mock review excerpts + earnings mini-chart.

**Data Dependency:** P0.1 `vendorApplications`, existing `vendorLeaderboard`

---

### P3.4 Announcement Center
**Route:** `app/manager/announcements/page.tsx`  
**Replaces:** `app/manager/[...slug]` for slug `announcements`

- [x] **Composer Expansion**
  - Move the composer from `app/manager/page.tsx` to this page and enhance it:
    - Target audience selector: All Residents, Specific Building, Vendors Only.
    - Priority toggle: Normal / Urgent (adds red styling).
    - Richer preview card.
- [x] **Dashboard Refactor**
  - Replace inline composer on `app/manager/page.tsx` with a "New Announcement" quick button + recent 3 announcements list + "Manage Announcements →" link.
- [x] **Announcement History**
  - Full list with filters: category, date range, priority.
  - Each item shows sent status, read count (mock), and a "Duplicate" action.

**Data Dependency:** Existing `announcements` (sufficient)

---

### P3.5 Settings
**Route:** `app/manager/settings/page.tsx`  
**Replaces:** `app/manager/[...slug]` for slug `settings`

- [x] **Settings Sections**
  - **Complex Info:** Name, address, manager contact (editable local form).
  - **Notification Rules:** Toggle switches for email digests, vendor alerts, resident complaints.
  - **Billing:** Mock plan info ("LifeRise Manager Pro"), next invoice date, usage stats.
  - **Danger Zone:** Mock "Reset Demo Data" button (resets Zustand + local state to initial mocks).
- [x] **Visual Style**
  - Use `GlassCard` groups with left purple accent borders for section separation.

**Data Dependency:** Minimal — mostly local form state.

---

## Phase 4 — Navigation, Polish & QA

### P4.1 Sidebar & MobileNav Verification
**File:** `components/layout/Sidebar.tsx`, `components/layout/MobileNav.tsx`

- [ ] **Verify hrefs** already point to correct routes (they do — no href changes needed).
- [ ] **Active state audit:** Ensure `pathname.startsWith(href)` logic highlights parent nav items when on sub-routes.
- [ ] **MobileNav completeness:**
  - Resident mobile: already covers Home, Services, Bookings, Alerts, Profile. ✓
  - Vendor mobile: add "My Services" if thumb-reachable? Keep at 5 items max; maybe swap Profile for Services or keep as-is. Decision: keep existing 5, add Services only if user requests.
  - Manager mobile: currently only 4 items. Add "Residents" or "Vendors" to reach 5 if desired.

### P4.2 Dashboard "View All" Linking
**Files:** `app/resident/page.tsx`, `app/vendor/page.tsx`, `app/manager/page.tsx`

- [x] Add `SectionHeader` with action links to respective sub-routes:
  - Resident: "View All Services" → `/resident/services`, "My Bookings" → `/resident/bookings`
  - Vendor: "Full Schedule" → `/vendor/schedule`, "Full Queue" → `/vendor/queue`
  - Manager: "View Analytics" → `/manager/analytics`, "Manage Residents" → `/manager/residents`

### P4.3 Catch-All Cleanup
**Files:** `app/resident/[...slug]/page.tsx`, `app/vendor/[...slug]/page.tsx`, `app/manager/[...slug]/page.tsx`

- [ ] **Trim `sectionNames` maps** to only slugs that are *truly* unimplemented (if any).
- [ ] **Optional:** Keep catch-alls as graceful fallbacks for any future undefined routes. Update copy from "Coming Soon" to "Page Not Found" with a back button.
- [ ] **Remove** catch-all files only if every known slug has a dedicated page. Safer to keep as thin fallback.

### P4.4 Responsive & Animation Audit
- [ ] **Scroll behavior:** All new pages use `min-h-[calc(100vh-...)]` with proper bottom padding to account for mobile nav (`pb-24 lg:pb-8`).
- [ ] **Reduced motion:** Wrap Framer Motion `animate` props in a `prefers-reduced-motion` media query helper (or use `useReducedMotion` from Framer Motion).
- [ ] **Chart SSR guards:** Every Recharts instance uses `dynamic(() => ..., { ssr: false })` + `mounted` state.
- [ ] **Font consistency:** All headings use `font-heading`, body uses `font-sans`.
- [ ] **Color consistency:** No hardcoded hexes outside `globals.css` tokens. Use Tailwind utilities (`text-teal`, `bg-gold`, etc.).

### P4.5 Dependency Check
- [x] No new runtime dependencies required for Phases 0–4 (Recharts, Framer Motion, Tailwind, Zustand, Lucide already installed).
- [x] If drag-and-drop kanban feels clunky with Framer Motion alone, consider `@dnd-kit/core` as an optional lightweight addition (evaluate during P2.4).

---

## Appendix A — New File Inventory

### Routes (pages)
```
app/resident/services/page.tsx
app/resident/bookings/page.tsx
app/resident/profile/page.tsx
app/resident/events/page.tsx
app/resident/favorites/page.tsx
app/resident/notifications/page.tsx

app/vendor/schedule/page.tsx
app/vendor/earnings/page.tsx
app/vendor/services/page.tsx
app/vendor/queue/page.tsx
app/vendor/profile/page.tsx

app/manager/analytics/page.tsx
app/manager/residents/page.tsx
app/manager/vendors/page.tsx
app/manager/announcements/page.tsx
app/manager/settings/page.tsx
```

### Shared Components
```
components/ui/GlassCard.tsx
components/ui/StatusBadge.tsx
components/ui/EmptyState.tsx
components/ui/SectionHeader.tsx
components/ui/Tabs.tsx

components/vendor/KanbanBoard.tsx   (extracted from dashboard)
```

### Libraries
```
lib/types.ts          (new — centralized types)
lib/animations.ts     (new — reusable motion variants)
```

---

## Appendix B — Design System Quick Reference

| Token | Tailwind | Hex | Usage |
|-------|----------|-----|-------|
| Midnight | `bg-midnight` | `#0A0F1E` | Page background |
| Slate Deep | `bg-slate-deep` | `#1A2235` | Card / surface base |
| Slate Mid | `bg-slate-mid` | `#243049` | Hover states, borders |
| Slate Light | `bg-slate-light` | `#2D3E5A` | Inputs, disabled |
| Electric Teal | `text-teal` / `bg-teal` | `#00D4AA` | Resident accent |
| Gold | `text-gold` / `bg-gold` | `#F5A623` | Vendor accent |
| Purple Accent | `text-purple-accent` / `bg-purple-accent` | `#818CF8` | Manager accent |
| LR White | `text-lr-white` | `#F8FAFC` | Primary text |
| Muted | `text-muted` | `#94A3B8` | Secondary text |

**Glass Panel:** `glass` class → `bg-slate-deep/72 backdrop-blur-xl border border-white/[0.07]`

**Heading Font:** `font-heading` (Syne)  
**Body Font:** `font-sans` (Inter)

---

## Appendix C — Animation Conventions per Screen

| Screen Type | Entrance | Interaction | Exit |
|-------------|----------|-------------|------|
| List/Grid | `staggerContainer` + `fadeUpItem` on cards | `layout` prop on reorder/filter | `AnimatePresence` scale-out |
| Tabs | — | `layoutId` underline spring | `AnimatePresence` crossfade content |
| Modal/Sheet | `scale: 0.95 → 1`, `opacity: 0 → 1` | — | `scale: 0.95`, `opacity: 0` |
| Calendar Week | Slide left/right based on direction | `layout` on event blocks | Slide opposite direction |
| Charts | Fade-in after `mounted` | — | — |

---

*End of Roadmap*
