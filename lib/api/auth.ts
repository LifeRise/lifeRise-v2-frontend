"use client";

/**
 * Authentication API layer for the Go backend.
 */

import { apiGet, apiPost, clearTokens, setTokens } from "./client";
import { getAuthBaseUrl, getApiBaseUrl, type FrontendRole } from "./config";
import type { BackendProfile, LoginCredentials, SignupData, TokenPair } from "./types";

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

  const tokenPair = await apiPost<TokenPair>(baseUrl, "/api/login", creds, {
    skipAuth: true,
  });

  // Store tokens so the profile request can send the Bearer header
  setTokens(tokenPair.access_token, tokenPair.refresh_token);

  const profile = await apiGet<BackendProfile>(baseUrl, "/api/profile");

  return { tokenPair, profile };
}

/**
 * Register a new customer (resident) account.
 */
export async function signup(data: SignupData): Promise<{ id: number; email: string }> {
  const baseUrl = getAuthBaseUrl();
  return apiPost<{ id: number; email: string }>(baseUrl, "/api/signup", data, {
    skipAuth: true,
  });
}

/**
 * Register a new vendor (service provider) account.
 */
export async function signupVendor(data: SignupData & { ein_tax_id: string; description: string }): Promise<{ id: number; email: string; status: string }> {
  const baseUrl = getAuthBaseUrl();
  return apiPost<{ id: number; email: string; status: string }>(baseUrl, "/api/vendor/signup", data, {
    skipAuth: true,
  });
}

/**
 * Fetch the current user's profile.
 * Uses the user's role-specific port so CORS and middleware align.
 */
export async function fetchProfile(role?: FrontendRole | null): Promise<BackendProfile> {
  const baseUrl = getApiBaseUrl(role);
  return apiGet<BackendProfile>(baseUrl, "/api/profile");
}

/**
 * Logout from the backend.
 */
export async function logout(role?: FrontendRole | null): Promise<void> {
  const baseUrl = getApiBaseUrl(role);
  try {
    await apiPost<unknown>(baseUrl, "/api/logout", {});
  } finally {
    clearTokens();
  }
}

/**
 * Refresh the access token.
 */
export async function refreshToken(): Promise<TokenPair> {
  const baseUrl = getAuthBaseUrl();
  return apiPost<TokenPair>(baseUrl, "/api/refresh-token", {
    refresh_token: localStorage.getItem("liferise_refresh_token"),
  });
}

/**
 * Request a password reset email from the Go backend.
 */
export async function forgotPassword(email: string): Promise<void> {
  const baseUrl = getAuthBaseUrl();
  await apiPost<unknown>(baseUrl, "/api/forgot-password", { email }, { skipAuth: true });
}

/**
 * Complete a password reset with token + code from the email link.
 */
export async function resetPassword(token: string, code: string, password: string): Promise<void> {
  const baseUrl = getAuthBaseUrl();
  await apiPost<unknown>(baseUrl, "/api/reset-password", { token, code, password }, { skipAuth: true });
}
