'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { VendorModal } from '@/components/modals/VendorModal';
import { ResidentModal } from '@/components/modals/ResidentModal';
import { ManagerModal } from '@/components/modals/ManagerModal';
import {
  ArrowRight,
  TrendingUp,
  Briefcase,
  Users,
  CalendarCheck,
  ShieldCheck,
  Star,
  BarChart3,
  Activity,
  CheckSquare,
  DollarSign,
  Clock,
  ChevronDown,
  Sparkles,
  Search,
  Zap,
  LogIn,
  UserPlus,
} from 'lucide-react';
import {
  earningsData,
  vendorSchedule,
  vendors,
  categories,
  residentBookings,
  vendorLeaderboard,
  engagementData,
} from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/hooks';

/* ─── Animation Variants ───────────────────────────────────────── */
const sectionVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const scaleInItem = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

/* ─── Vendor Dashboard Preview ─────────────────────────────────── */
function VendorPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-2 rounded-4xl bg-linear-to-br from-gold/20 to-transparent blur-2xl opacity-40" />
      <div className="relative glass rounded-2xl border border-white/8 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/5">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider">May 21, 2026</p>
            <p className="text-xs font-semibold text-lr-white font-heading">
              Good morning, Marcus ✦
            </p>
          </div>
          <div className="flex items-center gap-1.5 glass rounded-lg px-2 py-1 border border-white/6">
            <div className="w-1.5 h-1.5 rounded-full bg-teal pulse-teal" />
            <span className="text-[10px] font-semibold text-teal">Online</span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: 'Jobs', v: '4', c: 'text-teal', i: Briefcase },
              { l: 'Week', v: '$1,167', c: 'text-gold', i: DollarSign },
              { l: 'Rating', v: '4.9★', c: 'text-purple-accent', i: Star },
              { l: 'Done', v: '98%', c: 'text-emerald', i: TrendingUp },
            ].map((s) => (
              <div key={s.l} className="glass-dark rounded-xl p-2.5 text-center">
                <s.i size={12} className={cn('mx-auto mb-1', s.c)} />
                <p className="text-[11px] font-bold text-lr-white font-heading">{s.v}</p>
                <p className="text-[9px] text-muted mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>

          {/* Schedule */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">
              Today&apos;s Schedule
            </p>
            {vendorSchedule.slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2.5 glass-dark rounded-lg px-2.5 py-1.5"
              >
                <div className="text-center shrink-0 w-10">
                  <p className="text-teal text-[10px] font-bold">{s.time}</p>
                  <p className="text-muted text-[8px]">{s.duration}</p>
                </div>
                <div
                  className={cn(
                    'w-px h-6 rounded-full',
                    s.status === 'in-progress' ? 'bg-teal' : 'bg-white/8'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-lr-white text-[10px] font-semibold truncate">{s.service}</p>
                  <p className="text-muted text-[9px]">{s.client}</p>
                </div>
                {s.status === 'in-progress' && (
                  <span className="text-[8px] text-teal font-bold bg-teal/10 px-1.5 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Earnings Chart */}
          <div className="glass-dark rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">
                Weekly Earnings
              </p>
              <p className="text-[10px] font-bold text-gold font-heading">$1,167</p>
            </div>
            <div className="flex items-end gap-1 h-14">
              {earningsData.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'w-full rounded-sm min-h-1',
                      d.barClass ?? 'h-[8%]',
                      d.day === 'Sat' ? 'bg-gold' : 'bg-teal/70'
                    )}
                  />
                  <span className="text-[8px] text-muted">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Resident Dashboard Preview ───────────────────────────────── */
function ResidentPreview() {
  const statusConfig = {
    confirmed: { label: 'Confirmed', avatarBg: 'bg-teal', badgeCls: 'bg-teal/12 text-teal' },
    pending: { label: 'Pending', avatarBg: 'bg-gold', badgeCls: 'bg-gold/12 text-gold' },
    completed: {
      label: 'Completed',
      avatarBg: 'bg-purple-accent',
      badgeCls: 'bg-purple-accent/12 text-purple-accent',
    },
  };
  return (
    <div className="relative">
      <div className="absolute -inset-2 rounded-4xl bg-linear-to-br from-teal/20 to-transparent blur-2xl opacity-40" />
      <div className="relative glass rounded-2xl border border-white/8 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-white/5">
          <p className="text-[10px] text-muted uppercase tracking-wider">May 21, 2026</p>
          <p className="text-xs font-semibold text-lr-white font-heading">Good evening, Sarah ✦</p>
        </div>

        <div className="p-4 space-y-3">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: 'Active', v: '3', c: 'text-teal', i: Activity },
              { l: 'Pending', v: '1', c: 'text-gold', i: Clock },
              { l: 'Done', v: '12', c: 'text-purple-accent', i: CheckSquare },
              { l: 'Spent', v: '$840', c: 'text-rose', i: DollarSign },
            ].map((s) => (
              <div key={s.l} className="glass-dark rounded-xl p-2.5 text-center">
                <s.i size={12} className={cn('mx-auto mb-1', s.c)} />
                <p className="text-[11px] font-bold text-lr-white font-heading">{s.v}</p>
                <p className="text-[9px] text-muted mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>

          {/* Categories */}
          <div className="flex gap-1.5 overflow-hidden">
            {categories.slice(0, 5).map((cat, i) => (
              <span
                key={cat}
                className={cn(
                  'shrink-0 px-2.5 py-1 rounded-full text-[9px] font-semibold',
                  i === 0 ? 'bg-teal text-midnight' : 'bg-white/6 text-muted'
                )}
              >
                {cat}
              </span>
            ))}
          </div>

          {/* Service Cards */}
          <div className="grid grid-cols-2 gap-2">
            {vendors.slice(0, 2).map((v) => (
              <div key={v.id} className="glass-dark rounded-xl overflow-hidden">
                <div
                  className={cn(
                    'h-16 flex items-center justify-center relative bg-linear-to-br',
                    v.category === 'Wellness'
                      ? 'from-emerald-600 to-teal-900'
                      : 'from-amber-700 to-red-950'
                  )}
                >
                  <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white font-heading">
                    {v.initials}
                  </span>
                  {v.badge && (
                    <span className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-midnight/60 text-teal border border-teal/30">
                      {v.badge}
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-lr-white text-[10px] font-semibold truncate">{v.name}</p>
                    <div className="flex items-center gap-0.5 text-gold text-[9px] font-bold">
                      <Star size={8} fill="#F5A623" /> {v.rating}
                    </div>
                  </div>
                  <p className="text-muted text-[8px] mb-1.5">
                    {v.specialty} · <span className="text-teal">{v.price}</span>
                  </p>
                  <div className="w-full py-1 rounded-md text-[9px] font-bold text-center bg-teal text-midnight">
                    Book Now
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Booking */}
          <div className="glass-dark rounded-xl p-2.5">
            <p className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1.5">
              Recent Booking
            </p>
            {residentBookings.slice(0, 1).map((b) => {
              const s = statusConfig[b.status as keyof typeof statusConfig] || statusConfig.pending;
              return (
                <div key={b.id} className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-midnight shrink-0',
                      s.avatarBg
                    )}
                  >
                    {b.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lr-white text-[10px] font-semibold">{b.service}</p>
                    <p className="text-muted text-[8px]">
                      {b.vendor} · {b.date}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-[8px] font-semibold px-1.5 py-0.5 rounded-full shrink-0',
                      s.badgeCls
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Manager Dashboard Preview ────────────────────────────────── */
function ManagerPreview() {
  const totalEngagement = engagementData.reduce((acc, d) => acc + d.value, 0);
  const segments = engagementData.reduce<
    Array<(typeof engagementData)[0] & { start: number; end: number }>
  >((acc, d) => {
    const start = acc.length > 0 ? acc[acc.length - 1].end : 0;
    return [...acc, { ...d, start, end: start + d.value }];
  }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-2 rounded-4xl bg-linear-to-br from-purple-accent/20 to-transparent blur-2xl opacity-40" />
      <div className="relative glass rounded-2xl border border-white/8 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-white/5">
          <p className="text-[10px] text-muted uppercase tracking-wider">May 21, 2026</p>
          <p className="text-xs font-semibold text-lr-white font-heading">Riverside Commons ✦</p>
        </div>

        <div className="p-4 space-y-3">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: 'Residents', v: '247', c: 'text-purple-accent', d: '+4' },
              { l: 'Vendors', v: '18', c: 'text-teal', d: '+2' },
              { l: 'Bookings', v: '143', c: 'text-gold', d: '+18%' },
              { l: 'Satisfaction', v: '94%', c: 'text-emerald', d: 'Top' },
            ].map((s) => (
              <div key={s.l} className="glass-dark rounded-xl p-2.5 text-center">
                <p className="text-[11px] font-bold text-lr-white font-heading">{s.v}</p>
                <p className="text-[8px] text-muted mt-0.5">{s.l}</p>
                <p className={cn('text-[8px] font-semibold mt-0.5', s.c)}>{s.d}</p>
              </div>
            ))}
          </div>

          {/* Engagement + Leaderboard */}
          <div className="grid grid-cols-5 gap-2">
            {/* Donut */}
            <div className="col-span-2 glass-dark rounded-xl p-3 flex flex-col items-center justify-center">
              <p className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-2 w-full">
                Engagement
              </p>
              {/* SVG donut — uses stroke presentation attributes, not CSS inline styles */}
              <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                {segments.map((s) => {
                  const r = 24;
                  const circ = 2 * Math.PI * r;
                  const dash = (s.value / totalEngagement) * circ;
                  const offset = circ * 0.25 - (s.start / totalEngagement) * circ;
                  return (
                    <circle
                      key={s.name}
                      cx="32"
                      cy="32"
                      r={r}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="10"
                      strokeDasharray={`${dash} ${circ - dash}`}
                      strokeDashoffset={offset}
                    />
                  );
                })}
                <circle cx="32" cy="32" r="19" fill="#1A2235" />
                <text
                  x="32"
                  y="36"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#F8FAFC"
                  fontFamily="sans-serif"
                >
                  {totalEngagement}%
                </text>
              </svg>
              <div className="flex flex-wrap gap-1.5 mt-1 justify-center">
                {engagementData.slice(0, 3).map((e) => (
                  <div key={e.name} className="flex items-center gap-1">
                    <div className={cn('w-1.5 h-1.5 rounded-full', e.dotClass ?? 'bg-muted')} />
                    <span className="text-[8px] text-muted">{e.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="col-span-3 glass-dark rounded-xl p-3">
              <p className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-2">
                Top Vendors
              </p>
              <div className="space-y-1.5">
                {vendorLeaderboard.slice(0, 3).map((v) => (
                  <div key={v.rank} className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-[10px] font-bold w-4 text-center',
                        v.rank === 1 ? 'text-gold' : 'text-muted'
                      )}
                    >
                      {v.rank === 1 ? '🥇' : v.rank === 2 ? '🥈' : '🥉'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-lr-white text-[10px] font-semibold truncate">{v.name}</p>
                    </div>
                    <span className="text-gold text-[9px] font-bold">{v.rating}★</span>
                    <span className="text-teal text-[9px] font-bold">{v.earnings}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Announcement */}
          <div className="glass-dark rounded-xl p-3 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 bg-purple-accent/15">
              <Sparkles size={10} className="text-purple-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lr-white text-[10px] font-semibold">
                New Vendor: Healthy Bites Meal Prep
              </p>
              <p className="text-muted text-[9px] mt-0.5 line-clamp-1">
                Carlos Rivera has joined LifeRise offering weekly meal prep packages.
              </p>
            </div>
            <span className="text-muted text-[8px] shrink-0">May 20</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Feature Row ──────────────────────────────────────────────── */
function FeatureItem({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/6">
        <Icon size={14} className="text-teal" />
      </div>
      <span className="text-sm text-lr-white/90">{text}</span>
    </div>
  );
}

/* ─── Section Wrapper ──────────────────────────────────────────── */
function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={sectionVariants}
      className={`relative z-10 px-4 sm:px-6 lg:px-8 py-24 lg:py-32 ${className}`}
    >
      {children}
    </motion.section>
  );
}

/* ─── Auth Buttons ─────────────────────────────────────────────── */
function AuthButtons() {
  const { user, profile } = useAuth();

  if (user && profile) {
    const dest =
      profile.role === 'manager' ? '/manager' : profile.role === 'vendor' ? '/vendor' : '/resident';
    const label =
      profile.role === 'manager'
        ? 'Manager Portal'
        : profile.role === 'vendor'
          ? 'Vendor Portal'
          : 'Resident Portal';
    const accent =
      profile.role === 'manager'
        ? 'bg-purple-accent'
        : profile.role === 'vendor'
          ? 'bg-gold'
          : 'bg-teal';
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
        <Link
          href={dest}
          className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-xl ${accent} text-midnight font-bold text-sm tracking-wide hover:opacity-90 transition-all`}
        >
          Go to {label} <ArrowRight size={16} />
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl glass text-lr-white font-semibold text-sm hover:bg-white/8 transition-all border border-white/8"
        >
          Switch Account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-teal text-midnight font-bold text-sm tracking-wide hover:opacity-90 transition-all teal-glow"
      >
        <LogIn size={16} /> Sign In
      </Link>
      <Link
        href="/signup"
        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl glass text-lr-white font-semibold text-sm hover:bg-white/8 transition-all border border-white/8"
      >
        <UserPlus size={16} /> Get Started
      </Link>
    </div>
  );
}

/* ─── Main Landing Page ────────────────────────────────────────── */
export default function LandingPage() {
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [residentModalOpen, setResidentModalOpen] = useState(false);
  const [managerModalOpen, setManagerModalOpen] = useState(false);

  return (
    <main className="relative min-h-screen bg-midnight overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 gradient-mesh opacity-40 pointer-events-none z-0" />
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.22, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-150 h-150 rounded-full blur-[120px] orb-teal"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.18, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-1/3 -right-32 w-125 h-125 rounded-full blur-[100px] orb-gold"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute -bottom-32 left-1/4 w-150 h-150 rounded-full blur-[120px] orb-purple"
        />
      </div>

      {/* ═══ HERO ═══════════════════════════════════════════════════ */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as const }}
          className="max-w-3xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <Image
              src="/liferise_logo.png"
              alt="LifeRise"
              width={80}
              height={80}
              className="h-20 w-auto object-contain mx-auto mb-6"
              style={{ width: 'auto' }}
              priority
            />
            <h1 className="font-heading font-extrabold text-lr-white text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight mb-5">
              LifeRise <span className="text-teal">Solutions</span>
            </h1>
            <p className="text-muted text-lg sm:text-xl max-w-xl mx-auto leading-relaxed">
              The unified service marketplace for modern properties. Connecting residents, vendors,
              and managers in one seamless ecosystem.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <AuthButtons />
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-muted text-xs uppercase tracking-widest">Scroll to explore</span>
            <ChevronDown size={18} className="text-muted" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ VENDOR ECOSYSTEM ═══════════════════════════════════════ */}
      <Section id="vendor">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="order-1"
            >
              <motion.p
                variants={fadeUpItem}
                className="text-gold text-xs font-bold uppercase tracking-[0.2em] mb-4"
              >
                For Service Providers
              </motion.p>
              <motion.h2
                variants={fadeUpItem}
                className="font-heading font-extrabold text-lr-white text-3xl sm:text-4xl lg:text-[2.75rem] leading-tight tracking-tight mb-6"
              >
                Maximize Your Revenue,
                <br />
                <span className="text-gold">Minimize Your Admin.</span>
              </motion.h2>
              <motion.p
                variants={fadeUpItem}
                className="text-muted text-base sm:text-lg leading-relaxed mb-8 max-w-lg"
              >
                The all-in-one vendor portal designed for independent professionals. Track earnings
                in real-time, manage your booking queue with drag-and-drop simplicity, and build
                lasting client relationships.
              </motion.p>

              <motion.div variants={staggerContainer} className="space-y-4 mb-10">
                <motion.div variants={fadeUpItem}>
                  <FeatureItem icon={TrendingUp} text="Real-time earnings tracking & payouts" />
                </motion.div>
                <motion.div variants={fadeUpItem}>
                  <FeatureItem icon={Briefcase} text="Automated booking queue & scheduling" />
                </motion.div>
                <motion.div variants={fadeUpItem}>
                  <FeatureItem icon={Users} text="Built-in client CRM & communication" />
                </motion.div>
              </motion.div>

              <motion.div variants={fadeUpItem} className="flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gold text-midnight font-bold text-sm tracking-wide hover:opacity-90 transition-all gold-glow"
                >
                  Sign In <ArrowRight size={16} />
                </Link>
                <button
                  type="button"
                  onClick={() => setVendorModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl glass border border-white/10 text-lr-white font-semibold text-sm hover:bg-white/8 transition-all"
                >
                  Learn More
                </button>
              </motion.div>
            </motion.div>

            <motion.div
              variants={scaleInItem}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="order-2"
            >
              <VendorPreview />
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ═══ RESIDENT EXPERIENCE ════════════════════════════════════ */}
      <Section>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              variants={scaleInItem}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <ResidentPreview />
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <motion.p
                variants={fadeUpItem}
                className="text-teal text-xs font-bold uppercase tracking-[0.2em] mb-4"
              >
                For Residents
              </motion.p>
              <motion.h2
                variants={fadeUpItem}
                className="font-heading font-extrabold text-lr-white text-3xl sm:text-4xl lg:text-[2.75rem] leading-tight tracking-tight mb-6"
              >
                Luxury Services at
                <br />
                <span className="text-teal">Your Fingertips.</span>
              </motion.h2>
              <motion.p
                variants={fadeUpItem}
                className="text-muted text-base sm:text-lg leading-relaxed mb-8 max-w-lg"
              >
                Discover, book, and manage premium home services from verified providers. From
                wellness to maintenance, your concierge-ready marketplace is just a tap away.
              </motion.p>

              <motion.div variants={staggerContainer} className="space-y-4 mb-10">
                <motion.div variants={fadeUpItem}>
                  <FeatureItem icon={CalendarCheck} text="One-tap concierge bookings" />
                </motion.div>
                <motion.div variants={fadeUpItem}>
                  <FeatureItem icon={ShieldCheck} text="Secure payment processing" />
                </motion.div>
                <motion.div variants={fadeUpItem}>
                  <FeatureItem icon={Star} text="Verified service provider ratings" />
                </motion.div>
              </motion.div>

              <motion.div variants={fadeUpItem} className="flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-teal text-midnight font-bold text-sm tracking-wide hover:opacity-90 transition-all teal-glow"
                >
                  Sign In <ArrowRight size={16} />
                </Link>
                <button
                  type="button"
                  onClick={() => setResidentModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl glass border border-white/10 text-lr-white font-semibold text-sm hover:bg-white/8 transition-all"
                >
                  Learn More
                </button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ═══ PROPERTY MANAGEMENT ════════════════════════════════════ */}
      <Section>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="order-1"
            >
              <motion.p
                variants={fadeUpItem}
                className="text-purple-accent text-xs font-bold uppercase tracking-[0.2em] mb-4"
              >
                For Property Managers
              </motion.p>
              <motion.h2
                variants={fadeUpItem}
                className="font-heading font-extrabold text-lr-white text-3xl sm:text-4xl lg:text-[2.75rem] leading-tight tracking-tight mb-6"
              >
                Total Oversight.
                <br />
                <span className="text-purple-accent">Zero Friction.</span>
              </motion.h2>
              <motion.p
                variants={fadeUpItem}
                className="text-muted text-base sm:text-lg leading-relaxed mb-8 max-w-lg"
              >
                The command center for modern property operations. Monitor vendor compliance,
                analyze facility performance, and keep residents informed — all from one intelligent
                dashboard.
              </motion.p>

              <motion.div variants={staggerContainer} className="space-y-4 mb-10">
                <motion.div variants={fadeUpItem}>
                  <FeatureItem icon={ShieldCheck} text="Vendor compliance monitoring" />
                </motion.div>
                <motion.div variants={fadeUpItem}>
                  <FeatureItem icon={BarChart3} text="Facility performance analytics" />
                </motion.div>
                <motion.div variants={fadeUpItem}>
                  <FeatureItem icon={Activity} text="Resident satisfaction tracking" />
                </motion.div>
              </motion.div>

              <motion.div variants={fadeUpItem} className="flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-purple-accent text-white font-bold text-sm tracking-wide hover:opacity-90 transition-all shadow-[0_0_32px_rgba(129,140,248,0.18)]"
                >
                  Sign In <ArrowRight size={16} />
                </Link>
                <button
                  type="button"
                  onClick={() => setManagerModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl glass border border-white/10 text-lr-white font-semibold text-sm hover:bg-white/8 transition-all"
                >
                  Learn More
                </button>
              </motion.div>
            </motion.div>

            <motion.div
              variants={scaleInItem}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="order-2"
            >
              <ManagerPreview />
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ═══ HOW IT WORKS ═══════════════════════════════════════════ */}
      <Section>
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <motion.p
              variants={fadeUpItem}
              className="text-teal text-xs font-bold uppercase tracking-[0.2em] mb-4"
            >
              Simple & Intuitive
            </motion.p>
            <motion.h2
              variants={fadeUpItem}
              className="font-heading font-extrabold text-lr-white text-3xl sm:text-4xl lg:text-[2.75rem] leading-tight tracking-tight mb-4"
            >
              How It <span className="text-teal">Works</span>
            </motion.h2>
            <motion.p
              variants={fadeUpItem}
              className="text-muted text-base sm:text-lg leading-relaxed max-w-2xl mx-auto"
            >
              Getting started takes less than a minute. Book, manage, and track — all in one place.
            </motion.p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-3 gap-6 lg:gap-8"
          >
            {[
              {
                step: '01',
                icon: Search,
                title: 'Discover',
                desc: 'Browse verified services across wellness, maintenance, and lifestyle categories tailored to your property.',
                color: 'text-teal',
                bg: 'bg-teal/10',
                border: 'border-teal/20',
              },
              {
                step: '02',
                icon: CalendarCheck,
                title: 'Book',
                desc: 'Schedule appointments in seconds with real-time availability, transparent pricing, and secure checkout.',
                color: 'text-gold',
                bg: 'bg-gold/10',
                border: 'border-gold/20',
              },
              {
                step: '03',
                icon: Zap,
                title: 'Enjoy',
                desc: 'Track your service in real-time, communicate with providers, and rate your experience when complete.',
                color: 'text-purple-accent',
                bg: 'bg-purple-accent/10',
                border: 'border-purple-accent/20',
              },
            ].map((item) => (
              <motion.div key={item.step} variants={fadeUpItem}>
                <div className="glass rounded-2xl p-6 lg:p-8 border border-white/6 hover:border-white/10 transition-colors h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        item.bg,
                        item.border,
                        'border'
                      )}
                    >
                      <item.icon size={18} className={item.color} />
                    </div>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-lr-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ═══ FOOTER ═════════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-white/6 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="/liferise_logo.png"
              alt="LifeRise"
              width={32}
              height={32}
              className="h-8 w-auto object-contain"
              style={{ width: 'auto' }}
            />
            <div>
              <p className="font-heading font-bold text-lr-white text-sm">LifeRise Solutions</p>
              <p className="text-muted text-xs">Simplifying Services, Enhancing Lives</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted">
            <Link href="/login" className="hover:text-lr-white transition-colors">
              Login
            </Link>
            <Link href="/signup" className="hover:text-lr-white transition-colors">
              Sign Up
            </Link>
            <Link href="/resident" className="hover:text-lr-white transition-colors">
              Resident Portal
            </Link>
            <Link href="/vendor" className="hover:text-lr-white transition-colors">
              Vendor Portal
            </Link>
            <Link href="/manager" className="hover:text-lr-white transition-colors">
              Manager Portal
            </Link>
            <Link href="/trust-safety" className="hover:text-lr-white transition-colors">
              Trust & Safety
            </Link>
          </div>
        </div>
        <p className="text-center text-muted/60 text-[11px] mt-8">
          © {new Date().getFullYear()} LifeRise Solutions. All rights reserved.
        </p>
      </footer>

      {/* ═══ MODALS ══════════════════════════════════════════════════ */}
      <VendorModal open={vendorModalOpen} onOpenChange={setVendorModalOpen} />
      <ResidentModal open={residentModalOpen} onOpenChange={setResidentModalOpen} />
      <ManagerModal open={managerModalOpen} onOpenChange={setManagerModalOpen} />
    </main>
  );
}
