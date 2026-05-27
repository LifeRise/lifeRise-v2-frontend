"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GoogleButton } from "@/components/auth/GoogleButton";

export default function LoginPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<"resident" | "vendor">("resident");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || "Invalid email or password");
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem("liferise_remember_email", email);
        } else {
          localStorage.removeItem("liferise_remember_email");
        }
        // Force reload to let AuthProvider pick up the session and redirect
        window.location.href = "/";
      }
    } catch (err: any) {
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen gradient-mesh flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-125 h-125 rounded-full opacity-20 blur-[100px] orb-teal" />
        <div className="absolute -bottom-32 -right-32 w-125 h-125 rounded-full opacity-15 blur-[100px] orb-gold" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-175 h-175 rounded-full opacity-5 blur-[140px] orb-purple" />
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
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                userType === "resident"
                  ? "bg-teal text-midnight"
                  : "text-muted hover:text-lr-white"
              }`}
            >
              <Building2 size={16} />
              Residents
            </button>
            <button
              type="button"
              onClick={() => setUserType("vendor")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                userType === "vendor"
                  ? "bg-gold text-midnight"
                  : "text-muted hover:text-lr-white"
              }`}
            >
              <Wrench size={16} />
              Service Provider
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
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
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/20 bg-midnight/60 text-teal focus:ring-teal"
                />
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
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-muted text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <GoogleButton label={`Sign in with Google`} />
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
