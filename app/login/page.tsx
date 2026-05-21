"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { ArrowRight, Building2, Wrench, Users, Eye, EyeOff, Zap } from "lucide-react";

const roles = [
  { key: "resident", label: "Resident", subtitle: "Browse & book services for your home", icon: Building2, href: "/resident", accent: "#00D4AA", bg: "rgba(0,212,170,0.08)", border: "rgba(0,212,170,0.25)", tag: "Resident Portal" },
  { key: "vendor", label: "Service Provider", subtitle: "Manage bookings & track earnings", icon: Wrench, href: "/vendor", accent: "#F5A623", bg: "rgba(245,166,35,0.08)", border: "rgba(245,166,35,0.25)", tag: "Vendor Portal" },
  { key: "manager", label: "Property Manager", subtitle: "Oversee complex operations", icon: Users, href: "/manager", accent: "#818CF8", bg: "rgba(129,140,248,0.08)", border: "rgba(129,140,248,0.25)", tag: "Manager Portal" },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  function enter(href: string, key: string) {
    setLoading(key);
    setTimeout(() => router.push(href), 400);
  }

  return (
    <div className="relative min-h-screen gradient-mesh flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-125 h-125 rounded-full opacity-20 blur-[100px] orb-teal" />
        <div className="absolute -bottom-32 -right-32 w-125 h-125 rounded-full opacity-15 blur-[100px] orb-gold" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-175 h-175 rounded-full opacity-5 blur-[140px] orb-purple" />
      </div>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <Image
            src="/liferise_logo.png"
            alt="LifeRise"
            width={64}
            height={64}
            className="h-16 w-auto object-contain mx-auto mb-4"
            priority
          />
          <h1 className="font-heading font-extrabold text-lr-white text-4xl leading-tight mb-2">LifeRise</h1>
          <p className="text-muted text-sm">Simplifying Services, Enhancing Lives</p>
        </div>

        <div className="glass rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="font-heading font-bold text-lr-white text-lg mb-1">Welcome back</h2>
          <div className="space-y-3">
            <input type="email" placeholder="Email address" defaultValue="sarah.m@riverside.com"
              className="w-full bg-midnight/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-teal/50 transition-colors" />
            <div className="relative">
              <input type={showPass ? "text" : "password"} placeholder="Password" defaultValue="••••••••"
                className="w-full bg-midnight/60 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-teal/50 transition-colors" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-lr-white transition-colors">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-muted cursor-pointer">
              <input type="checkbox" className="rounded" /> Remember me
            </label>
            <button type="button" className="text-teal hover:opacity-80 transition-opacity">Forgot password?</button>
          </div>
          <button type="button" className="w-full py-3 rounded-xl font-semibold text-sm text-midnight transition-all hover:opacity-90 active:scale-95 btn-signin">
            Sign In
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-muted text-xs flex items-center gap-1.5"><Zap size={10} className="text-gold" /> Quick Demo Access</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <div className="grid grid-cols-1 gap-3">
          {roles.map((r, i) => (
            <motion.button key={r.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
              whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.99 }}
              onClick={() => enter(r.href, r.key)} disabled={loading === r.key}
              className="relative flex items-center gap-4 p-4 rounded-2xl border text-left transition-all group cursor-pointer"
              style={{ background: r.bg, borderColor: r.border }}>
              <div className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0" style={{ background: `${r.accent}20`, border: `1px solid ${r.accent}30` }}>
                <r.icon size={20} style={{ color: r.accent }} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lr-white text-sm">{r.label}</p>
                <p className="text-muted text-xs mt-0.5">{r.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:block text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${r.accent}20`, color: r.accent }}>{r.tag}</span>
                {loading === r.key
                  ? <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: `${r.accent}40`, borderTopColor: r.accent }} />
                  : <ArrowRight size={16} className="text-muted group-hover:text-lr-white transition-colors" />}
              </div>
            </motion.button>
          ))}
        </div>

        <p className="text-center text-muted text-xs mt-6">
          Don&apos;t have an account?{" "}
          <button type="button" className="text-teal hover:opacity-80 transition-opacity font-medium">Create one free</button>
        </p>
      </motion.div>
    </div>
  );
}
