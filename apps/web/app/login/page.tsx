"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Building2,
  Wrench,
  Phone,
  Sparkles,
  MessageSquare,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/lib/auth/hooks";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { authService } from "@/lib/auth/auth-service";

type LoginTab = "password" | "magic" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [tab, setTab] = useState<LoginTab>("password");
  const [userType, setUserType] = useState<"resident" | "vendor" | "manager">("resident");

  // Password login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Magic link fields
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);

  // OTP fields
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPhone = (value: string) => {
    let cleaned = value.replace(/[^\d+]/g, "");
    cleaned = cleaned.replace(/\+/g, "");
    cleaned = `+${cleaned}`;
    if (cleaned.length > 15) cleaned = cleaned.slice(0, 15);
    return cleaned;
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    setIsLoading(true);
    try {
      const { profile } = await signIn({ email, password });
      const dest =
        profile.role === "manager"
          ? "/manager"
          : profile.role === "vendor"
          ? "/vendor"
          : "/resident";
      router.push(dest);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!magicEmail) {
      setError("Please enter your email");
      return;
    }
    setIsLoading(true);
    try {
      await authService.signInWithMagicLink(magicEmail);
      setMagicSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError("");
    if (!phone || phone.length < 8) {
      setError("Please enter a valid phone number with country code");
      return;
    }
    setIsLoading(true);
    try {
      await authService.signInWithOtp(phone);
      setOtpSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otpCode) {
      setError("Please enter the OTP code");
      return;
    }
    setIsLoading(true);
    try {
      await authService.verifyOtp({ phone, token: otpCode, type: "sms" });
      router.push("/resident");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP code");
    } finally {
      setIsLoading(false);
    }
  };

  const tabs: { key: LoginTab; label: string; icon: React.ElementType }[] = [
    { key: "password", label: "Password", icon: Lock },
    { key: "magic", label: "Magic Link", icon: Sparkles },
    { key: "otp", label: "Phone OTP", icon: MessageSquare },
  ];

  return (
    <div className="relative min-h-screen gradient-mesh flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-125 h-125 rounded-full opacity-20 blur-[100px] orb-teal" />
        <div className="absolute -bottom-32 -right-32 w-125 h-125 rounded-full opacity-15 blur-[100px] orb-gold" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Image
            src="/liferise_logo.png"
            alt="LifeRise"
            width={64}
            height={64}
            className="h-16 w-auto object-contain mx-auto mb-4"
            priority
          />
          <h1 className="font-heading font-extrabold text-lr-white text-4xl leading-tight mb-2">
            LifeRise
          </h1>
          <p className="text-muted text-sm">Simplifying Services, Enhancing Lives</p>
        </div>

        <div className="glass rounded-2xl p-6 mb-6 space-y-5">
          <h2 className="font-heading font-bold text-lr-white text-lg">Welcome back</h2>

          {/* User Type Toggle */}
          <div className="flex bg-midnight/60 rounded-xl p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setUserType("resident")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all ${
                userType === "resident"
                  ? "bg-teal text-midnight"
                  : "text-muted hover:text-lr-white"
              }`}
            >
              <Building2 size={15} />
              Residents
            </button>
            <button
              type="button"
              onClick={() => setUserType("vendor")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all ${
                userType === "vendor"
                  ? "bg-gold text-midnight"
                  : "text-muted hover:text-lr-white"
              }`}
            >
              <Wrench size={15} />
              Vendor
            </button>
            <button
              type="button"
              onClick={() => setUserType("manager")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all ${
                userType === "manager"
                  ? "bg-purple-accent text-midnight"
                  : "text-muted hover:text-lr-white"
              }`}
            >
              <LayoutDashboard size={15} />
              Manager
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <SocialAuthButtons />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-muted text-xs">or sign in with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Login method tabs */}
          <div className="flex bg-midnight/40 rounded-xl p-1 border border-white/8">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setError("");
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  tab === t.key
                    ? "bg-white/10 text-lr-white"
                    : "text-muted hover:text-lr-white"
                }`}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === "password" && (
              <motion.form
                key="password"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                onSubmit={handlePasswordLogin}
                className="space-y-4"
              >
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-teal/50 transition-colors"
                  />
                </div>

                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-11 pr-12 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-teal/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-lr-white transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-muted cursor-pointer">
                    <input type="checkbox" className="rounded border-white/20 bg-midnight/60 text-teal focus:ring-teal" />
                    Remember me
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-teal hover:opacity-80 transition-opacity"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-midnight transition-all hover:opacity-90 active:scale-95 btn-signin flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-midnight/30 border-t-midnight animate-spin" />
                  ) : (
                    <>
                      Sign In <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {tab === "magic" && (
              <motion.form
                key="magic"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleMagicLink}
                className="space-y-4"
              >
                {magicSent ? (
                  <div className="bg-teal/10 border border-teal/20 rounded-xl px-4 py-4 text-center space-y-2">
                    <Sparkles size={24} className="text-teal mx-auto" />
                    <p className="text-teal text-sm font-medium">Magic link sent!</p>
                    <p className="text-muted text-xs">
                      Check your email at <span className="text-lr-white">{magicEmail}</span> for a sign-in link.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={magicEmail}
                        onChange={(e) => setMagicEmail(e.target.value)}
                        className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-teal/50 transition-colors"
                      />
                    </div>
                    <p className="text-muted text-xs">
                      We&apos;ll send you a secure sign-in link. No password needed.
                    </p>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 rounded-xl font-semibold text-sm text-midnight transition-all hover:opacity-90 active:scale-95 btn-signin flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 rounded-full border-2 border-midnight/30 border-t-midnight animate-spin" />
                      ) : (
                        <>
                          Send Magic Link <Sparkles size={16} />
                        </>
                      )}
                    </button>
                  </>
                )}
              </motion.form>
            )}

            {tab === "otp" && (
              <motion.form
                key="otp"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleVerifyOtp}
                className="space-y-4"
              >
                {!otpSent ? (
                  <>
                    <div className="relative">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        type="tel"
                        placeholder="Phone number (e.g. +1234567890)"
                        value={phone}
                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                        className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-teal/50 transition-colors"
                      />
                    </div>
                    <p className="text-muted text-xs">
                      Enter your phone number with country code. We&apos;ll send you a one-time code.
                    </p>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isLoading}
                      className="w-full py-3 rounded-xl font-semibold text-sm text-midnight transition-all hover:opacity-90 active:scale-95 btn-signin flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 rounded-full border-2 border-midnight/30 border-t-midnight animate-spin" />
                      ) : (
                        <>
                          Send Code <MessageSquare size={16} />
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="bg-teal/10 border border-teal/20 rounded-xl px-4 py-3 text-center">
                      <p className="text-teal text-sm">
                        Code sent to <span className="font-medium">{phone}</span>
                      </p>
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-teal/50 transition-colors text-center tracking-widest"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isLoading}
                        className="flex-1 py-3 rounded-xl font-semibold text-sm glass border border-white/10 text-lr-white hover:bg-white/8 transition-all disabled:opacity-50"
                      >
                        Resend
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-3 rounded-xl font-semibold text-sm text-midnight transition-all hover:opacity-90 active:scale-95 btn-signin flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 rounded-full border-2 border-midnight/30 border-t-midnight animate-spin" />
                        ) : (
                          <>Verify</>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-muted text-xs">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-teal hover:opacity-80 transition-opacity font-medium">
            Create one free
          </Link>
        </p>

        {/* Demo credentials hint */}
        <div className="mt-6 glass rounded-xl p-4 border border-white/5">
          <p className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-2">Demo Accounts</p>
          <div className="space-y-1 text-xs text-muted">
            <p><span className="text-teal">Resident:</span> resident@liferise.demo / Resident123!</p>
            <p><span className="text-gold">Vendor:</span> vendor@liferise.demo / Vendor123!</p>
            <p><span className="text-purple-accent">Manager:</span> manager@liferise.demo / Manager123!</p>
            <p><span className="text-rose">Pending:</span> pending@liferise.demo / Pending123!</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
