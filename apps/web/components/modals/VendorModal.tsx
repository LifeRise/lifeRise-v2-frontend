"use client";

import { X, TrendingUp, Briefcase, Users, Zap, DollarSign, Tag } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";

interface VendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  {
    icon: Briefcase,
    title: "Real-Time Booking Queue",
    desc: "Kanban-style board to accept, decline, or reschedule incoming requests instantly — no back-and-forth required.",
  },
  {
    icon: TrendingUp,
    title: "Earnings Analytics",
    desc: "Weekly and monthly revenue charts with payout tracking, peak-day insights, and trend comparisons.",
  },
  {
    icon: Users,
    title: "Client CRM & Communication",
    desc: "Build lasting relationships with built-in messaging, client history logs, and rebooking nudges.",
  },
  {
    icon: Zap,
    title: "Online / Offline Toggle",
    desc: "Control your availability in real-time — pause new bookings with a single tap and resume when you're ready.",
  },
];

const promos = [
  { code: "VENDOR50", desc: "50% off your first month of premium listing placement." },
  { code: "REFER20", desc: "Earn $20 credit for every new vendor you bring to the platform." },
];

export function VendorModal({ open, onOpenChange }: VendorModalProps) {
  const isMobile = useIsMobile();

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <div className="absolute -inset-px rounded-2xl bg-linear-to-br from-gold/20 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-start justify-between p-6 pb-4 border-b border-white/6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-gold" />
            <span className="text-gold text-xs font-bold uppercase tracking-[0.2em]">For Service Providers</span>
          </div>
          <Dialog.Title className="font-heading text-2xl font-extrabold text-lr-white tracking-tight">
            The Vendor Ecosystem
          </Dialog.Title>
          <Dialog.Description id="vendor-modal-desc" className="text-muted text-sm mt-1">
            Built for independent professionals who run serious businesses.
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
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted">Core Workflow</p>
          {features.map((f) => (
            <div key={f.title} className="flex gap-3 p-3 rounded-xl glass-dark border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                <f.icon size={14} className="text-gold" />
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
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted">Promo Codes</p>
          </div>
          <div className="p-4 rounded-xl border border-teal/20 bg-teal/5">
            <p className="text-xs text-muted leading-relaxed mb-3">
              Promo codes drive acquisition and reward loyalty. Share codes with clients directly from your vendor dashboard to incentivize first bookings and referrals.
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

        {/* CTA */}
        <a
          href="/login"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm tracking-wide bg-gold text-midnight transition-opacity hover:opacity-90 gold-glow"
          onClick={() => onOpenChange(false)}
        >
          <DollarSign size={15} /> Start Your Journey
        </a>
      </div>
    </ResponsiveModal>
  );
}
