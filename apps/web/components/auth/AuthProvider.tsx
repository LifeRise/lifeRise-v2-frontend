'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/hooks';
import { usePushTokenSync } from '@/lib/firebase/push-sync';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  usePushTokenSync();

  useEffect(() => {
    if (isLoading) return;

    const isPublic = isPublicRoute(pathname);

    if (!user && !isPublic) {
      router.push('/login');
      return;
    }

    if (user && profile) {
      // Vendor pending approval
      if (
        profile.role === 'vendor' &&
        profile.status !== 'active' &&
        pathname !== '/pending-approval'
      ) {
        router.push('/pending-approval');
        return;
      }

      // Redirect from auth pages to dashboard
      if (pathname === '/login' || pathname === '/signup' || pathname.startsWith('/signup/')) {
        const dest =
          profile.role === 'admin'
            ? '/admin'
            : profile.role === 'manager'
              ? '/manager'
              : profile.role === 'vendor'
                ? '/vendor'
                : '/resident';
        router.push(dest);
        return;
      }

      // Role-based route guards
      // /admin/approvals is a manager page, not admin-only
      if (
        pathname.startsWith('/admin') &&
        pathname !== '/admin/approvals' &&
        profile.role !== 'admin'
      ) {
        router.push('/resident');
        return;
      }
      if (pathname.startsWith('/manager') && profile.role !== 'manager') {
        router.push('/resident');
        return;
      }
      if (pathname.startsWith('/vendor') && profile.role !== 'vendor') {
        router.push('/resident');
        return;
      }
    }
  }, [user, profile, isLoading, pathname, router]);

  const isPublic = isPublicRoute(pathname);

  // 1. While auth state is initializing on a protected route, show a loading
  //    screen instead of flashing the protected page content.
  if (isLoading && !isPublic) {
    return <LoadingScreen />;
  }

  // 2. SECURITY: Auth resolved but user is not authenticated on a protected
  //    route. The useEffect has already fired router.push('/login') but
  //    Next.js navigation is async — block rendering until navigation
  //    completes so protected content never flashes to unauthenticated users.
  if (!isLoading && !user && !isPublic) {
    return <LoadingScreen />;
  }

  // 3. User is authenticated but profile hasn't resolved yet on a
  //    role-restricted route. Without a profile we cannot verify role-based
  //    access — keep showing loading until the profile is available.
  const isRoleProtected =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/manager') ||
    pathname.startsWith('/vendor');

  if (!isLoading && user && !profile && isRoleProtected) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
