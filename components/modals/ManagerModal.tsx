"use client";

import { X, BarChart3, ShieldCheck, Users, Megaphone, Tag, Sparkles, ArrowRight } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";

interface ManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  {
    icon: Sparkles,
    title: "Brand-Personalized Dashboards",
    desc: "Every property gets a fully customized portal — your logo, your palette, your identity. Not a generic SaaS template.",
  },
  {
    icon: ShieldCheck,
    title: "Vendor Compliance Monitoring",
    desc: "Real-time compliance status, certification tracking, and automated alerts for lapsed credentials or policy violations.",
  },
  {
    icon: BarChart3,
    title: "Facility Performance Analytics",
    desc: "Booking volume, satisfaction scores, revenue trends, and resident engagement reports — all in one command view.",
  },
  {
    icon: Users,
    title: "Resident Directory & Management",
    desc: "Full resident profiles, booking history, direct communication channels, and unit-level status at your fingertips.",
  },
  {
    icon: Megaphone,
    title: "Announcement Broadcasting",
    desc: "Push property-wide announcements instantly to all resident and vendor portals simultaneously, with read-receipt tracking.",
  },
];

const promos = [
  { code: "LAUNCH50", desc: "Generate a property-wide promo to drive initial resident platform adoption." },
  { code: "MANAGER10", desc: "Unlock 10 free resident invite codes to fast-track onboarding at move-in." },
];

export function ManagerModal({ open, onOpenChange }: ManagerModalProps) {
  const isMobile = useIsMobile();

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <div className="absolute -inset-px rounded-2xl bg-linear-to-br from-purple-accent/20 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-start justify-between p-6 pb-4 border-b border-white/6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-purple-accent" />
            <span className="text-purple-accent text-xs font-bold uppercase tracking-[0.2em]">For Property Managers</span>
          </div>
          <Dialog.Title className="font-heading text-2xl font-extrabold text-lr-white tracking-tight">
            The Command Center
          </Dialog.Title>
          <Dialog.Description id="manager-modal-desc" className="text-muted text-sm mt-1">
            Total oversight. Brand-personalized. Zero friction.
          </Dialog.Description>
        </div>
        {isMobile && (
          <Dialog.Close className="shrink-0 ml-4 w-8 h-8 rounded-lg flex items-center justify-center glass hover:bg-white/10 transition-colors text-muted hover:text-lr-white">
            <X size={16} />
          </Dialog.Close>
        )}
      </div>

      <div className="relative p-6 space-y-6 overflow-y-auto max-h-[60vh] sm:max-h-none">
        {/* Feature list */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted">Platform Capabilities</p>
          {features.map((f) => (
            <div key={f.title} className="flex gap-3 p-3 rounded-xl glass-dark border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-purple-accent/10 border border-purple-accent/20 flex items-center justify-center shrink-0">
                <f.icon size={14} className="text-purple-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-lr-white">{f.title}</p>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Promo Codes */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag size={12} className="text-teal" />
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted">Promo Code System</p>
          </div>
          <div className="p-4 rounded-xl border border-teal/20 bg-teal/5">
            <p className="text-xs text-muted leading-relaxed mb-3">
              Managers generate and distribute promo codes to accelerate resident onboarding, reward high-engagement communities, and track promotional campaign effectiveness.
            </p>
            {promos.map((p) => (
              <div key={p.code} className="flex items-start gap-3 mb-2 last:mb-0">
                <span className="font-mono text-xs font-bold text-teal bg-teal/10 border border-teal/20 px-2 py-0.5 rounded-md shrink-0">
                  {p.code}
                </span>
                <span className="text-xs text-muted">{p.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bespoke Development CTA */}
        <div className="p-4 rounded-xl border border-purple-accent/20 bg-purple-accent/5">
          <p className="text-sm font-semibold text-lr-white mb-1">Need a Custom Build?</p>
          <p className="text-xs text-muted leading-relaxed mb-3">
            Every LifeRise dashboard is brand-personalized to match your property&apos;s identity. For bespoke feature development — custom integrations, white-label portals, or enterprise workflows — our team is ready to build it.
          </p>
          <button type="button" className="flex items-center gap-1.5 text-xs font-bold text-purple-accent hover:text-lr-white transition-colors group">
            Discuss Bespoke Development
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* CTA */}
        <a
          href="/login"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm tracking-wide bg-purple-accent text-white transition-opacity hover:opacity-90 shadow-[0_0_32px_rgba(129,140,248,0.18)]"
          onClick={() => onOpenChange(false)}
        >
          <BarChart3 size={15} /> View Platform Demo
        </a>
      </div>
    </ResponsiveModal>
  );
}
