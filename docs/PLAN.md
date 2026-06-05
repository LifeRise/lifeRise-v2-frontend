# LifeRise v2-demo — Supabase Auth & Feature Update Plan

## Overview
Transform the current mock-data frontend demo into a real Supabase-backed application with:
- Full authentication (login, signup, Google OAuth, forgot password, email verification)
- Role-based access (resident, vendor, manager)
- Vendor approval/verification workflow
- Admin dashboard for managing approvals
- UI updates to match the mobile app's features

---

## Phase 1: Supabase Infrastructure

### 1.1 Install Dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 1.2 Environment Variables
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 1.3 Supabase Client Setup
- `lib/supabase/client.ts` — Browser client
- `lib/supabase/server.ts` — Server-side client (for Server Components / Actions)
- `lib/supabase/middleware.ts` — Auth session refresh middleware

### 1.4 Database Schema (Supabase)
**`profiles` table** (extends `auth.users`):
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

-- RLS policies
-- Users can read their own profile
-- Users can update their own profile
-- Managers can read all profiles
-- Service role can manage all profiles
```

**Trigger**: Auto-create profile on `auth.users` insert with default role.

---

## Phase 2: Next.js Middleware & Route Protection

### 2.1 Middleware (`middleware.ts`)
- Refresh Supabase session on every request
- Protect `/resident/*`, `/vendor/*`, `/manager/*` routes
- Redirect unauthenticated users to `/login`
- Redirect vendors with `approval_status = 'pending'` to `/pending-approval`
- Redirect to role-appropriate dashboard after login

### 2.2 Route Structure
```
/auth/callback        # OAuth callback handler
/login                # Unified login (resident/vendor toggle)
/signup               # Role selection → resident or vendor signup
/signup/resident      # Resident signup form
/signup/vendor        # Vendor signup form (with EIN, description)
/forgot-password      # Password reset request
/reset-password      # Password reset confirmation
/verify-email        # Email verification landing
/pending-approval    # Vendor pending approval screen
/admin/approvals     # Manager-only vendor approval dashboard
/resident/*          # Resident portal (protected)
/vendor/*            # Vendor portal (protected + approved)
/manager/*           # Manager portal (protected + manager role)
```

---

## Phase 3: Auth Pages Implementation

### 3.1 Unified Login Page (`/login`)
- **User type toggle**: "Residents" | "Service Provider" (matches mobile)
- Email + password fields with validation
- "Remember Me" checkbox
- "Forgot Password?" link
- **Google OAuth** button (using Supabase `signInWithOAuth`)
- Sign Up link → `/signup`
- After login: check profile role/approval_status, redirect accordingly

### 3.2 Signup Flow
- `/signup` — Role selection screen (Resident / Service Provider / Manager)
- `/signup/resident` — First name, last name, email, phone, password, confirm password
- `/signup/vendor` — First name, last name, EIN/Tax ID, phone, email, password, confirm password, description
- Form validation (Yup/Zod)
- On submit: `supabase.auth.signUp()` then insert into `profiles` table
- Email confirmation required
- Vendors default to `approval_status = 'pending'`

### 3.3 Forgot Password (`/forgot-password`)
- Email input
- Supabase `resetPasswordForEmail()`
- Success message

### 3.4 Email Verification (`/verify-email`)
- Landing page after clicking email link
- Auto-redirect to login after confirmation

### 3.5 Pending Approval (`/pending-approval`)
- Matches mobile `PendingApprovalScreen`
- Hourglass icon, "Pending Approval" message
- Auto-logout / redirect to login after delay
- Poll for approval status

### 3.6 Google OAuth
- "Continue with Google" button on login
- `signInWithOAuth({ provider: 'google' })`
- Callback handler at `/auth/callback`
- After OAuth: check if profile exists, create if not, redirect based on role

---

## Phase 4: Admin Approval Dashboard

### 4.1 `/admin/approvals` Page (Manager-only)
- Table of pending vendor applications
- Columns: Name, Email, Specialty, EIN, Applied Date, Documents
- Actions: Approve / Reject
- On approve: update `profiles.approval_status = 'approved'`
- On reject: update `profiles.approval_status = 'rejected'`
- Real-time updates via Supabase Realtime or polling

### 4.2 Manager Navigation Updates
- Add "Approvals" link to manager sidebar
- Show badge with pending count

---

## Phase 5: Store & State Management Updates

### 5.1 Update Zustand Store
```typescript
interface AppStore {
  role: Role;
  isOnline: boolean;
  activeCategory: string;
  user: User | null;        // Supabase user
  profile: Profile | null;  // profiles table row
  isLoading: boolean;
  setRole: (role: Role) => void;
  setIsOnline: (v: boolean) => void;
  setActiveCategory: (cat: string) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
}
```

### 5.2 Auth Context / Hook
- `useAuth()` hook that syncs Supabase auth state with Zustand store
- Listen to `onAuthStateChange`
- Fetch profile on auth change
- Handle role-based redirects

---

## Phase 6: UI Updates to Match Mobile Features

### 6.1 Login Page Redesign
- Match mobile login aesthetic (clean white cards, primary color `#1a6980`)
- Keep dark theme but use the mobile's form styling patterns
- Add role toggle (Residents / Service Provider)

### 6.2 Signup Pages
- Resident signup: First/Last name, email, phone, password, confirm password
- Vendor signup: All resident fields + EIN, description
- Formik-style validation with inline error messages
- Mobile-matching input styling with icons

### 6.3 Navigation Updates
- Add auth-aware navigation (show login/logout based on auth state)
- Add user avatar dropdown with profile, settings, logout
- Sidebar/MobileNav show active user info

### 6.4 Portal Layouts
- Update `resident/layout`, `vendor/layout`, `manager/layout` to check auth
- Show loading state while auth initializes
- Redirect unauthenticated users

---

## Phase 7: Backend Edge Functions (Optional but Recommended)

### 7.1 `handle-new-user` Trigger
- Database trigger on `auth.users` insert
- Creates profile row with default role based on signup metadata

### 7.2 `admin-approve-vendor` Edge Function
- Secure endpoint for managers to approve/reject vendors
- Sends email notification on approval/rejection

---

## Phase 8: Testing & Polish

- Test all auth flows end-to-end
- Test Google OAuth in development
- Test role-based route protection
- Test vendor approval workflow
- Test admin dashboard
- Update `AGENTS.md` with new auth patterns

---

## Files to Create / Modify

### New Files
```
lib/supabase/client.ts
lib/supabase/server.ts
lib/supabase/middleware.ts
lib/auth/hooks.ts
lib/auth/actions.ts
app/auth/callback/route.ts
app/login/page.tsx          (rewrite)
app/signup/page.tsx
app/signup/resident/page.tsx
app/signup/vendor/page.tsx
app/forgot-password/page.tsx
app/reset-password/page.tsx
app/verify-email/page.tsx
app/pending-approval/page.tsx
app/admin/approvals/page.tsx
components/auth/AuthGuard.tsx
components/auth/GoogleButton.tsx
components/auth/RoleToggle.tsx
components/auth/AuthFormInput.tsx
middleware.ts
```

### Modified Files
```
package.json                  (+ supabase deps)
app/layout.tsx                (+ auth provider)
app/page.tsx                  (update CTAs for auth)
app/login/page.tsx            (replace)
lib/store.ts                  (add auth state)
lib/types.ts                  (add Profile type)
components/layout/Sidebar.tsx (auth-aware)
components/layout/MobileNav.tsx (auth-aware)
app/resident/layout.tsx       (auth guard)
app/vendor/layout.tsx         (auth guard)
app/manager/layout.tsx        (auth guard)
```

---

## Timeline Estimate
- Phase 1-2: 1-2 hours (infrastructure, middleware)
- Phase 3: 2-3 hours (all auth pages)
- Phase 4: 1 hour (admin dashboard)
- Phase 5-6: 1-2 hours (store, UI updates)
- Phase 7-8: 1 hour (edge functions, testing)

**Total: ~6-9 hours of focused implementation**
