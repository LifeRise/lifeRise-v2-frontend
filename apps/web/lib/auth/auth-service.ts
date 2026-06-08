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

// ─── Supabase public.profiles persistence ────────────────────────────────────

type ProfileRole = 'resident' | 'vendor' | 'manager' | 'admin';

interface ProfilePayload {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: ProfileRole;
  approval_status: 'pending' | 'approved' | 'rejected';
  ein_tax_id?: string;
  description?: string;
}

/**
 * Upserts a row into public.profiles via the /api/profile server route,
 * which uses the Supabase service-role key (bypasses RLS).
 * Non-fatal: logs a warning on failure rather than blocking sign-up.
 */
async function persistSupabaseProfile(payload: ProfilePayload): Promise<void> {
  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let message = `Profile API returned ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore JSON parse errors on error responses
    }
    throw new Error(message);
  }
}

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
    const role = (data.role ?? 'resident') as ProfileRole;
    const isManager = role === 'manager' || role === 'admin';

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
            role,
          },
        },
      });
      if (error) throw new Error(error.message);

      // Persist profile to public.profiles via service-role API route (non-fatal).
      if (result.user) {
        try {
          await persistSupabaseProfile({
            id: result.user.id,
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
            role,
            approval_status: 'approved',
          });
        } catch (profileErr: unknown) {
          console.warn(
            '[auth-service] Supabase profile persistence failed:',
            profileErr instanceof Error ? profileErr.message : String(profileErr)
          );
        }
      }

      // Bridge: also create the user in the Go backend so backend login works later.
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
        // Re-throw so the UI can show the actual error when Supabase is not the primary auth.
        if (!isSupabaseConfigured()) throw backendErr;
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

      // Persist vendor profile to public.profiles — includes EIN and description (non-fatal).
      if (result.user) {
        try {
          await persistSupabaseProfile({
            id: result.user.id,
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
            role: 'vendor',
            approval_status: 'pending',
            ein_tax_id: data.ein_tax_id,
            description: data.description,
          });
        } catch (profileErr: unknown) {
          console.warn(
            '[auth-service] Supabase vendor profile persistence failed:',
            profileErr instanceof Error ? profileErr.message : String(profileErr)
          );
        }
      }

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

      try {
        const { tokenPair, profile } = await apiLogin(creds);
        setTokens(tokenPair.access_token, tokenPair.refresh_token);
        return { user: null, session: null, profile };
      } catch (backendErr: unknown) {
        console.warn(
          '[auth-service] Backend fallback login failed:',
          backendErr instanceof Error ? backendErr.message : String(backendErr)
        );
      }
    }

    // Final fallback: mock auth (only when Supabase is NOT configured)
    if (!isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });
      if (error) throw new Error(error.message);
      return { user: data.user, session: data.session };
    }

    throw new Error('Login failed');
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
