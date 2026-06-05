"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Hourglass, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth/hooks";

export default function PendingApprovalPage() {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  useEffect(() => {
    // Poll for approval status every 10 seconds
    const interval = setInterval(() => {
      window.location.reload();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="relative min-h-screen gradient-mesh flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-125 h-125 rounded-full opacity-20 blur-[100px] orb-gold" />
        <div className="absolute -bottom-32 -right-32 w-125 h-125 rounded-full opacity-15 blur-[100px] orb-teal" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md text-center"
      >
        <Image
          src="/liferise_logo.png"
          alt="LifeRise"
          width={48}
          height={48}
          className="h-12 w-auto object-contain mx-auto mb-6"
          priority
        />

        <div className="glass rounded-2xl p-8 space-y-6">
          <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
            <Hourglass size={36} className="text-gold" />
          </div>

          <div>
            <h1 className="font-heading font-bold text-lr-white text-2xl mb-3">
              Pending Approval
            </h1>
            <p className="text-muted text-sm leading-relaxed">
              In order to access our service you have to wait for the onboarding.
              Your profile is being reviewed and we&apos;ll send you a notification
              once your profile is approved.
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-gold text-xs font-medium mb-1">Application Status</p>
            <div className="flex items-center gap-2 justify-center">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span className="text-lr-white text-sm font-medium">Under Review</span>
            </div>
          </div>

          {profile && (
            <div className="text-left bg-white/5 rounded-xl p-4 space-y-1">
              <p className="text-muted text-xs">Applicant</p>
              <p className="text-lr-white text-sm font-medium">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-muted text-xs">{profile.email}</p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/10 text-muted text-sm hover:text-lr-white hover:bg-white/5 transition-all"
          >
            <LogOut size={14} /> Sign Out
          </button>

          <p className="text-lr-white text-sm font-medium">Thank you!</p>
        </div>
      </motion.div>
    </div>
  );
}
