"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Users, Briefcase, CalendarDays, TrendingUp, TrendingDown, Minus, Send, AlertTriangle, Info, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { vendorLeaderboard, announcements } from "@/lib/mock-data";
import { cn, formatDate, kpiColorClasses } from "@/lib/utils";
import dynamic from "next/dynamic";
const PropertyMap = dynamic(() => import("@/components/manager/PropertyMap"), { ssr: false, loading: () => <div className="h-64 glass rounded-xl flex items-center justify-center text-muted text-sm">Loading map…</div> });
const EngagementChart = dynamic(() => import("@/components/manager/EngagementChart"), { ssr: false, loading: () => <div className="h-52 flex items-center justify-center text-muted text-sm">Loading…</div> });

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const trendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus };
const trendColor = { up: "#00D4AA", down: "#F87171", stable: "#94A3B8" };

export default function ManagerDashboard() {
  const [annTitle, setAnnTitle] = useState("");
  const [sent, setSent] = useState(false);

  function sendAnnouncement() {
    if (!annTitle.trim()) return;
    setSent(true);
    setTimeout(() => { setSent(false); setAnnTitle(""); }, 2500);
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-8">
        <div>
          <p className="text-muted text-sm mb-1 flex items-center gap-1.5"><Sparkles size={12} className="text-purple-accent" />{formatDate()}</p>
          <h1 className="font-heading font-extrabold text-lr-white text-3xl sm:text-4xl">Riverside Commons ✦</h1>
          <p className="text-muted text-sm mt-1">Command Center · Jersey City, NJ</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 glass rounded-xl px-4 py-2.5">
          <div className="w-2 h-2 rounded-full bg-purple-accent pulse-teal" />
          <span className="text-sm text-lr-white font-medium">All systems operational</span>
        </div>
      </motion.div>

      {/* KPI Strip */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total Residents", value: "247", icon: Users, color: "purple", delta: "+4 this month" },
          { label: "Active Vendors", value: "18", icon: Briefcase, color: "teal", delta: "+2 this week" },
          { label: "Bookings / Month", value: "143", icon: CalendarDays, color: "gold", delta: "+18% ↑" },
          { label: "Satisfaction", value: "94%", icon: TrendingUp, color: "emerald", delta: "Excellent" },
        ].map((stat) => {
          const c = kpiColorClasses[stat.color];
          return (
            <motion.div key={stat.label} variants={item} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-muted text-xs font-medium">{stat.label}</p>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", c.bg)}>
                  <stat.icon size={15} className={c.text} />
                </div>
              </div>
              <p className="font-heading font-bold text-2xl text-lr-white">{stat.value}</p>
              <p className={cn("text-[10px] mt-1", c.text)}>{stat.delta}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Map + Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <div className="lg:col-span-3">
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-heading font-bold text-lr-white text-xl">Property Activity</h2>
            <Link href="/manager/residents" className="text-xs text-purple-accent font-medium flex items-center gap-1 hover:underline">
              Residents <ArrowRight size={11} />
            </Link>
          </div>
          <PropertyMap />
        </div>
        <div className="lg:col-span-2">
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-heading font-bold text-lr-white text-xl">Service Engagement</h2>
            <Link href="/manager/analytics" className="text-xs text-purple-accent font-medium flex items-center gap-1 hover:underline">
              Analytics <ArrowRight size={11} />
            </Link>
          </div>
          <div className="glass rounded-2xl p-4">
            <EngagementChart />
          </div>
        </div>
      </div>

      {/* Leaderboard + Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Vendor Leaderboard */}
        <div>
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-heading font-bold text-lr-white text-xl">Vendor Leaderboard</h2>
            <Link href="/manager/vendors" className="text-xs text-purple-accent font-medium flex items-center gap-1 hover:underline">
              Manage <ArrowRight size={11} />
            </Link>
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-white/[0.07] text-muted text-[10px] font-semibold uppercase tracking-wider">
              <span className="col-span-1">#</span>
              <span className="col-span-4">Vendor</span>
              <span className="col-span-2 text-center">Jobs</span>
              <span className="col-span-2 text-center">Rating</span>
              <span className="col-span-2 text-right">Earned</span>
              <span className="col-span-1 text-center">↕</span>
            </div>
            {vendorLeaderboard.map((v, i) => {
              const TrendIcon = trendIcon[v.trend as keyof typeof trendIcon];
              const tc = trendColor[v.trend as keyof typeof trendColor];
              return (
                <motion.div key={v.rank} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/4 items-center hover:bg-white/2 transition-colors">
                  <span className={cn("col-span-1 font-bold text-sm", v.rank === 1 ? "text-gold" : "text-muted")}>
                    {v.rank === 1 ? "🥇" : v.rank === 2 ? "🥈" : v.rank === 3 ? "🥉" : v.rank}
                  </span>
                  <div className="col-span-4">
                    <p className="text-lr-white text-sm font-semibold truncate">{v.name}</p>
                    <p className="text-muted text-[10px]">{v.specialty}</p>
                  </div>
                  <span className="col-span-2 text-center text-muted text-sm">{v.bookings}</span>
                  <span className="col-span-2 text-center text-gold text-sm font-semibold">{v.rating}★</span>
                  <span className="col-span-2 text-right text-teal text-sm font-semibold">{v.earnings}</span>
                  <span className="col-span-1 flex justify-center"><TrendIcon size={13} style={{ color: tc }} /></span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Announcement Composer + Feed */}
        <div>
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-heading font-bold text-lr-white text-xl">Announcements</h2>
            <Link href="/manager/announcements" className="text-xs text-purple-accent font-medium flex items-center gap-1 hover:underline">
              All <ArrowRight size={11} />
            </Link>
          </div>

          {/* Quick composer */}
          <div className="glass rounded-2xl p-4 mb-4">
            <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Quick announcement title…"
              className="w-full bg-midnight/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-purple-accent/50 transition-colors mb-3" />
            <div className="flex items-center justify-between">
              <button type="button" onClick={sendAnnouncement}
                className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95", sent ? "bg-teal/20 text-teal" : "bg-purple-accent text-white")}>
                <Send size={14} />{sent ? "Sent ✓" : "Send"}
              </button>
              <Link href="/manager/announcements" className="text-xs text-muted hover:text-lr-white transition-colors">
                Open full composer →
              </Link>
            </div>
          </div>

          {/* Recent announcements */}
          <div className="space-y-2">
            {announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="glass rounded-xl p-3 flex items-start gap-3">
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", a.urgent ? "bg-red-400/15" : "bg-purple-accent/15")}>
                  {a.urgent ? <AlertTriangle size={13} className="text-red-400" /> : <Info size={13} className="text-purple-accent" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lr-white text-xs font-semibold truncate">{a.title}</p>
                  <p className="text-muted text-[10px] mt-0.5 line-clamp-1">{a.body}</p>
                </div>
                <span className="text-muted text-[10px] shrink-0">{a.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
