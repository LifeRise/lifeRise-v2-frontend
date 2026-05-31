"use client";

/**
 * Simple JWT payload decoder for client-side use.
 * Does NOT verify signatures — the backend handles that.
 */

export interface JwtPayload {
  sub?: number; // UserID
  type?: "customer" | "user";
  roles?: string[];
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp < Date.now() / 1000 + bufferSeconds;
}
