'use client';

/**
 * HTTP client for the Go backend.
 * Handles auth header injection, automatic token refresh on 401,
 * and Laravel-style response parsing.
 */

import { ApiError, type ApiResponse } from './types';

const TOKEN_KEY = 'liferise_access_token';
const REFRESH_KEY = 'liferise_refresh_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(baseUrl: string): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${baseUrl}/api/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return null;

    const json: ApiResponse<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
    }> = await res.json();

    if (json.status && json.data?.access_token) {
      setTokens(json.data.access_token, json.data.refresh_token ?? refreshToken);
      return json.data.access_token;
    }
  } catch {
    // ignore
  }
  return null;
}

async function refreshAccessToken(baseUrl: string): Promise<string | null> {
  if (isRefreshing) {
    return refreshPromise ?? Promise.resolve(null);
  }

  isRefreshing = true;
  refreshPromise = doRefresh(baseUrl).finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiRequest<T>(
  baseUrl: string,
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${baseUrl}${endpoint}`;
  const { skipAuth, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  headers.set('Accept', 'application/json');

  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let res = await fetch(url, { ...fetchOptions, headers });

  // Auto-refresh on 401
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken(baseUrl);
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(url, { ...fetchOptions, headers });
    } else {
      // Refresh also failed — session is unrecoverable. Clear tokens and
      // notify the auth layer so the Zustand store resets and the user is
      // redirected to /login without being stuck in an authenticated state.
      clearTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('liferise:auth-expired'));
      }
    }
  }

  const json: ApiResponse<T> = await res.json().catch(() => ({
    status: false,
    message: 'Invalid JSON response',
    data: {} as T,
  }));

  if (!res.ok || !json.status) {
    throw new ApiError(
      json.message || `Request failed with status ${res.status}`,
      res.status,
      json.errors
    );
  }

  return json.data;
}

// Convenience wrappers
export function apiGet<T>(baseUrl: string, endpoint: string, opts?: RequestOptions) {
  return apiRequest<T>(baseUrl, endpoint, { ...opts, method: 'GET' });
}

export function apiPost<T>(
  baseUrl: string,
  endpoint: string,
  body: unknown,
  opts?: RequestOptions
) {
  return apiRequest<T>(baseUrl, endpoint, {
    ...opts,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function apiPatch<T>(
  baseUrl: string,
  endpoint: string,
  body: unknown,
  opts?: RequestOptions
) {
  return apiRequest<T>(baseUrl, endpoint, {
    ...opts,
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function apiDelete<T>(baseUrl: string, endpoint: string, opts?: RequestOptions) {
  return apiRequest<T>(baseUrl, endpoint, { ...opts, method: 'DELETE' });
}
