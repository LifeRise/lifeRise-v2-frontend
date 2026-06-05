import { apiGet, apiPost, apiPatch, apiDelete } from '../client';
import { getApiBaseUrl } from '../config';

export interface ListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  [key: string]: string | number | undefined;
}

export interface PaginationMeta {
  current_page: number;
  from: number;
  last_page: number;
  path: string;
  per_page: number;
  to: number;
  total: number;
}

export interface PaginationLinks {
  first?: string;
  last?: string;
  prev?: string;
  next?: string;
}

export interface Paginated<T> {
  data: T[];
  links: PaginationLinks;
  meta: PaginationMeta;
}

const baseUrl = getApiBaseUrl('manager');

function buildQuery(params: ListParams): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      sp.set(key, String(value));
    }
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export function createAdminClient<T>(resource: string) {
  return {
    list(params: ListParams = {}): Promise<Paginated<T>> {
      return apiGet<Paginated<T>>(baseUrl, `/api/admin/${resource}${buildQuery(params)}`);
    },

    get(id: number): Promise<T> {
      return apiGet<T>(baseUrl, `/api/admin/${resource}/${id}`);
    },

    create(body: unknown): Promise<T> {
      return apiPost<T>(baseUrl, `/api/admin/${resource}`, body);
    },

    update(id: number, body: unknown): Promise<T> {
      return apiPatch<T>(baseUrl, `/api/admin/${resource}/${id}`, body);
    },

    remove(id: number): Promise<void> {
      return apiDelete<void>(baseUrl, `/api/admin/${resource}/${id}`);
    },

    exportCsv(params: ListParams = {}): Promise<Blob> {
      const url = `${baseUrl}/api/admin/${resource}/export.csv${buildQuery(params)}`;
      return fetch(url, {
        headers: {
          Authorization: `Bearer ${typeof window !== 'undefined' ? (localStorage.getItem('liferise_access_token') ?? '') : ''}`,
        },
      }).then((res) => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      });
    },
  };
}
