"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle } from "lucide-react";
import { authService } from "@/lib/auth/auth-service";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Verify we're in a valid password-reset context
  useEffect(() => {
    if (!authService.isSupabaseConfigured()) {
      // In mock mode, just show the form
      return;
    }
    // Supabase handles the token in the URL fragment (#access_token=...)
    // The session is automatically set by the callback or middleware
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Please fill in both fields");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      await authService.updatePassword(password);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

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
            Reset Password
          </h1>
          <p className="text-muted text-sm">Create a new secure password</p>
        </div>

        <div className="glass rounded-2xl p-6 mb-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4 space-y-3"
            >
              <CheckCircle size={48} className="text-teal mx-auto" />
              <h3 className="text-lr-white font-semibold text-lg">Password updated!</h3>
              <p className="text-muted text-sm">
                Your password has been reset successfully. Redirecting to login…
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="New password"
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

              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type={showConfirmPass ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-11 pr-12 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-teal/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-lr-white transition-colors"
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
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
                    Update Password <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-muted text-xs">
          Remember your password?{" "}
          <Link href="/login" className="text-teal hover:opacity-80 transition-opacity font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
