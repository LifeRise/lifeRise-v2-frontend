'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/hooks';
import { usePushTokenSync } from '@/lib/firebase/push-sync';
import type { BackendProfile } from '@/lib/api/types';

// ── Route classification ────────────────────────────────────────────────────

const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/trust-safety',
  '/offline',
];
const authPrefixRoutes = ['/signup/', '/auth/'];

function isPublicRoute(pathname: string): boolean {
  return (
    publicRoutes.includes(pathname) ||
    authPrefixRoutes.some((prefix) => pathname.startsWith(prefix))
  );
}

// ── Portal helpers ──────────────────────────────────────────────────────────

/** All valid backend roles. Used to detect unrecognized roles defensively. */
const VALID_ROLES: ReadonlyArray<BackendProfile['role']> = [
  'admin',
  'manager',
  'vendor',
  'resident',
];

/**
 * Maps a backend profile role to the user's home portal path.
 * Unknown/missing roles default to '/resident'.
 */
function portalForRole(role: BackendProfile['role'] | undefined | null): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'manager':
      return '/manager';
    case 'vendor':
      return '/vendor';
    default:
      return '/resident';
  }
}

/**
 * Returns the portal prefix that owns a given pathname, or null if the
 * pathname does not belong to any restricted portal.
 */
function portalForPath(pathname: string): string | null {
  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname.startsWith('/manager')) return '/manager';
  if (pathname.startsWith('/vendor')) return '/vendor';
  if (pathname.startsWith('/resident')) return '/resident';
  return null;
}

/**
 * Returns true if the given role is permitted to access the given portal.
 *
 * Special case: /admin/approvals is a shared vendor-management page that
 * managers are allowed to reach even though the route is under /admin.
 */
function canAccessPortal(portal: string, role: BackendProfile['role'], pathname: string): boolean {
  switch (portal) {
    case '/admin':
      if (pathname === '/admin/approvals' && role === 'manager') return true;
      return role === 'admin';
    case '/manager':
      return role === 'manager';
    case '/vendor':
      return role === 'vendor';
    case '/resident':
      return role === 'resident';
    default:
      return true;
  }
}

/** Human-readable portal name used in toast messages. */
function portalLabel(portal: string): string {
  switch (portal) {
    case '/admin':
      return 'Admin';
    case '/manager':
      return 'Manager';
    case '/vendor':
      return 'Vendor';
    case '/resident':
      return 'Resident';
    default:
      return 'requested';
  }
}

// ── Loading screen ──────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-midnight">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-teal border-t-transparent animate-spin" />
        <p className="text-sm text-muted">Authenticating…</p>
      </div>
    </div>
  );
}

// ── AuthProvider ────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Returns true on the client (after hydration) and false during SSR.
  // This avoids hydration mismatches: server and the first client render both
  // see `false`; subsequent client renders see `true`.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  usePushTokenSync();

  useEffect(() => {
    if (isLoading) return;

    const isPublic = isPublicRoute(pathname);

    // ── Guard 1: Unauthenticated user on a protected route ────────────────
    if (!user && !isPublic) {
      toast.info('Please sign in to access this page.', {
        description: 'Redirecting to login…',
        duration: 4000,
      });
      router.push('/login');
      return;
    }

    if (user && profile) {
      // ── Guard 2: Vendor pending approval ───────────────────────────────
      if (
        profile.role === 'vendor' &&
        profile.status !== 'active' &&
        pathname !== '/pending-approval'
      ) {
        router.push('/pending-approval');
        return;
      }

      // ── Guard 3: Authenticated user visiting auth/signup pages ──────────
      if (pathname === '/login' || pathname === '/signup' || pathname.startsWith('/signup/')) {
        router.push(portalForRole(profile.role));
        return;
      }

      // ── Guard 4: Strict portal access control ───────────────────────────
      const currentPortal = portalForPath(pathname);
      if (currentPortal !== null) {
        // Defensive check: if the backend returns an unrecognized role, fall
        // back to the Resident portal rather than letting the user through.
        if (!VALID_ROLES.includes(profile.role)) {
          toast.warning('Your account role could not be determined.', {
            description: 'Redirecting to the Resident portal as a fallback.',
            duration: 5000,
          });
          router.push('/resident');
          return;
        }

        if (!canAccessPortal(currentPortal, profile.role, pathname)) {
          const label = portalLabel(currentPortal);
          const home = portalForRole(profile.role);
          toast.error('Access Denied', {
            description: `You do not have permission to access the ${label} portal. Redirecting you to your portal…`,
            duration: 5000,
          });
          router.push(home);
          return;
        }
      }
    }
  }, [user, profile, isLoading, pathname, router]);

  const isPublic = isPublicRoute(pathname);

  // Only show loading overlays after hydration (mounted === true).
  // During SSR and the initial hydration pass we always render children
  // so the DOM matches between server and client.
  if (mounted) {
    // 1. While auth state is initializing on a protected route, show a loading
    //    screen instead of flashing the protected page content.
    if (isLoading && !isPublic) {
      return <LoadingScreen />;
    }

    // 2. Auth resolved but user is not authenticated on a protected route.
    //    The useEffect has already fired router.push('/login') but Next.js
    //    navigation is async — block rendering until navigation completes.
    if (!isLoading && !user && !isPublic) {
      return <LoadingScreen />;
    }

    // 3. User is authenticated but profile hasn't resolved yet on any portal
    //    route. Without a profile we cannot verify role-based access — keep
    //    showing loading until the profile is available.
    //    NOTE: portalForPath covers /admin, /manager, /vendor, AND /resident.
    const isRoleProtected = portalForPath(pathname) !== null;

    if (!isLoading && user && !profile && isRoleProtected) {
      return <LoadingScreen />;
    }

    // 4. Profile is present but the user does not have access to this portal.
    //    The useEffect has already queued router.push() but navigation is async —
    //    block rendering immediately so no unauthorized content is ever visible.
    if (!isLoading && user && profile && isRoleProtected) {
      const currentPortal = portalForPath(pathname);
      if (
        currentPortal !== null &&
        (VALID_ROLES.includes(profile.role)
          ? !canAccessPortal(currentPortal, profile.role, pathname)
          : true) // unknown role — also block until redirect completes
      ) {
        return <LoadingScreen />;
      }
    }
  }

  return <>{children}</>;
}
