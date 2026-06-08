'use client';

/**
 * Supabase-first admin hooks — direct browser queries with RLS.
 * Replaces useAdminList for reads while keeping useAdminMutation for writes.
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from './client';
import type { PaginationMeta } from '@/lib/api/admin/_factory';

export interface SupabaseListParams {
  page?: number;
  per_page?: number;
  search?: string;
  searchColumn?: string;
  [key: string]: string | number | undefined;
}

export function useSupabaseList<T extends Record<string, unknown> | object>(
  table: string,
  params: SupabaseListParams
) {
  const [data, setData] = useState<T[] | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Stable hash of non-pagination filter params so dropdown changes trigger refetch
  const filterHash = JSON.stringify(
    Object.entries(params)
      .filter(([k]) => !['page', 'per_page', 'search', 'searchColumn'].includes(k))
      .sort(([a], [b]) => a.localeCompare(b))
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const page = params.page ?? 1;
    const perPage = params.per_page ?? 15;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const supabase = createClient();

    async function load() {
      try {
        let query = supabase.from(table).select('*', { count: 'exact' });

        // Text search on a single column (simple ilike)
        if (params.search && params.searchColumn) {
          query = query.ilike(params.searchColumn, `%${params.search}%`);
        }

        // Additional equality filters (e.g. status, priority, audience)
        Object.entries(params).forEach(([key, value]) => {
          if (
            value !== undefined &&
            value !== null &&
            value !== '' &&
            !['page', 'per_page', 'search', 'searchColumn'].includes(key)
          ) {
            query = query.eq(key, value);
          }
        });

        const {
          data: rows,
          error: supaErr,
          count,
        } = await query.range(from, to).order('id', { ascending: false });

        if (supaErr) {
          throw new Error(supaErr.message);
        }

        if (!cancelled) {
          setData((rows as T[]) ?? []);
          const total = count ?? 0;
          const lastPage = Math.max(1, Math.ceil(total / perPage));
          setMeta({
            current_page: page,
            from: total === 0 ? 0 : from + 1,
            last_page: lastPage,
            path: '',
            per_page: perPage,
            to: Math.min(from + perPage, total),
            total,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    table,
    refreshKey,
    params.page,
    params.per_page,
    params.search,
    params.searchColumn,
    filterHash,
  ]);

  return { data, meta, isLoading, error, refresh };
}
