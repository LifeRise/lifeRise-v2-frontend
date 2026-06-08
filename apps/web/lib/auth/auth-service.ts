'use client';

/**
 * Unified authentication service.
 * Routes to Supabase auth when credentials are configured, otherwise falls back
 * to the Go backend (or mock auth in demo mode).
 */

import { createClient } from '@/lib/supabase/client';
import {
  login as apiLogin,
  signup as apiSignup,
  signupManager as apiSignupManager,
  signupVendor as apiSignupVendor,
  logout as apiLogout,
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword,
} from '@/lib/api/auth';
import { setTokens, clearTokens } from '@/lib/api/client';
import type { LoginCredentials, SignupData, BackendProfile } from '@/lib/api/types';
import type { User, Session } from '@supabase/supabase-js';

const BACKEND_RESET_TOKEN_KEY = 'liferise_backend_reset_token';
const BACKEND_RESET_CODE_KEY = 'liferise_backend_reset_code';

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
    const isManager = data.role === 'manager';

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
            role: data.role || 'resident',
          },
        },
      });
      if (error) throw new Error(error.message);

      // Bridge: also create the user in the Go backend so backend login works later
      try {
        if (isManager) {
          await apiSignupManager(data);
        } else {
          await apiSignup(data);
        }
      } catch (backendErr: unknown) {
        // User might already exist in backend, or backend might be down.
        // Supabase auth is the source of truth — don't block on backend failure.
        console.warn(
          '[auth-service] Backend signup bridge failed:',
          backendErr instanceof Error ? backendErr.message : String(backendErr)
        );
      }

      return { user: result.user, session: result.session };
    }

    // Fallback: Go backend signup (mock mode auto-confirms)
    if (isManager) {
      await apiSignupManager(data);
    } else {
      await apiSignup(data);
    }
    return { user: null, session: null };
  },

  /** Vendor registration — Supabase (with bridge) or direct backend or mock */
  async signUpVendor(
    data: SignupData & { ein_tax_id: string; description: string }
  ): Promise<AuthSession> {
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
            role: 'vendor',
            // Ensures AuthProvider routes to /pending-approval even without a backend profile
            approval_status: 'pending',
            ein_tax_id: data.ein_tax_id,
            description: data.description,
          },
        },
      });
      if (error) throw new Error(error.message);

      // Bridge: register as vendor in Go backend so JWT login works later.
      // Failure is non-fatal — Supabase is the source of truth here.
      try {
        await apiSignupVendor(data);
      } catch (backendErr: unknown) {
        console.warn(
          '[auth-service] Backend vendor signup bridge failed:',
          backendErr instanceof Error ? backendErr.message : String(backendErr)
        );
      }

      return { user: result.user, session: result.session };
    }

    // No Supabase: go straight to the backend vendor endpoint.
    await apiSignupVendor(data);
    return { user: null, session: null };
  },

  /** Email + password sign-in */
  async signInWithPassword(
    creds: LoginCredentials
  ): Promise<AuthSession & { profile?: BackendProfile }> {
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
          console.warn(
            '[auth-service] Backend login bridge failed:',
            backendErr instanceof Error ? backendErr.message : String(backendErr)
          );
          // Still return Supabase session even if backend bridge fails
          return { user: data.user, session: data.session };
        }
      }

      // Supabase login failed — try backend-only fallback
      console.warn(
        '[auth-service] Supabase login failed:',
        error?.message,
        '— trying backend fallback'
      );
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
    type: 'email' | 'sms';
  }): Promise<AuthSession> {
    const supabase = getSupabase();
    const verifyParams =
      params.type === 'email'
        ? { email: params.email!, token: params.token, type: 'email' as const }
        : { phone: params.phone!, token: params.token, type: 'sms' as const };
    const { data, error } = await supabase.auth.verifyOtp(verifyParams);
    if (error) throw new Error(error.message);
    return { user: data.user, session: data.session };
  },

  /** Resend confirmation email */
  async resendConfirmation(email: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw new Error(error.message);
  },

  /** Request password reset (backend-first; falls back to Supabase) */
  async resetPassword(email: string): Promise<void> {
    // Always try backend first — users live in the Go DB, not Supabase Auth
    try {
      await apiForgotPassword(email);
      return;
    } catch (backendErr: unknown) {
      // If backend is unavailable and Supabase is configured, fall back
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw new Error(error.message);
        return;
      }
      throw backendErr;
    }
  },

  /**
   * Handle password-reset callback.
   * Backend flow: ?token=...&code=... (stores for updatePassword).
   * Supabase flow: ?code=... or #access_token=... (exchanges for session).
   * Call this on mount of the /reset-password page.
   */
  async exchangeRecoverySession(): Promise<Session | null> {
    const url = new URL(window.location.href);

    // Backend flow: token + code in query params
    const token = url.searchParams.get('token');
    const code = url.searchParams.get('code');
    if (token && code) {
      localStorage.setItem(BACKEND_RESET_TOKEN_KEY, token);
      localStorage.setItem(BACKEND_RESET_CODE_KEY, code);
      window.history.replaceState(null, '', window.location.pathname);
      // Return a minimal mock session so the UI knows context is valid
      return {
        access_token: '',
        refresh_token: '',
        expires_in: 0,
        token_type: 'bearer',
        user: null,
      } as unknown as Session;
    }

    if (!isSupabaseConfigured()) return null;

    const supabase = getSupabase();

    // PKCE flow: exchange code query param for session
    const pkceCode = url.searchParams.get('code');
    if (pkceCode) {
      const { error } = await supabase.auth.exchangeCodeForSession(pkceCode);
      if (error) throw new Error(error.message);
      window.history.replaceState(null, '', window.location.pathname);
    }

    // Implicit flow: tokens in URL hash
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const type = params.get('type');

    if (access_token && refresh_token && type === 'recovery') {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw new Error(error.message);
      window.history.replaceState(null, '', window.location.pathname);
    }

    // Verify session was established
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) throw new Error(sessionError.message);
    return session;
  },

  /** Update password (used on reset-password page) */
  async updatePassword(password: string): Promise<void> {
    const token = localStorage.getItem(BACKEND_RESET_TOKEN_KEY);
    const code = localStorage.getItem(BACKEND_RESET_CODE_KEY);

    if (token && code) {
      // Backend flow
      await apiResetPassword(token, code, password);
      localStorage.removeItem(BACKEND_RESET_TOKEN_KEY);
      localStorage.removeItem(BACKEND_RESET_CODE_KEY);
      return;
    }

    // Supabase flow
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
