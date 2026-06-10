'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  User,
  Phone,
  Home,
  Briefcase,
  Shield,
  CreditCard,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  login as apiLogin,
  signup as apiSignup,
  signupVendor as apiSignupVendor,
  signupManager as apiSignupManager,
} from '@/lib/api/auth';
import { setTokens } from '@/lib/api/client';
import { ApiError } from '@/lib/api/types';
import { decodeJwtPayload } from '@/lib/api/jwt';
import { useAppStore } from '@/lib/store';
import type { AuthUser } from '@/lib/store';

/**
 * Returns true if an API error indicates the user already exists in the
 * backend (HTTP 409 Conflict, or a message containing "already"/"taken").
 * Treating this as non-fatal allows the onboarding flow to proceed to the
 * backend bridge even when the record was created by a prior partial sync.
 */
function isConflictError(err: unknown): boolean {
  if (err instanceof ApiError) {
    if (err.status === 409) return true;
    const msg = err.message.toLowerCase();
    return msg.includes('already') || msg.includes('taken') || msg.includes('exists');
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes('already') ||
      msg.includes('taken') ||
      msg.includes('exists') ||
      msg.includes('conflict')
    );
  }
  return false;
}

type OnboardingRole = 'resident' | 'vendor' | 'manager';

const ROLE_OPTIONS: {
  value: OnboardingRole;
  label: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: 'resident',
    label: 'Resident',
    desc: 'Browse & book home services',
    icon: <Home size={22} />,
    color: '#00D4AA',
  },
  {
    value: 'vendor',
    label: 'Service Provider',
    desc: 'Offer services to residents',
    icon: <Briefcase size={22} />,
    color: '#F5A623',
  },
  {
    value: 'manager',
    label: 'Property Manager',
    desc: 'Manage properties & vendors',
    icon: <Shield size={22} />,
    color: '#818CF8',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setAuthUser);
  const setProfile = useAppStore((s) => s.setProfile);
  const setRole = useAppStore((s) => s.setRole);
  const setAuthLoading = useAppStore((s) => s.setAuthLoading);

  const [supabaseToken, setSupabaseToken] = useState<string | null>(null);
  const [sbEmail, setSbEmail] = useState('');
  const [step, setStep] = useState<'loading' | 'role' | 'details'>('loading');
  const [selectedRole, setSelectedRole] = useState<OnboardingRole | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [einTaxId, setEinTaxId] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }

      // Returning user: attempt backend bridge first
      try {
        const { tokenPair, profile: bp } = await apiLogin({
          email: session.user.email ?? '',
          password: '',
          supabase_access_token: session.access_token,
        });
        setTokens(tokenPair.access_token, tokenPair.refresh_token);
        const payload = decodeJwtPayload(tokenPair.access_token);
        const u: AuthUser = {
          id: payload?.sub ?? session.user.id,
          email: session.user.email ?? undefined,
          userType: (payload?.type as 'customer' | 'user') ?? 'customer',
          roles: Array.isArray(payload?.roles) ? (payload.roles as string[]) : [],
        };
        setUser(u);
        setProfile(bp);
        if (bp.role) setRole(bp.role);
        setAuthLoading(false);
        const dest =
          bp.role === 'admin'
            ? '/admin'
            : bp.role === 'manager'
              ? '/manager'
              : bp.role === 'vendor'
                ? '/vendor'
                : '/resident';
        router.replace(dest);
        return;
      } catch {
        /* New user — show onboarding form */
      }

      const meta = session.user.user_metadata;
      const fullName = (meta?.full_name as string) ?? '';
      const parts = fullName.split(' ');
      setFirstName((meta?.first_name as string) ?? parts[0] ?? '');
      setLastName((meta?.last_name as string) ?? parts.slice(1).join(' ') ?? '');
      setSbEmail(session.user.email ?? '');
      setSupabaseToken(session.access_token);
      setStep('role');
    };
    init();
  }, [router, setAuthLoading, setProfile, setRole, setUser]);

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, '');
    if (!d) return '';
    const p = `+${d}`;
    return p.length > 13 ? p.slice(0, 13) : p;
  };
  const formatEIN = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 9);
    return d.length <= 2 ? d : `${d.slice(0, 2)}-${d.slice(2)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !supabaseToken) return;
    setError('');
    if (!firstName || !lastName || !phone) {
      setError('Please fill in all required fields');
      return;
    }
    if (!/^\+[0-9]{1,12}$/.test(phone)) {
      setError('Enter a valid phone number with country code (e.g. +1234567890)');
      return;
    }
    if (selectedRole === 'vendor') {
      if (!/^[0-9]{2}-[0-9]{7}$/.test(einTaxId)) {
        setError('EIN must be in format XX-XXXXXXX');
        return;
      }
      if (description.length < 10) {
        setError('Description must be at least 10 characters');
        return;
      }
    }
    setIsSubmitting(true);

    const placeholderPassword = `LR-oauth-${Math.random().toString(36).slice(2, 18)}`;
    const base = {
      first_name: firstName,
      last_name: lastName,
      email: sbEmail,
      phone,
      password: placeholderPassword,
    };
    try {
      // ── Step 1: Create backend record ──────────────────────────────────────
      // Treat 409 Conflict (email already exists) as non-fatal: the user may
      // have been created by a prior partial sync or a previous signup attempt.
      // In either case we still need to update Supabase metadata and bridge.
      try {
        if (selectedRole === 'vendor')
          await apiSignupVendor({ ...base, ein_tax_id: einTaxId, description });
        else if (selectedRole === 'manager') await apiSignupManager(base);
        else await apiSignup(base);
      } catch (signupErr: unknown) {
        if (!isConflictError(signupErr)) throw signupErr; // non-conflict → fatal
        console.info('[onboarding] Backend record already exists — proceeding to bridge');
      }

      // ── Step 2: Sync role into Supabase user_metadata (non-fatal) ──────────
      // This ensures the /auth/callback route redirects them correctly on
      // subsequent OAuth logins without hitting /auth/onboarding again.
      try {
        const sb = createClient();
        await sb.auth.updateUser({
          data: { role: selectedRole, first_name: firstName, last_name: lastName, phone },
        });
      } catch {
        /* non-fatal — metadata sync failure does not block the flow */
      }

      // ── Step 3: Bridge Supabase session → Go backend JWT ───────────────────
      // Always refresh the Supabase session immediately before bridging to
      // ensure the token passed to the backend is fresh (not expired).
      let bridgeToken = supabaseToken;
      try {
        const sb = createClient();
        const { data: refreshed } = await sb.auth.refreshSession();
        if (refreshed?.session?.access_token) {
          bridgeToken = refreshed.session.access_token;
        }
      } catch {
        /* If refresh fails, fall back to the token captured at mount */
      }
      const { tokenPair, profile: bp } = await apiLogin({
        email: sbEmail,
        password: '',
        supabase_access_token: bridgeToken,
      });
      setTokens(tokenPair.access_token, tokenPair.refresh_token);
      const payload = decodeJwtPayload(tokenPair.access_token);
      const u: AuthUser = {
        id: payload?.sub ?? sbEmail,
        email: sbEmail,
        userType: (payload?.type as 'customer' | 'user') ?? 'customer',
        roles: Array.isArray(payload?.roles) ? (payload.roles as string[]) : [],
      };
      setUser(u);
      setProfile(bp);
      if (bp.role) setRole(bp.role);
      setAuthLoading(false);
      const dest =
        bp.role === 'vendor'
          ? '/pending-approval'
          : bp.role === 'manager'
            ? '/manager'
            : '/resident';
      router.push(dest);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-midnight">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-teal border-t-transparent animate-spin" />
          <p className="text-sm text-muted">Setting up your account…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen gradient-mesh flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-125 h-125 rounded-full opacity-20 blur-[100px] orb-teal" />
        <div className="absolute -bottom-32 -right-32 w-125 h-125 rounded-full opacity-15 blur-[100px] orb-purple" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-6">
          <Image
            src="/liferise_logo.png"
            alt="LifeRise"
            width={56}
            height={56}
            className="h-14 w-auto object-contain mx-auto mb-3"
            priority
          />
          <h1 className="font-heading font-extrabold text-lr-white text-3xl leading-tight mb-1">
            Welcome to LifeRise
          </h1>
          <p className="text-muted text-sm">
            {step === 'role' ? "Choose how you'll use LifeRise" : 'Complete your profile'}
          </p>
        </div>

        {step === 'role' && (
          <div className="glass rounded-2xl p-6 space-y-3">
            {ROLE_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => {
                  setSelectedRole(opt.value);
                  setStep('details');
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-white/30 bg-midnight/40 hover:bg-midnight/60 transition-all text-left group"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${opt.color}20`, color: opt.color }}
                >
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lr-white font-semibold text-sm">{opt.label}</p>
                  <p className="text-muted text-xs">{opt.desc}</p>
                </div>
                <ArrowRight
                  size={16}
                  className="text-muted group-hover:text-lr-white transition-colors"
                />
              </button>
            ))}
          </div>
        )}

        {step === 'details' && selectedRole && (
          <div className="glass rounded-2xl p-6 space-y-4">
            <button
              type="button"
              onClick={() => setStep('role')}
              className="text-xs text-muted hover:text-lr-white transition-colors flex items-center gap-1"
            >
              ← Back to role selection
            </button>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-teal/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-teal/50 transition-colors"
                  />
                </div>
              </div>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="tel"
                  placeholder="Phone (e.g. +12025550147)"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  maxLength={13}
                  className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-teal/50 transition-colors"
                />
              </div>
              {selectedRole === 'vendor' && (
                <>
                  <div className="relative">
                    <CreditCard
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gold"
                    />
                    <input
                      type="text"
                      placeholder="EIN (Tax ID) — XX-XXXXXXX"
                      value={einTaxId}
                      onChange={(e) => setEinTaxId(formatEIN(e.target.value))}
                      maxLength={10}
                      className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-gold/50 transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <FileText size={15} className="absolute left-3 top-3 text-muted" />
                    <textarea
                      placeholder="Describe the services you provide (min. 10 chars)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-gold/50 transition-colors resize-none"
                    />
                  </div>
                </>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl font-semibold text-sm text-midnight transition-all hover:opacity-90 active:scale-95 btn-signin flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 rounded-full border-2 border-midnight/30 border-t-midnight animate-spin" />
                ) : (
                  <>
                    Complete Setup <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
