'use client';

import { useEffect, useState, useCallback } from 'react';
import { createAdminClient, type ListParams, type Paginated } from './_factory';

export function useAdminList<T>(resource: string, params: ListParams) {
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
    createAdminClient<T>(resource)
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
  }, [resource, refreshKey, params.page, params.per_page, params.search]);

  return { data, meta, isLoading, error, refresh };
}

export function useAdminItem<T>(resource: string, id: number | null) {
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
    createAdminClient<T>(resource)
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
  }, [resource, id, refreshKey]);

  return { data, isLoading, error, refresh };
}

export function useAdminMutation<T>(resource: string) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = createAdminClient<T>(resource);

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
    async (id: number, body: unknown) => {
      setIsPending(true);
      setError(null);
      try {
        return await client.update(id, body);
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
    async (id: number) => {
      setIsPending(true);
      setError(null);
      try {
        await client.remove(id);
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
