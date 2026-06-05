"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Mail, ArrowRight, RotateCcw, CheckCircle } from "lucide-react";
import { authService } from "@/lib/auth/auth-service";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  const handleResend = async () => {
    if (!email) return;
    setError("");
    setIsResending(true);
    try {
      await authService.resendConfirmation(email);
      setResent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend confirmation email");
    } finally {
      setIsResending(false);
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
        className="relative z-10 w-full max-w-md text-center"
      >
        <Image
          src="/liferise_logo.png"
          alt="LifeRise"
          width={56}
          height={56}
          className="h-14 w-auto object-contain mx-auto mb-4"
          priority
        />

        <div className="glass rounded-2xl p-8 space-y-5">
          <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto">
            <Mail size={28} className="text-teal" />
          </div>

          <div>
            <h1 className="font-heading font-bold text-lr-white text-2xl mb-2">
              Verify Your Email
            </h1>
            <p className="text-muted text-sm">
              We&apos;ve sent a confirmation email to
            </p>
            {email && (
              <p className="text-lr-white font-medium text-sm mt-1">{email}</p>
            )}
          </div>

          <div className="bg-white/5 rounded-xl p-4 text-left space-y-2">
            <p className="text-muted text-xs">
              <span className="text-lr-white font-medium">Next step:</span> Click the confirmation link in your email to activate your account. If you don&apos;t see it, check your spam folder.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {resent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 text-teal text-sm"
            >
              <CheckCircle size={16} />
              Confirmation email resent!
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || !email}
              className="w-full py-3 rounded-xl font-semibold text-sm glass border border-white/10 text-lr-white hover:bg-white/8 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isResending ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <RotateCcw size={16} /> Resend Confirmation Email
                </>
              )}
            </button>
          )}

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-teal text-midnight font-bold text-sm tracking-wide hover:opacity-90 transition-all teal-glow"
          >
            Go to Login <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
