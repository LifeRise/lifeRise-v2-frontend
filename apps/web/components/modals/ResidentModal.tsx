'use client';

import { X, CalendarCheck, ShieldCheck, Star, Zap, Tag, Gift } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';

interface ResidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  {
    icon: Zap,
    title: 'One-Tap Concierge Booking',
    desc: 'Browse, select, and confirm premium home services in under 30 seconds — no phone calls, no wait times.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Providers Only',
    desc: 'Every vendor is background-checked and community-rated before listing. Zero guesswork, total confidence.',
  },
  {
    icon: CalendarCheck,
    title: 'Real-Time Tracking',
    desc: 'Follow your appointment status live — from confirmed to in-progress to complete, with instant notifications at every step.',
  },
  {
    icon: Star,
    title: 'Favorites & Recurring Bookings',
    desc: 'Save your go-to providers and set up recurring appointments with zero friction. Your routine, automated.',
  },
];

const promos = [
  { code: 'WELCOME25', desc: '25% off your very first booking on the platform.' },
  { code: 'REFER15', desc: 'Give a neighbor $15 credit — and earn $15 back when they book.' },
];

export function ResidentModal({ open, onOpenChange }: ResidentModalProps) {
  const isMobile = useIsMobile();

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <div className="absolute -inset-px rounded-2xl bg-linear-to-br from-teal/20 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-start justify-between p-6 pb-4 border-b border-white/6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-teal" />
            <span className="text-teal text-xs font-bold uppercase tracking-[0.2em]">
              For Residents
            </span>
          </div>
          <Dialog.Title className="font-heading text-2xl font-extrabold text-lr-white tracking-tight">
            The Resident Experience
          </Dialog.Title>
          <Dialog.Description id="resident-modal-desc" className="text-muted text-sm mt-1">
            Your building&apos;s concierge, reimagined for modern life.
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
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted">
            Premium Features
          </p>
          {features.map((f) => (
            <div
              key={f.title}
              className="flex gap-3 p-3 rounded-xl glass-dark border border-white/5"
            >
              <div className="w-8 h-8 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center shrink-0">
                <f.icon size={14} className="text-teal" />
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
              Unlock savings instantly at checkout. No complicated sign-up flow — just enter a code
              and your discount applies automatically.
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
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm tracking-wide bg-teal text-midnight transition-opacity hover:opacity-90 teal-glow"
          onClick={() => onOpenChange(false)}
        >
          <Gift size={15} /> Explore Services
        </a>
      </div>
    </ResponsiveModal>
  );
}
