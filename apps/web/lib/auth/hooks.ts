"use client";

import { useEffect, useCallback } from "react";
import { getAccessToken, clearTokens } from "@/lib/api/client";
import { decodeJwtPayload, isTokenExpired } from "@/lib/api/jwt";
import { fetchProfile, login as apiLogin, logout as apiLogout } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import type { BackendProfile, LoginCredentials } from "@/lib/api/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// Re-export Profile type for backward compatibility
export type Profile = BackendProfile;

export interface AuthUser {
  id: string | number;
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

function buildUserFromSupabaseUser(supabaseUser: SupabaseUser): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? undefined,
    userType: "customer",
    roles: Array.isArray(supabaseUser.user_metadata?.roles)
      ? supabaseUser.user_metadata.roles
      : ["customer"],
  };
}

function buildProfileFromSupabaseUser(supabaseUser: SupabaseUser): Profile {
  const fullName = (supabaseUser.user_metadata?.full_name as string) ?? "";
  const nameParts = fullName.split(" ");
  const firstName =
    (supabaseUser.user_metadata?.first_name as string) ?? nameParts[0] ?? "";
  const lastName =
    (supabaseUser.user_metadata?.last_name as string) ??
    nameParts.slice(1).join(" ") ??
    "";
  const avatar =
    (supabaseUser.user_metadata?.avatar_url as string) ??
    (supabaseUser.user_metadata?.picture as string);

  const approvalStatus = supabaseUser.user_metadata?.approval_status as
    | "approved"
    | "pending"
    | "rejected"
    | undefined;
  const status = approvalStatus && approvalStatus !== "approved" ? approvalStatus : "active";

  return {
    id: 0,
    email: supabaseUser.email ?? "",
    first_name: firstName,
    last_name: lastName,
    phone: (supabaseUser.user_metadata?.phone as string) ?? "",
    avatar,
    timezone: "UTC",
    status,
    role: (supabaseUser.user_metadata?.role as Profile["role"]) ?? "resident",
    user_type: "customer",
    roles: ["customer"],
    created_at: supabaseUser.created_at,
  };
}

/** Global flag so init() only runs once across all component instances */
let globalInitStarted = false;

export function useAuth() {
  const user = useAppStore((s) => s.authUser);
  const profile = useAppStore((s) => s.profile);
  const isLoading = useAppStore((s) => s.isAuthLoading);
  const setUser = useAppStore((s) => s.setAuthUser);
  const setProfile = useAppStore((s) => s.setProfile);
  const setIsLoading = useAppStore((s) => s.setAuthLoading);
  const setRole = useAppStore((s) => s.setRole);

  const refreshProfile = useCallback(async () => {
    try {
      const p = await fetchProfile(profile?.role ?? null);
      setProfile(p);
      if (p?.role) setRole(p.role);
      return p;
    } catch {
      setProfile(null);
      return null;
    }
  }, [setProfile, setRole, profile]);

  useEffect(() => {
    let mounted = true;
    let supabaseSubscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
      if (globalInitStarted) return;
      globalInitStarted = true;

      // 1. Prefer Go backend JWT if present
      const token = getAccessToken();
      if (token && !isTokenExpired(token)) {
        const u = buildUserFromToken(token);
        if (u) {
          if (mounted) setUser(u);
          await refreshProfile();
          if (mounted) setIsLoading(false);
          return;
        }
      }

      // 2. Fall back to Supabase session (or mock session in demo mode)
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && mounted) {
        setUser(buildUserFromSupabaseUser(session.user));
        setProfile(buildProfileFromSupabaseUser(session.user));
        if (session.user.user_metadata?.role) {
          setRole(session.user.user_metadata.role as BackendProfile["role"]);
        }
        setIsLoading(false);
      } else if (mounted) {
        setIsLoading(false);
      }

      // Listen for auth changes (real Supabase or mock)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (newSession?.user) {
            setUser(buildUserFromSupabaseUser(newSession.user));
            setProfile(buildProfileFromSupabaseUser(newSession.user));
            if (newSession.user.user_metadata?.role) {
              setRole(newSession.user.user_metadata.role as BackendProfile["role"]);
            }
          } else if (!getAccessToken()) {
            setUser(null);
            setProfile(null);
            setRole(null);
          }
          setIsLoading(false);
        }
      );
      supabaseSubscription = subscription;
    };

    init();

    return () => {
      mounted = false;
      supabaseSubscription?.unsubscribe();
    };
  }, [refreshProfile, setIsLoading, setProfile, setRole, setUser]);

  const signIn = useCallback(async (creds: LoginCredentials) => {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // authService.signInWithPassword handles both Supabase login
      // AND the Go backend bridge (stores backend JWT in localStorage).
      // If Supabase fails, it falls back to backend-only login.
      const { authService } = await import("./auth-service");
      const { user: sbUser, profile: backendProfile } = await authService.signInWithPassword(creds);

      if (sbUser) {
        // Supabase login succeeded
        const u = buildUserFromSupabaseUser(sbUser);
        const p = backendProfile ?? buildProfileFromSupabaseUser(sbUser);
        setUser(u);
        setProfile(p);
        if (p.role) setRole(p.role);
        setIsLoading(false);
        return { user: u, profile: p, tokenPair: null };
      }

      // No Supabase user — check if backend-only login succeeded
      if (backendProfile) {
        const token = getAccessToken();
        if (!token) throw new Error("Backend login succeeded but no token stored");
        const u = buildUserFromToken(token);
        if (!u) {
          clearTokens();
          throw new Error("Invalid backend token");
        }
        setUser(u);
        setProfile(backendProfile);
        if (backendProfile.role) setRole(backendProfile.role);
        setIsLoading(false);
        return { user: u, profile: backendProfile, tokenPair: null };
      }

      throw new Error("Login failed");
    }

    // No Supabase configured. If no explicit API URL is set either, we are in
    // demo/offline mode — use the mock auth client so the app works on Vercel
    // without a running backend (avoids "Failed to fetch" against localhost).
    if (!process.env.NEXT_PUBLIC_API_URL) {
      const supabase = createClient(); // returns mock client when no Supabase URL
      const { data, error } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });
      if (error) throw new Error(error.message || "Invalid login credentials");
      const u = buildUserFromSupabaseUser(data.user!);
      const p = buildProfileFromSupabaseUser(data.user!);
      setUser(u);
      setProfile(p);
      if (p.role) setRole(p.role);
      setIsLoading(false);
      return { user: u, profile: p, tokenPair: null };
    }

    // Real backend login (no Supabase, but NEXT_PUBLIC_API_URL is configured)
    const { tokenPair, profile: backendProfile } = await apiLogin(creds);
    const u = buildUserFromToken(tokenPair.access_token);
    if (!u) {
      clearTokens();
      throw new Error("Invalid token received from backend");
    }
    setUser(u);
    setProfile(backendProfile);
    if (backendProfile.role) setRole(backendProfile.role);
    setIsLoading(false);
    return { user: u, profile: backendProfile, tokenPair };
  }, [setUser, setProfile, setRole, setIsLoading]);

  const signOut = useCallback(async () => {
    try {
      await apiLogout(profile?.role ?? null);
    } catch {
      // ignore
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }

    clearTokens();
    setUser(null);
    setProfile(null);
    setRole(null);
    globalInitStarted = false;
  }, [setUser, setProfile, setRole, profile]);

  return { user, profile, isLoading, signIn, signOut, refreshProfile };
}

/**
 * Login helper that can be called from pages.
 * Prefer useAuth().signIn() when inside a component so React state updates immediately.
 */
export async function doLogin(
  creds: LoginCredentials
): Promise<{ user: AuthUser; profile: Profile }> {
  const { tokenPair, profile: backendProfile } = await apiLogin(creds);
  const user = buildUserFromToken(tokenPair.access_token);
  if (!user) {
    clearTokens();
    throw new Error("Invalid token received from backend");
  }
  return { user, profile: backendProfile };
}

/**
 * Hook for manager/vendor approval pages.
 * Kept for backward compatibility with mock auth fallback.
 */
export function useAllProfiles() {
  // Stub: not yet wired to the admin API. Returns empty list immediately.
  const profiles: Profile[] = [];
  const isLoading = false;

  const approveVendor = (_userId: string) => {
    // TODO: wire to admin API
  };

  const rejectVendor = (_userId: string) => {
    // TODO: wire to admin API
  };

  return { profiles, isLoading, approveVendor, rejectVendor };
}


