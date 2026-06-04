"use client";

/**
 * React hooks that wrap the API layer.
 * All hooks attempt to fetch real data from the backend,
 * and gracefully fall back to mock data when the backend is unavailable.
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth/hooks";
import * as servicesApi from "./services";
import * as bookingsApi from "./bookings";
import * as favoritesApi from "./favorites";
import type { Service } from "./services";
import type { Booking } from "./bookings";
import type { Favorite } from "./favorites";
import { adaptServiceToVendor, adaptServiceToDetail, adaptBookingToResidentBooking } from "./adapters";


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
        const list = Array.isArray(res) ? res : res.data ?? res.services ?? [];
        setServices(list);
      })
      .catch((err) => setError(err.message))
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
    bookingsApi
      .listBookings(profile.role)
      .then((res) => {
        const list = Array.isArray(res) ? res : res.data ?? res.bookings ?? [];
        setBookings(list);
      })
      .catch((err) => setError(err.message))
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
        // Backend list endpoints return { data: [...], links: {}, meta: {} }
        const list = Array.isArray(res) ? res : res.data ?? res.favorites ?? [];
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
        setError(err instanceof Error ? err.message : "Failed to toggle favorite");
      }
    },
    [refresh]
  );

  return { favorites, isLoading, error, refresh, toggle };
}
