'use client';

/**
 * Authentication API layer for the Go backend.
 */

import { apiGet, apiPost, clearTokens, setTokens } from './client';
import { getAuthBaseUrl, getApiBaseUrl, type FrontendRole } from './config';
import type { BackendProfile, LoginCredentials, SignupData, TokenPair } from './types';

/**
 * Login against the Go backend.
 * All three binaries expose /api/login, but we use the customer API (8080)
 * as the canonical entry point. The returned JWT works across all ports.
 */
export async function login(
  creds: LoginCredentials,
  _roleHint?: FrontendRole
): Promise<{ tokenPair: TokenPair; profile: BackendProfile }> {
  const baseUrl = getAuthBaseUrl();

  const tokenPair = await apiPost<TokenPair>(baseUrl, '/api/login', creds, {
    skipAuth: true,
  });

  // Store tokens so the profile request can send the Bearer header
  setTokens(tokenPair.access_token, tokenPair.refresh_token);

  const profile = await apiGet<BackendProfile>(baseUrl, '/api/profile');

  return { tokenPair, profile };
}

/**
 * Register a new customer (resident) account.
 */
export async function signup(data: SignupData): Promise<{ id: number; email: string }> {
  const baseUrl = getAuthBaseUrl();
  return apiPost<{ id: number; email: string }>(baseUrl, '/api/signup', data, {
    skipAuth: true,
  });
}

/**
 * Register a new manager account.
 */
export async function signupManager(
  data: SignupData
): Promise<{ id: number; email: string; role: string }> {
  const baseUrl = getAuthBaseUrl();
  return apiPost<{ id: number; email: string; role: string }>(
    baseUrl,
    '/api/manager/signup',
    data,
    {
      skipAuth: true,
    }
  );
}

/**
 * Register a new vendor (service provider) account.
 */
export async function signupVendor(
  data: SignupData & { ein_tax_id: string; description: string }
): Promise<{ id: number; email: string; status: string }> {
  const baseUrl = getAuthBaseUrl();
  return apiPost<{ id: number; email: string; status: string }>(
    baseUrl,
    '/api/vendor/signup',
    data,
    {
      skipAuth: true,
    }
  );
}

/**
 * Fetch the current user's profile.
 *
 * Always targets the CUSTOMER_API (port 8080) regardless of role.
 *
 * Rationale: the customer API's /api/profile route is gated only by
 * RequireAuth (valid JWT is enough). The admin-api and vendor-api both
 * gate their /api/profile routes behind RequireRole as well. If a user's
 * JWT is valid but their role assignments haven't been persisted to the DB
 * yet (e.g., just after auto-sync via apiSignupManager), the role check
 * would return 403, causing init() to clear the token and leaving the
 * client un-authenticated for all subsequent API calls.
 *
 * The profile handler itself handles all userTypes (customer | user) and
 * correctly maps backend role slugs → frontend roles ('admin', 'manager',
 * 'vendor', 'resident') regardless of which binary serves the request.
 */
export async function fetchProfile(_role?: FrontendRole | null): Promise<BackendProfile> {
  const baseUrl = getAuthBaseUrl();
  return apiGet<BackendProfile>(baseUrl, '/api/profile');
}

/**
 * Logout from the backend.
 */
export async function logout(role?: FrontendRole | null): Promise<void> {
  const baseUrl = getApiBaseUrl(role);
  try {
    await apiPost<unknown>(baseUrl, '/api/logout', {});
  } finally {
    clearTokens();
  }
}

/**
 * Refresh the access token.
 */
export async function refreshToken(): Promise<TokenPair> {
  const baseUrl = getAuthBaseUrl();
  return apiPost<TokenPair>(baseUrl, '/api/refresh-token', {
    refresh_token: localStorage.getItem('liferise_refresh_token'),
  });
}

/**
 * Request a password reset email from the Go backend.
 */
export async function forgotPassword(email: string): Promise<void> {
  const baseUrl = getAuthBaseUrl();
  await apiPost<unknown>(baseUrl, '/api/forgot-password', { email }, { skipAuth: true });
}

/**
 * Complete a password reset with token + code from the email link.
 */
export async function resetPassword(token: string, code: string, password: string): Promise<void> {
  const baseUrl = getAuthBaseUrl();
  await apiPost<unknown>(
    baseUrl,
    '/api/reset-password',
    { token, code, password },
    { skipAuth: true }
  );
}
