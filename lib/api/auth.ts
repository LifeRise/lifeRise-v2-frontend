"use client";

/**
 * Authentication API layer for the Go backend.
 */

import { apiGet, apiPost, clearTokens, setTokens } from "./client";
import { getApiBaseUrl, type FrontendRole } from "./config";
import type { BackendProfile, LoginCredentials, SignupData, TokenPair } from "./types";

/**
 * Login against the appropriate API based on role hint.
 * For the initial login we try the customer API first; if that fails
 * with "Invalid credentials" we try vendor-api then admin-api.
 */
export async function login(
  creds: LoginCredentials,
  roleHint?: FrontendRole
): Promise<{ tokenPair: TokenPair; profile: BackendProfile }> {
  // Determine which API to try first based on role hint
  const apis = ["resident", "vendor", "manager"] as FrontendRole[];
  const order = roleHint
    ? [roleHint, ...apis.filter((r) => r !== roleHint)]
    : apis;

  let lastError: Error | null = null;

  for (const role of order) {
    const baseUrl = getApiBaseUrl(role);
    try {
      const tokenPair = await apiPost<TokenPair>(baseUrl, "/api/login", creds, {
        skipAuth: true,
      });

      // Store tokens temporarily to fetch profile
      setTokens(tokenPair.access_token, tokenPair.refresh_token);

      const profile = await apiPost<BackendProfile>(
        baseUrl,
        "/api/profile",
        {},
        { skipAuth: false }
      );

      return { tokenPair, profile };
    } catch (err) {
      lastError = err as Error;
      // Continue to next API if credentials don't match
    }
  }

  // Clear any partial tokens
  clearTokens();
  throw lastError ?? new Error("Login failed");
}

/**
 * Register a new customer (resident) account.
 */
export async function signup(data: SignupData): Promise<{ id: number; email: string }> {
  const baseUrl = getApiBaseUrl("resident");
  return apiPost<{ id: number; email: string }>(baseUrl, "/api/signup", data, {
    skipAuth: true,
  });
}

/**
 * Fetch the current user's profile.
 */
export async function fetchProfile(role: FrontendRole): Promise<BackendProfile> {
  const baseUrl = getApiBaseUrl(role);
  return apiGet<BackendProfile>(baseUrl, "/api/profile");
}

/**
 * Logout from the backend.
 */
export async function logout(role: FrontendRole): Promise<void> {
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
export async function refreshToken(role: FrontendRole): Promise<TokenPair> {
  const baseUrl = getApiBaseUrl(role);
  return apiPost<TokenPair>(baseUrl, "/api/refresh-token", {
    refresh_token: localStorage.getItem("liferise_refresh_token"),
  });
}
