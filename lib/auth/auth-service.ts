"use client";

/**
 * Unified authentication service.
 * Routes to Supabase auth when credentials are configured, otherwise falls back
 * to the Go backend (or mock auth in demo mode).
 */

import { createClient } from "@/lib/supabase/client";
import { login as apiLogin, signup as apiSignup, logout as apiLogout } from "@/lib/api/auth";
import { setTokens, clearTokens } from "@/lib/api/client";
import type { LoginCredentials, SignupData, BackendProfile } from "@/lib/api/types";
import type { User, Session } from "@supabase/supabase-js";

const isSupabaseConfigured = () => !!process.env.NEXT_PUBLIC_SUPABASE_URL;

function getSupabase() {
  return createClient();
}

export interface AuthSession {
  user: User | null;
  session: Session | null;
}

export const authService = {
  isSupabaseConfigured,

  /** Email + password sign-up with email confirmation */
  async signUp(data: SignupData & { role?: string }): Promise<AuthSession> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data: result, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
            role: data.role || "resident",
          },
        },
      });
      if (error) throw new Error(error.message);

      // Bridge: also create the user in the Go backend so backend login works later
      try {
        await apiSignup(data);
      } catch (backendErr: unknown) {
        // User might already exist in backend, or backend might be down.
        // Supabase auth is the source of truth — don't block on backend failure.
        console.warn("[auth-service] Backend signup bridge failed:", backendErr instanceof Error ? backendErr.message : String(backendErr));
      }

      return { user: result.user, session: result.session };
    }

    // Fallback: Go backend signup (mock mode auto-confirms)
    await apiSignup(data);
    return { user: null, session: null };
  },

  /** Email + password sign-in */
  async signInWithPassword(creds: LoginCredentials): Promise<AuthSession & { profile?: BackendProfile }> {
    // Strategy: try Supabase first (for users created via Supabase),
    // but if that fails, fall back to Go backend login (for backend-only demo accounts).
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });

      if (!error && data.user) {
        // Supabase login succeeded — bridge to backend for API JWT
        try {
          const { tokenPair, profile } = await apiLogin(creds);
          setTokens(tokenPair.access_token, tokenPair.refresh_token);
          return { user: data.user, session: data.session, profile };
        } catch (backendErr: unknown) {
          console.warn("[auth-service] Backend login bridge failed:", backendErr instanceof Error ? backendErr.message : String(backendErr));
          // Still return Supabase session even if backend bridge fails
          return { user: data.user, session: data.session };
        }
      }

      // Supabase login failed — try backend-only fallback
      console.warn("[auth-service] Supabase login failed:", error?.message, "— trying backend fallback");
    }

    // Fallback: mock auth (no Supabase configured)
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: creds.email,
      password: creds.password,
    });
    if (error) throw new Error(error.message);
    return { user: data.user, session: data.session };
  },

  /** Magic link (OTP via email) */
  async signInWithMagicLink(email: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw new Error(error.message);
  },

  /** Phone OTP sign-in / sign-up */
  async signInWithOtp(phone: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    if (error) throw new Error(error.message);
  },

  /** Verify OTP (email or SMS) */
  async verifyOtp(params: {
    email?: string;
    phone?: string;
    token: string;
    type: "email" | "sms";
  }): Promise<AuthSession> {
    const supabase = getSupabase();
    const verifyParams =
      params.type === "email"
        ? { email: params.email!, token: params.token, type: "email" as const }
        : { phone: params.phone!, token: params.token, type: "sms" as const };
    const { data, error } = await supabase.auth.verifyOtp(verifyParams);
    if (error) throw new Error(error.message);
    return { user: data.user, session: data.session };
  },

  /** Resend confirmation email */
  async resendConfirmation(email: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (error) throw new Error(error.message);
  },

  /** Request password reset */
  async resetPassword(email: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  },

  /** Update password (used on reset-password page) */
  async updatePassword(password: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },

  /** Sign out from all auth systems */
  async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    }
    clearTokens();
    try {
      await apiLogout();
    } catch {
      // ignore
    }
  },

  /** Get current Supabase session */
  async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured()) return null;
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /** Listen to auth state changes */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const supabase = getSupabase();
    return supabase.auth.onAuthStateChange(callback);
  },
};
