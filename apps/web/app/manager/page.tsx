'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CalendarDays,
  Building2,
  Store,
  ArrowRight,
  RotateCcw,
  MapPin,
} from 'lucide-react';
import { useDashboardOverview } from '@/lib/api/hooks';
import { formatDate } from '@/lib/utils';
import { staggerContainerResponsive, fadeUpItem } from '@/lib/animations';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DonutStat } from '@/components/manager/DonutStat';

const kpiConfig = [
  {
    label: 'Total Complex Managers',
    key: 'total_complex_managers' as const,
    icon: Users,
    color: '#00D4AA',
    href: '/manager/complex-managers',
  },
  {
    label: 'Active Customers',
    key: 'active_customers' as const,
    icon: Users,
    color: '#22C55E',
    href: '/manager/customers',
  },
  {
    label: 'Total Service Providers',
    key: 'total_service_providers' as const,
    icon: Briefcase,
    color: '#F5A623',
    href: '/manager/service-providers',
  },
  {
    label: 'Total Bookings',
    key: 'total_bookings' as const,
    icon: CalendarDays,
    color: '#F87171',
    href: '/manager/bookings',
  },
  {
    label: 'Complex Companies',
    key: 'total_complex_companies' as const,
    icon: Building2,
    color: '#64748B',
    href: '/manager/companies?type=complex',
  },
  {
    label: 'Vendor Companies',
    key: 'total_vendor_companies' as const,
    icon: Store,
    color: '#3B82F6',
    href: '/manager/companies?type=vendor',
  },
];

const vendorStatusOrder = [
  { label: 'Pending', key: 'pending' as const },
  { label: 'Accepted', key: 'accepted' as const },
  { label: 'Active', key: 'active' as const },
  { label: 'Completed', key: 'completed' as const },
  { label: 'Cancelled', key: 'cancelled' as const },
  { label: 'Rejected', key: 'rejected' as const },
];

const eventStatusOrder = [
  { label: 'Pending', key: 'pending' as const },
  { label: 'Accepted', key: 'accepted' as const },
  { label: 'Active', key: 'active' as const },
  { label: 'Cancelled', key: 'cancelled' as const },
  { label: 'Rejected', key: 'rejected' as const },
];

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-4 animate-pulse">
      <div className="h-4 w-24 bg-white/5 rounded mb-4" />
      <div className="h-8 w-16 bg-white/5 rounded mb-2" />
      <div className="h-3 w-12 bg-white/5 rounded" />
    </div>
  );
}

function SkeletonPanel({ rows = 3 }: { rows?: number }) {
  return (
    <div className="glass rounded-2xl p-4 animate-pulse space-y-3">
      <div className="h-4 w-32 bg-white/5 rounded" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 w-full bg-white/5 rounded" />
      ))}
    </div>
  );
}

export default function ManagerDashboard() {
  const { data, isLoading, error, refresh } = useDashboardOverview();

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
            <div className="h-10 w-64 bg-white/5 rounded animate-pulse" />
            <div className="h-3 w-40 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="hidden sm:block h-10 w-48 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SkeletonPanel rows={3} />
          <SkeletonPanel rows={3} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SkeletonPanel rows={4} />
          <SkeletonPanel rows={4} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonPanel rows={3} />
          <SkeletonPanel rows={3} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
        <EmptyState
          icon={<RotateCcw size={24} className="text-muted" />}
          title="Dashboard unavailable"
          description={error ?? 'Unable to load dashboard data.'}
          action={
            <button
              type="button"
              onClick={refresh}
              className="px-4 py-2 rounded-xl bg-purple-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  const vendorMax = Math.max(
    1,
    ...vendorStatusOrder.map((s) => data.vendor_booking_stats[s.key] ?? 0)
  );
  const eventMax = Math.max(
    1,
    ...eventStatusOrder.map((s) => data.event_booking_stats[s.key] ?? 0)
  );
  const locationMax = Math.max(1, ...(data.top_locations.map((l) => l.booking_count) ?? [0]));

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-8"
      >
        <div>
          <p className="text-muted text-sm mb-1 flex items-center gap-1.5">
            <LayoutDashboard size={12} className="text-purple-accent" />
            {formatDate()}
          </p>
          <h1 className="font-heading font-extrabold text-lr-white text-3xl sm:text-4xl">
            Riverside Commons
          </h1>
          <p className="text-muted text-sm mt-1">Command Center · Jersey City, NJ</p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-xs text-muted">
            Last updated · {formatDate(new Date(data.generated_at))}
          </span>
          <div className="flex items-center gap-2 glass rounded-xl px-4 py-2.5">
            <div className="w-2 h-2 rounded-full bg-purple-accent pulse-teal" />
            <span className="text-sm text-lr-white font-medium">All systems operational</span>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={staggerContainerResponsive()}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8"
      >
        {kpiConfig.map((kpi) => {
          const Icon = kpi.icon;
          const value = data.kpis[kpi.key];
          return (
            <motion.div key={kpi.key} variants={fadeUpItem}>
              <GlassCard hover className="p-4 h-full">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-muted text-xs font-medium">{kpi.label}</p>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${kpi.color}18` }}
                  >
                    <Icon size={15} style={{ color: kpi.color }} />
                  </div>
                </div>
                <p className="font-heading font-bold text-4xl text-lr-white">{value}</p>
                <Link
                  href={kpi.href}
                  className="inline-flex items-center gap-1 text-xs font-medium mt-2 hover:underline"
                  style={{ color: kpi.color }}
                >
                  More info <ArrowRight size={11} />
                </Link>
              </GlassCard>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Booking Stats Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <GlassCard>
          <div className="p-4">
            <SectionHeader title="Customers / Residents to Vendor Booking Stats" className="mb-4" />
            <div className="grid grid-cols-3 gap-4">
              {vendorStatusOrder.map((s) => (
                <DonutStat
                  key={s.key}
                  label={s.label}
                  value={data.vendor_booking_stats[s.key] ?? 0}
                  max={vendorMax}
                  accent="#818CF8"
                />
              ))}
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-4">
            <SectionHeader title="Group Events Booking Stats" className="mb-4" />
            <div className="grid grid-cols-3 gap-4">
              {eventStatusOrder.map((s) => (
                <DonutStat
                  key={s.key}
                  label={s.label}
                  value={data.event_booking_stats[s.key] ?? 0}
                  max={eventMax}
                  accent="#F5A623"
                />
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Lists Row 1: Popular Services + Most Booked Vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <GlassCard>
          <div className="p-4">
            <SectionHeader title="Popular Services" className="mb-4" />
            {data.popular_services.length === 0 ? (
              <EmptyState
                title="No services yet"
                description="Services will appear once residents start booking."
              />
            ) : (
              <div className="space-y-2">
                {data.popular_services.map((svc) => (
                  <div
                    key={svc.service_id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm text-lr-white truncate">{svc.service_name}</span>
                    <span className="text-sm font-semibold text-purple-accent">
                      {svc.booking_count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-4">
            <SectionHeader title="Most Booked Vendors" className="mb-4" />
            {data.most_booked_vendors.length === 0 ? (
              <EmptyState title="No vendors yet" description="Vendor bookings will appear here." />
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  <span>Vendor</span>
                  <span>Company</span>
                  <span className="text-right">Bookings</span>
                </div>
                {data.most_booked_vendors.map((v) => (
                  <div
                    key={v.vendor_id}
                    className="grid grid-cols-3 gap-2 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors items-center"
                  >
                    <span className="text-sm text-lr-white truncate">{v.vendor_name}</span>
                    <span className="text-sm text-muted truncate">{v.company_name ?? '—'}</span>
                    <span className="text-sm font-semibold text-purple-accent text-right">
                      {v.booking_count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Lists Row 2: Upcoming Events + Top Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <div className="p-4">
            <SectionHeader title="Upcoming Events" className="mb-4" />
            {data.upcoming_events.length === 0 ? (
              <EmptyState
                title="No upcoming events"
                description="Scheduled events will appear here."
              />
            ) : (
              <div className="space-y-2">
                {data.upcoming_events.map((evt) => (
                  <div
                    key={evt.event_id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-lr-white truncate">{evt.title}</p>
                      <p className="text-xs text-muted">
                        {evt.location ?? 'TBA'} · {formatDate(new Date(evt.start_at))}
                      </p>
                    </div>
                    <span className="shrink-0 ml-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-accent/15 text-purple-accent">
                      {evt.responses}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-4">
            <SectionHeader title="Top Locations" className="mb-4" />
            {data.top_locations.length === 0 ? (
              <EmptyState
                icon={<MapPin size={24} className="text-muted" />}
                title="No location data"
                description="Booking locations will appear once residents add addresses."
              />
            ) : (
              <div className="space-y-3">
                {data.top_locations.map((loc) => (
                  <div key={loc.label} className="px-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-lr-white">{loc.label}</span>
                      <span className="text-sm font-semibold text-purple-accent">
                        {loc.booking_count}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-accent"
                        style={{
                          width: `${Math.round((loc.booking_count / locationMax) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
