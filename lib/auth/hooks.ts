"use client";

import { useEffect, useState, useCallback } from "react";
import { getAccessToken, clearTokens } from "@/lib/api/client";
import { decodeJwtPayload, isTokenExpired } from "@/lib/api/jwt";
import { fetchProfile, login as apiLogin, logout as apiLogout } from "@/lib/api/auth";
import type { BackendProfile, LoginCredentials } from "@/lib/api/types";

// Re-export Profile type for backward compatibility
export type Profile = BackendProfile;

export interface AuthUser {
  id: number;
  email?: string;
  userType: "customer" | "user";
  roles: string[];
}

function buildUserFromToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload?.sub) return null;
  return {
    id: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    userType: payload.type ?? "customer",
    roles: Array.isArray(payload.roles) ? payload.roles : [],
  };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async (role: Profile["role"]) => {
    try {
      const p = await fetchProfile(role);
      setProfile(p);
      return p;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const token = getAccessToken();
      if (!token || isTokenExpired(token)) {
        clearTokens();
        if (mounted) setIsLoading(false);
        return;
      }

      const u = buildUserFromToken(token);
      if (!u) {
        clearTokens();
        if (mounted) setIsLoading(false);
        return;
      }

      if (mounted) setUser(u);

      // Try to refresh profile using the token's role hint
      const roleHint: Profile["role"] = u.roles.includes("service_provider")
        ? "vendor"
        : u.roles.includes("complex_manager") || u.roles.includes("admin")
        ? "manager"
        : "resident";

      await refreshProfile(roleHint);
      if (mounted) setIsLoading(false);
    };

    init();

    return () => {
      mounted = false;
    };
  }, [refreshProfile]);

  const signOut = async () => {
    const role = profile?.role ?? "resident";
    try {
      await apiLogout(role);
    } catch {
      // ignore
    } finally {
      clearTokens();
      setUser(null);
      setProfile(null);
    }
  };

  return { user, profile, isLoading, signOut, refreshProfile };
}

/**
 * Login helper that can be called from pages.
 */
export async function doLogin(
  creds: LoginCredentials,
  roleHint?: Profile["role"]
): Promise<{ user: AuthUser; profile: Profile }> {
  const { tokenPair, profile } = await apiLogin(creds, roleHint);

  const user = buildUserFromToken(tokenPair.access_token);
  if (!user) {
    clearTokens();
    throw new Error("Invalid token received");
  }

  return { user, profile };
}

/**
 * Hook for manager/vendor approval pages.
 * Kept for backward compatibility with mock auth fallback.
 */
export function useAllProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setProfiles([]);
    setIsLoading(false);
  }, []);

  const approveVendor = (_userId: string) => {
    // TODO: wire to admin API
  };

  const rejectVendor = (_userId: string) => {
    // TODO: wire to admin API
  };

  return { profiles, isLoading, approveVendor, rejectVendor };
}
