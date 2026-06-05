'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  Cell,
} from 'recharts';
const analyticsTimeSeries: { label: string; value: number }[] = [];
const analyticsTimeSeries7d: { label: string; value: number }[] = [];
const analyticsTimeSeries90d: { label: string; value: number }[] = [];
const categoryRevenue: { name: string; revenue: number; color: string }[] = [];
const vendorLeaderboard: {
  name: string;
  initials?: string;
  gradient?: string;
  specialty?: string;
  earnings?: string;
  completionRate?: string;
  bookings: number;
  revenue: number;
}[] = [];
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { staggerContainerResponsive, fadeUpItem } from '@/lib/animations';
import { cn } from '@/lib/utils';

type Range = '7d' | '30d' | '90d';

const kpiByRange: Record<
  Range,
  Array<{ label: string; value: string; delta: string; up: boolean }>
> = {
  '7d': [
    { label: 'Total Residents', value: '247', delta: '+1', up: true },
    { label: 'Bookings', value: '65', delta: '+8%', up: true },
    { label: 'Revenue', value: '$5.5K', delta: '+5%', up: true },
    { label: 'Complaints', value: '1', delta: '-1', up: false },
  ],
  '30d': [
    { label: 'Total Residents', value: '247', delta: '+4', up: true },
    { label: 'Bookings', value: '143', delta: '+18%', up: true },
    { label: 'Revenue', value: '$37K', delta: '+12%', up: true },
    { label: 'Complaints', value: '3', delta: '-2', up: false },
  ],
  '90d': [
    { label: 'Total Residents', value: '247', delta: '+23', up: true },
    { label: 'Bookings', value: '543', delta: '+31%', up: true },
    { label: 'Revenue', value: '$91K', delta: '+22%', up: true },
    { label: 'Complaints', value: '14', delta: '+3', up: true },
  ],
};

const timeSeriesByRange = {
  '7d': analyticsTimeSeries7d,
  '30d': analyticsTimeSeries,
  '90d': analyticsTimeSeries90d,
};

function ChartWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);
  if (!mounted)
    return (
      <div className="h-56 flex items-center justify-center text-muted text-sm">Loading chart…</div>
    );
  return <div className="h-56 min-h-56">{children}</div>;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl px-3 py-2 text-xs">
        <p className="text-muted mb-0.5">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="font-bold" style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('30d');

  const kpis = useMemo(() => kpiByRange[range], [range]);
  const timeSeries = useMemo(() => timeSeriesByRange[range], [range]);
  const topVendors = useMemo(() => {
    const maxBookings = vendorLeaderboard[0]?.bookings ?? 1;
    return vendorLeaderboard.slice(0, 5).map((v) => ({
      ...v,
      fill: Math.round((v.bookings / maxBookings) * 100),
    }));
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <SectionHeader title="Analytics" subtitle="Deep insights into complex operations" />
        <div className="flex items-center gap-1 bg-midnight/60 rounded-lg p-1">
          {(['7d', '30d', '90d'] as Range[]).map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                range === r ? 'bg-purple-accent text-white' : 'text-muted hover:text-lr-white'
              )}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        variants={staggerContainerResponsive(0.06)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
      >
        {/* KPIs — range-aware */}
        <motion.div variants={fadeUpItem} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {kpis.map((kpi) => (
            <GlassCard key={kpi.label} className="p-4">
              <p className="text-muted text-xs font-medium mb-2">{kpi.label}</p>
              <p className="font-heading font-bold text-2xl text-lr-white">{kpi.value}</p>
              <p
                className={cn(
                  'text-[10px] mt-1 font-medium',
                  kpi.up ? 'text-teal' : 'text-red-400'
                )}
              >
                {kpi.delta} {kpi.up ? '↑' : '↓'} vs last period
              </p>
            </GlassCard>
          ))}
        </motion.div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <motion.div variants={fadeUpItem}>
            <GlassCard className="p-5">
              <h3 className="font-heading text-sm font-semibold text-lr-white mb-4">
                Bookings & New Residents
              </h3>
              <ChartWrapper>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="bookings"
                      stroke="#00D4AA"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: '#00D4AA' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="newResidents"
                      stroke="#818CF8"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: '#818CF8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </GlassCard>
          </motion.div>

          <motion.div variants={fadeUpItem}>
            <GlassCard className="p-5">
              <h3 className="font-heading text-sm font-semibold text-lr-white mb-4">
                Revenue by Category
              </h3>
              <ChartWrapper>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryRevenue}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="category"
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                      {categoryRevenue.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </GlassCard>
          </motion.div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <motion.div variants={fadeUpItem}>
            <GlassCard className="p-5">
              <h3 className="font-heading text-sm font-semibold text-lr-white mb-4">
                Revenue Trend
              </h3>
              <ChartWrapper>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818CF8" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#818CF8"
                      strokeWidth={2}
                      fill="url(#revGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </GlassCard>
          </motion.div>

          <motion.div variants={fadeUpItem}>
            <GlassCard className="p-5">
              <h3 className="font-heading text-sm font-semibold text-lr-white mb-4">
                Complaints Trend
              </h3>
              <ChartWrapper>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F87171" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#F87171" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="complaints"
                      stroke="#F87171"
                      strokeWidth={2}
                      fill="url(#compGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </GlassCard>
          </motion.div>
        </div>

        {/* Top Performers — from enriched leaderboard */}
        <motion.div variants={fadeUpItem}>
          <GlassCard className="p-5">
            <h3 className="font-heading text-sm font-semibold text-lr-white mb-1">
              Top Vendors This Period
            </h3>
            <p className="text-muted text-[11px] mb-5">
              Ranked by booking volume ·{' '}
              {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </p>
            <div className="space-y-4">
              {topVendors.map((v, i) => (
                <div key={v.name} className="flex items-center gap-3">
                  {/* Gradient avatar */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full bg-linear-to-br flex items-center justify-center text-[10px] font-bold text-white font-heading shrink-0',
                      v.gradient ?? 'from-slate-600 to-slate-700'
                    )}
                  >
                    {v.initials ?? v.name.slice(0, 2)}
                  </div>
                  <span className="text-[10px] text-muted w-3 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-lr-white font-medium truncate">{v.name}</span>
                        <span className="text-[10px] text-muted shrink-0">{v.specialty}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-muted">{v.bookings} jobs</span>
                        <span className="text-xs text-teal font-semibold">{v.earnings}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-mid overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-purple-accent"
                          initial={{ width: 0 }}
                          animate={{ width: `${v.fill}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                        />
                      </div>
                      {v.completionRate !== undefined && (
                        <span className="text-[10px] text-teal shrink-0">{v.completionRate}%</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
