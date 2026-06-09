'use client';

/**
 * Unified authentication service.
 * Routes to Supabase auth when credentials are configured, otherwise falls back
 * to the Go backend (or mock auth in demo mode).
 */

import { createClient } from '@/lib/supabase/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
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
import { toast } from 'sonner';

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

/**
 * Dedicated client for password-reset flows.
 * Uses localStorage instead of cookies so the PKCE code verifier survives
 * across page loads (the @supabase/ssr cookie storage can drop the verifier
 * when the reset link is clicked from an email client).
 */
function createResetClient() {
  if (!isSupabaseConfigured()) return null;
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        storageKey: 'liferise-reset-auth-token',
      },
    }
  );
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
      // Failure is non-fatal — Supabase is the source of truth for auth.
      try {
        if (isManager) {
          await apiSignupManager(data);
        } else {
          await apiSignup(data);
        }
      } catch (backendErr: unknown) {
        // User might already exist in backend, or backend might be down.
        // Log but do not rethrow — Supabase signup already succeeded.
        console.warn(
          '[auth-service] Backend signup bridge failed (non-fatal):',
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
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });

      if (!sbError && sbData.user && sbData.session) {
        // ── Path A: Supabase succeeded ──────────────────────────────────────
        // Try bridging to the Go backend via the Supabase access token
        // (preferred — no local password stored in the backend DB).
        let bridgeFailedWith401 = false;
        try {
          const { tokenPair, profile } = await apiLogin({
            email: creds.email,
            password: creds.password,
            supabase_access_token: sbData.session.access_token,
          });
          setTokens(tokenPair.access_token, tokenPair.refresh_token);
          return { user: sbData.user, session: sbData.session, profile };
        } catch (bridgeErr: unknown) {
          const err = bridgeErr instanceof Error ? bridgeErr : new Error(String(bridgeErr));
          bridgeFailedWith401 =
            'status' in err && (err as unknown as { status: number }).status === 401;
          console.warn('[auth-service] Backend token bridge failed:', err.message);
        }

        // If the bridge failed because the user does not exist in the backend
        // DB (401), attempt to auto-sync by re-creating the account via the
        // backend signup endpoint, then retry the bridge.
        if (bridgeFailedWith401) {
          const md = sbData.user.user_metadata || {};
          const role = (md.role as string) || 'resident';
          const signupPayload: SignupData & { role?: string } = {
            email: creds.email,
            password: creds.password,
            first_name: (md.first_name as string) || '',
            last_name: (md.last_name as string) || '',
            phone: (md.phone as string) || '',
            role,
          };

          try {
            if (role === 'vendor') {
              await apiSignupVendor({
                ...signupPayload,
                ein_tax_id: (md.ein_tax_id as string) || '',
                description: (md.description as string) || '',
              });
            } else if (role === 'manager' || role === 'admin') {
              await apiSignupManager(signupPayload);
            } else {
              await apiSignup(signupPayload);
            }
            console.log('[auth-service] Auto-synced user to backend, retrying bridge...');

            // Retry bridge after successful signup
            const { tokenPair, profile } = await apiLogin({
              email: creds.email,
              password: creds.password,
              supabase_access_token: sbData.session.access_token,
            });
            setTokens(tokenPair.access_token, tokenPair.refresh_token);
            return { user: sbData.user, session: sbData.session, profile };
          } catch (syncErr: unknown) {
            console.warn(
              '[auth-service] Backend auto-sync failed:',
              syncErr instanceof Error ? syncErr.message : String(syncErr)
            );
          }
        }

        // Fallback: legacy password-based backend login
        try {
          const { tokenPair, profile } = await apiLogin(creds);
          setTokens(tokenPair.access_token, tokenPair.refresh_token);
          return { user: sbData.user, session: sbData.session, profile };
        } catch (passwordErr: unknown) {
          console.warn(
            '[auth-service] Backend password fallback failed:',
            passwordErr instanceof Error ? passwordErr.message : String(passwordErr)
          );
        }

        // Both backend paths failed but Supabase auth succeeded.
        // Return the Supabase user without a backend JWT — hooks.ts will
        // resolve the profile from public.profiles for the role-based redirect.
        toast.warning('Signed in via Supabase, but backend sync failed.', {
          description: 'Some features may be unavailable until the backend is synced.',
          duration: 6000,
        });
        console.warn(
          '[auth-service] Backend unreachable after Supabase login. ' +
            'Proceeding with Supabase-only session — API calls will require backend.'
        );
        return { user: sbData.user, session: sbData.session };
      }

      // ── Path B: Supabase failed — try direct backend login ─────────────
      console.warn(
        '[auth-service] Supabase login failed:',
        sbError?.message,
        '— trying backend-only login'
      );
      try {
        const { tokenPair, profile } = await apiLogin(creds);
        setTokens(tokenPair.access_token, tokenPair.refresh_token);
        return { user: null, session: null, profile };
      } catch (backendErr: unknown) {
        console.warn(
          '[auth-service] Backend-only login also failed:',
          backendErr instanceof Error ? backendErr.message : String(backendErr)
        );
      }

      // Both Supabase and backend failed — surface the Supabase error message.
      throw new Error(sbError?.message || 'Login failed');
    }

    // ── No Supabase configured — mock or direct backend ──────────────────
    // Uses the mock Supabase client in demo/offline mode, or a real but
    // unconfigured client (which falls through to the throw below).
    const supabase = getSupabase();
    const { data: mockData, error: mockError } = await supabase.auth.signInWithPassword({
      email: creds.email,
      password: creds.password,
    });
    if (!mockError && mockData.user) {
      return { user: mockData.user, session: mockData.session };
    }

    throw new Error(mockError?.message || 'Login failed');
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

  /** Request password reset (Supabase-first when configured; falls back to Go backend) */
  async resetPassword(email: string): Promise<void> {
    // Supabase is the source of truth for passwords — use its reset flow directly.
    if (isSupabaseConfigured()) {
      // Use the localStorage-based reset client so the PKCE code verifier
      // survives the email-link navigation (cookie-based storage can drop it).
      const resetClient = createResetClient();
      const client = resetClient ?? getSupabase();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
      return;
    }

    // Fallback: Go backend reset flow (used when Supabase is not configured)
    await apiForgotPassword(email);
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

    // Use the localStorage-based reset client so the PKCE code verifier
    // (written by resetPassword) is available after the email-link navigation.
    const resetClient = createResetClient();
    const client = resetClient ?? getSupabase();

    // PKCE flow: exchange code query param for session
    const pkceCode = url.searchParams.get('code');
    if (pkceCode) {
      const { error } = await client.auth.exchangeCodeForSession(pkceCode);
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
      const { error } = await client.auth.setSession({ access_token, refresh_token });
      if (error) throw new Error(error.message);
      window.history.replaceState(null, '', window.location.pathname);
    }

    // Verify session was established
    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession();
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
    // Use the same localStorage-based reset client so the session established
    // by exchangeRecoverySession is available here.
    const resetClient = createResetClient();
    const client = resetClient ?? getSupabase();
    const { error } = await client.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },

  /** Sign out from all auth systems */
  async signOut(): Promise<void> {
    // Call the backend logout FIRST while the Bearer token is still in
    // localStorage. clearTokens() runs afterward (in apiLogout's finally block
    // and again here as a safety net).
    try {
      await apiLogout();
    } catch {
      // A 401 here means the token was already invalid — safe to ignore.
      // clearTokens() still runs in apiLogout's finally block.
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }

    // Belt-and-suspenders: ensure tokens are cleared even if apiLogout threw
    // before its own finally block ran.
    clearTokens();
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
