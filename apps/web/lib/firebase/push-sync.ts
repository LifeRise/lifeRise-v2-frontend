'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import { requestPushToken } from './push';
import { apiPost } from '@/lib/api/client';
import { CUSTOMER_API } from '@/lib/api/config';
import { isFirebaseConfigured } from './client';

/**
 * Syncs the browser's FCM push token to the backend after login.
 * Call this inside a client component that wraps authenticated routes
 * (e.g. AuthProvider or layout).
 */
export function usePushTokenSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (!isFirebaseConfigured()) return;

    let cancelled = false;

    requestPushToken()
      .then((token) => {
        if (cancelled || !token) return;
        // Fire-and-forget; non-critical — do not block the UI.
        apiPost<unknown>(CUSTOMER_API, '/api/notifications/device-token', {
          token,
          platform: 'web',
        }).catch(() => {
          // silent — push is best-effort
        });
      })
      .catch(() => {
        // silent — Firebase not configured or blocked by extension
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}
