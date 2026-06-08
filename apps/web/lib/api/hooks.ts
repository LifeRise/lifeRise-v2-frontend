'use client';

/**
 * React hooks that wrap the API layer.
 * All hooks attempt to fetch real data from the backend,
 * and gracefully fall back to mock data when the backend is unavailable.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import * as servicesApi from './services';
import * as bookingsApi from './bookings';
import * as favoritesApi from './favorites';
import * as adminApi from './admin';
import * as notificationsApi from './notifications';
import type { Service } from './services';
import type { Booking } from './bookings';
import type { Favorite } from './favorites';
import type { DashboardOverview, BackendNotification } from './types';
import {
  adaptServiceToVendor,
  adaptServiceToDetail,
  adaptBookingToResidentBooking,
} from './adapters';
import {
  apiBookings as mockVendorBookings,
  apiResidentBookings as mockResidentBookings,
  apiServices as mockServices,
} from '@/lib/mock-data';
import { useAppStore } from '@/lib/store';

// --- Services ---

export function useServices() {
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!profile) return;
    setIsLoading(true);
    servicesApi
      .listServices(profile.role)
      .then((res) => {
        const list = Array.isArray(res) ? res : (res.services ?? []);
        setServices(list.length > 0 ? list : mockServices);
      })
      .catch((err) => {
        setError(err.message);
        setServices(mockServices);
      })
      .finally(() => setIsLoading(false));
  }, [profile]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const vendors = services.map(adaptServiceToVendor);
  const details = services.map(adaptServiceToDetail);

  return { services, vendors, details, isLoading, error, refresh };
}

// --- Bookings ---

export function useBookings() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!profile) return;
    setIsLoading(true);
    const fallback = profile.role === 'resident' ? mockResidentBookings : mockVendorBookings;
    bookingsApi
      .listBookings(profile.role)
      .then((res) => {
        const list = Array.isArray(res) ? res : (res.bookings ?? []);
        setBookings(list.length > 0 ? list : fallback);
      })
      .catch((err) => {
        setError(err.message);
        setBookings(fallback);
      })
      .finally(() => setIsLoading(false));
  }, [profile]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const residentBookings = bookings.map(adaptBookingToResidentBooking);

  return { bookings, residentBookings, isLoading, error, refresh };
}

// --- Favorites ---

export function useFavorites() {
  const { profile } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!profile) return;

    setIsLoading(true);
    favoritesApi
      .listFavorites()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res.favorites ?? []);
        setFavorites(list);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [profile]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (serviceId: number) => {
      try {
        await favoritesApi.toggleFavorite(serviceId);
        refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to toggle favorite');
      }
    },
    [refresh]
  );

  return { favorites, isLoading, error, refresh, toggle };
}

// --- Admin Dashboard ---

// --- Notifications ---

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setUnreadCount = useAppStore((s) => s.setUnreadCount);

  const refresh = useCallback(() => {
    if (!profile) return;
    setIsLoading(true);
    notificationsApi
      .listNotifications()
      .then((res) => {
        const list = res.notifications ?? [];
        setNotifications(list);
        setUnreadCount(list.filter((n) => n.read_at === null).length);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [profile, setUnreadCount]);

  const refreshUnreadCount = useCallback(() => {
    if (!profile) return;
    notificationsApi
      .listNotifications(true, 1, 1)
      .then((res) => {
        setUnreadCount(res.total ?? 0);
      })
      .catch(() => {});
  }, [profile, setUnreadCount]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const markRead = useCallback(
    async (id: number) => {
      try {
        await notificationsApi.markNotificationRead(id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount(Math.max(0, useAppStore.getState().unreadCount - 1));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to mark as read');
      }
    },
    [setUnreadCount]
  );

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to mark all as read');
    }
  }, [setUnreadCount]);

  return { notifications, isLoading, error, refresh, refreshUnreadCount, markRead, markAllRead };
}

// --- Admin Dashboard ---

export function useDashboardOverview(companyId?: number) {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    let mounted = true;

    adminApi
      .fetchDashboardOverview({ companyId, signal: controller.signal })
      .then((overview) => {
        if (!mounted) return;
        setData(overview);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [companyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const cleanup = refresh();
    return cleanup;
  }, [refresh]);

  return { data, isLoading, error, refresh };
}
