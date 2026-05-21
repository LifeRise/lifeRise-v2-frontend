"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldCheck, Lock, UserCheck, Eye, FileText, HelpCircle, ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

const fadeUpItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const pillars = [
  {
    icon: UserCheck,
    title: "Verified Providers",
    desc: "Every service provider undergoes identity verification, background checks, and skill validation before joining the platform.",
    color: "text-teal",
    bg: "bg-teal/10",
    border: "border-teal/20",
  },
  {
    icon: Lock,
    title: "Secure Payments",
    desc: "All transactions are encrypted end-to-end. Funds are held in escrow until service completion, protecting both parties.",
    color: "text-gold",
    bg: "bg-gold/10",
    border: "border-gold/20",
  },
  {
    icon: Eye,
    title: "Transparent Reviews",
    desc: "Genuine feedback from verified residents. No fake reviews, no hidden ratings — just honest community-driven quality signals.",
    color: "text-purple-accent",
    bg: "bg-purple-accent/10",
    border: "border-purple-accent/20",
  },
  {
    icon: ShieldCheck,
    title: "Data Privacy",
    desc: "Your personal information is never sold or shared. We comply with industry standards and give you full control over your data.",
    color: "text-emerald",
    bg: "bg-emerald/10",
    border: "border-emerald/20",
  },
];

const commitments = [
  { icon: FileText, label: "Clear Terms of Service", text: "No hidden clauses. Every policy is written in plain language." },
  { icon: HelpCircle, label: "24/7 Support", text: "Our safety team is always available to resolve disputes and answer questions." },
  { icon: ShieldCheck, label: "Incident Reporting", text: "One-tap reporting for any safety concern, with rapid response protocols." },
];

export default function TrustSafetyPage() {
  return (
    <div className="min-h-screen bg-midnight">
      {/* Header */}
      <header className="border-b border-white/[0.06] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-muted hover:text-lr-white transition-colors text-sm">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <p className="font-heading font-bold text-lr-white text-sm">LifeRise Solutions</p>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-12 lg:py-20 max-w-7xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 lg:mb-24"
        >
          <div className="w-14 h-14 rounded-2xl bg-teal/10 border border-teal/20 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={24} className="text-teal" />
          </div>
          <h1 className="font-heading font-extrabold text-lr-white text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-4">
            Trust & <span className="text-teal">Safety</span>
          </h1>
          <p className="text-muted text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Your security is the foundation of everything we build. From verified providers to encrypted payments, we protect every interaction on the LifeRise platform.
          </p>
        </motion.div>

        {/* Pillars */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 lg:mb-24"
        >
          {pillars.map((p) => (
            <motion.div key={p.title} variants={fadeUpItem}>
              <GlassCard className="p-6 h-full border border-white/[0.06] hover:border-white/[0.10] transition-colors">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", p.bg, p.border, "border")}>
                  <p.icon size={18} className={p.color} />
                </div>
                <h3 className="font-heading text-base font-bold text-lr-white mb-2">{p.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{p.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Commitments */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="glass rounded-2xl border border-white/[0.06] p-6 lg:p-10"
        >
          <motion.h2 variants={fadeUpItem} className="font-heading font-extrabold text-lr-white text-xl sm:text-2xl mb-8 text-center">
            Our Commitments to You
          </motion.h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {commitments.map((c) => (
              <motion.div key={c.label} variants={fadeUpItem} className="text-center">
                <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
                  <c.icon size={18} className="text-muted" />
                </div>
                <h3 className="font-semibold text-lr-white text-sm mb-1">{c.label}</h3>
                <p className="text-xs text-muted leading-relaxed">{c.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mt-16 lg:mt-24"
        >
          <p className="text-muted text-sm mb-4">Have a safety concern or question?</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal/10 text-teal font-semibold text-sm hover:bg-teal/20 transition-colors border border-teal/20"
          >
            Contact Safety Team
          </Link>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-muted/60 text-xs">
            © {new Date().getFullYear()} LifeRise Solutions. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
