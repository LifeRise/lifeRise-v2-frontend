'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createAdminClient, type ListParams, type Paginated } from './_factory';
import { fetchDashboardOverview } from '../admin';
import type { DashboardOverview } from '../types';

const DASHBOARD_POLL_MS = 30_000;

/**
 * Fetches the admin dashboard overview and auto-refreshes every 30 seconds.
 * Manual refresh is also exposed via `refresh()`.
 */
export function useDashboardOverview(companyId?: number) {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Cancel any in-flight request from a previous render.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);
      try {
        const overview = await fetchDashboardOverview({
          companyId,
          signal: controller.signal,
        });
        if (!cancelled) {
          setData(overview);
        }
      } catch (err: unknown) {
        if (!cancelled && err instanceof Error && err.name !== 'AbortError') {
          setError(err.message || 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    // Auto-refresh every 30 s (replaces SSE for this phase).
    const timer = setInterval(load, DASHBOARD_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [companyId, refreshKey]);

  return { data, isLoading, error, refresh };
}

export function useAdminList<T>(resource: string, params: ListParams, baseUrl?: string) {
  const [data, setData] = useState<T[] | null>(null);
  const [meta, setMeta] = useState<Paginated<T>['meta'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    createAdminClient<T>(resource, baseUrl)
      .list(params)
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setMeta(res.meta);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message || 'Failed to load data');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, baseUrl, refreshKey, params.page, params.per_page, params.search]);

  return { data, meta, isLoading, error, refresh };
}

export function useAdminItem<T>(resource: string, id: number | null, baseUrl?: string) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (id == null) {
      setData(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    createAdminClient<T>(resource, baseUrl)
      .get(id)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load item');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [resource, baseUrl, id, refreshKey]);

  return { data, isLoading, error, refresh };
}

export function useAdminMutation<T>(resource: string, baseUrl?: string) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = createAdminClient<T>(resource, baseUrl);

  const create = useCallback(
    async (body: unknown) => {
      setIsPending(true);
      setError(null);
      try {
        return await client.create(body);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Create failed';
        setError(msg);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [client]
  );

  const update = useCallback(
    async (id: number | string, body: unknown) => {
      setIsPending(true);
      setError(null);
      try {
        return await client.update(id as number, body);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Update failed';
        setError(msg);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [client]
  );

  const remove = useCallback(
    async (id: number | string) => {
      setIsPending(true);
      setError(null);
      try {
        await client.remove(id as number);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Delete failed';
        setError(msg);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [client]
  );

  return { create, update, remove, isPending, error };
}
