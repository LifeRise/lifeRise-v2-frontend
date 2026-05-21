"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
} from "recharts";
import {
  analyticsTimeSeries,
  categoryRevenue,
} from "@/lib/mock-data";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { staggerContainerResponsive, fadeUpItem } from "@/lib/animations";
import { cn } from "@/lib/utils";

type Range = "7d" | "30d" | "90d";

function ChartWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t); }, []);
  if (!mounted) return <div className="h-56 flex items-center justify-center text-muted text-sm">Loading chart…</div>;
  return <div className="h-56 min-h-56">{children}</div>;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
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
  const [range, setRange] = useState<Range>("30d");

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <SectionHeader title="Analytics" subtitle="Deep insights into complex operations" />
        <div className="flex items-center gap-1 bg-midnight/60 rounded-lg p-1">
          {(["7d", "30d", "90d"] as Range[]).map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                range === r
                  ? "bg-purple-accent text-white"
                  : "text-muted hover:text-lr-white"
              )}
            >
              {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      <motion.div variants={staggerContainerResponsive(0.06)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}>
        {/* KPIs */}
        <motion.div variants={fadeUpItem} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Residents", value: "247", delta: "+4", up: true },
            { label: "Bookings", value: "143", delta: "+18%", up: true },
            { label: "Revenue", value: "$37K", delta: "+12%", up: true },
            { label: "Complaints", value: "3", delta: "-2", up: false },
          ].map((kpi) => (
            <GlassCard key={kpi.label} className="p-4">
              <p className="text-muted text-xs font-medium mb-2">{kpi.label}</p>
              <p className="font-heading font-bold text-2xl text-lr-white">{kpi.value}</p>
              <p
                className={cn(
                  "text-[10px] mt-1 font-medium",
                  kpi.up ? "text-teal" : "text-red-400"
                )}
              >
                {kpi.delta} {kpi.up ? "↑" : "↓"} vs last period
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
                  <LineChart data={analyticsTimeSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="bookings" stroke="#00D4AA" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#00D4AA" }} />
                    <Line type="monotone" dataKey="newResidents" stroke="#818CF8" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#818CF8" }} />
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
                  <BarChart data={categoryRevenue} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="category" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
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
                Service Mix
              </h3>
              <ChartWrapper>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsTimeSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818CF8" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#818CF8" strokeWidth={2} fill="url(#revGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </GlassCard>
          </motion.div>

          <motion.div variants={fadeUpItem}>
            <GlassCard className="p-5">
              <h3 className="font-heading text-sm font-semibold text-lr-white mb-4">
                Complaints vs Resolutions
              </h3>
              <ChartWrapper>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsTimeSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F87171" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#F87171" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="complaints" stroke="#F87171" strokeWidth={2} fill="url(#compGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </GlassCard>
          </motion.div>
        </div>

        {/* Top Performers */}
        <motion.div variants={fadeUpItem}>
          <GlassCard className="p-5">
            <h3 className="font-heading text-sm font-semibold text-lr-white mb-4">
              Top Vendors This Month
            </h3>
            <div className="space-y-3">
              {[
                { name: "Maya Chen", bookings: 47, revenue: "$3,245", fill: 85 },
                { name: "Carlos Rivera", bookings: 38, revenue: "$2,890", fill: 72 },
                { name: "Aria Johnson", bookings: 35, revenue: "$2,100", fill: 65 },
                { name: "David Kim", bookings: 29, revenue: "$1,950", fill: 55 },
                { name: "Luna Park", bookings: 22, revenue: "$1,320", fill: 42 },
              ].map((v, i) => (
                <div key={v.name} className="flex items-center gap-3">
                  <span className="text-xs text-muted w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-lr-white font-medium">{v.name}</span>
                      <span className="text-xs text-teal font-semibold">{v.revenue}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-mid overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-purple-accent"
                        initial={{ width: 0 }}
                        animate={{ width: `${v.fill}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                      />
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
