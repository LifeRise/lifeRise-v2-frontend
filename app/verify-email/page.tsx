"use client";

import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

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
              <span className="text-lr-white font-medium">Note:</span> In demo mode, email verification is auto-completed. In production, click the link in your email to verify.
            </p>
          </div>

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
