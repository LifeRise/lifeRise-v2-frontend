"use client";

import { motion } from "framer-motion";
import {
  Briefcase,
  TrendingUp,
  Star,
  DollarSign,
  Clock,
  CalendarDays,
  List,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAppStore } from "@/lib/store";

const stats = [
  { label: "Jobs", value: "4", color: "text-teal", icon: Briefcase },
  { label: "Week", value: "$1,167", color: "text-gold", icon: DollarSign },
  { label: "Rating", value: "4.9★", color: "text-purple-accent", icon: Star },
  { label: "Done", value: "98%", color: "text-emerald", icon: TrendingUp },
];

const schedule = [
  { time: "9:00 AM", duration: "1h", service: "Deep Clean", client: "Sarah M.", status: "in-progress" as const },
  { time: "11:30 AM", duration: "45m", service: "Furniture Assembly", client: "James K.", status: "upcoming" as const },
  { time: "2:00 PM", duration: "1.5h", service: "Home Organization", client: "Maria L.", status: "upcoming" as const },
];

export default function VendorDashboard() {
  const isOnline = useAppStore((s) => s.isOnline);
  const setIsOnline = useAppStore((s) => s.setIsOnline);

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted text-xs uppercase tracking-wider">{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <h1 className="font-heading font-bold text-lr-white text-xl mt-0.5">Good morning, Marcus ✦</h1>
        </div>
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`flex items-center gap-1.5 glass rounded-lg px-3 py-1.5 border border-white/6 transition-all ${
            isOnline ? "border-teal/30" : "border-white/10"
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-teal pulse-teal" : "bg-muted"}`} />
          <span className={`text-xs font-semibold ${isOnline ? "text-teal" : "text-muted"}`}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <GlassCard key={s.label} className="p-3 text-center">
            <s.icon size={14} className={`mx-auto mb-1 ${s.color}`} />
            <p className="text-sm font-bold text-lr-white font-heading">{s.value}</p>
            <p className="text-[10px] text-muted mt-0.5">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "My Schedule", icon: CalendarDays, href: "/vendor/schedule" },
          { label: "Booking Queue", icon: List, href: "/vendor/queue" },
          { label: "Earnings", icon: DollarSign, href: "/vendor/earnings" },
        ].map((a) => (
          <a
            key={a.label}
            href={a.href}
            className="glass rounded-xl p-3 text-center border border-white/5 hover:border-white/10 transition-all"
          >
            <a.icon size={18} className="mx-auto mb-2 text-gold" />
            <p className="text-xs font-medium text-lr-white">{a.label}</p>
          </a>
        ))}
      </div>

      {/* Today's Schedule */}
      <section>
        <SectionHeader title="Today's Schedule" />
        <div className="space-y-2 mt-3">
          {schedule.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 glass-dark rounded-lg px-3 py-2.5"
            >
              <div className="text-center shrink-0 w-12">
                <p className="text-teal text-[10px] font-bold">{s.time}</p>
                <p className="text-muted text-[8px]">{s.duration}</p>
              </div>
              <div className={`w-px h-6 rounded-full ${s.status === "in-progress" ? "bg-teal" : "bg-white/8"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-lr-white text-xs font-semibold truncate">{s.service}</p>
                <p className="text-muted text-[10px]">{s.client}</p>
              </div>
              {s.status === "in-progress" && (
                <span className="text-[8px] text-teal font-bold bg-teal/10 px-1.5 py-0.5 rounded-full shrink-0">
                  Active
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Weekly Earnings */}
      <section>
        <SectionHeader title="Weekly Earnings" />
        <GlassCard className="p-4 mt-3">
          <div className="flex items-end gap-1 h-20">
            {[
              { day: "Mon", h: "20%" },
              { day: "Tue", h: "45%" },
              { day: "Wed", h: "30%" },
              { day: "Thu", h: "60%" },
              { day: "Fri", h: "40%" },
              { day: "Sat", h: "85%" },
              { day: "Sun", h: "55%" },
            ].map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-sm min-h-1 ${d.day === "Sat" ? "bg-gold" : "bg-teal/70"}`}
                  style={{ height: d.h }}
                />
                <span className="text-[8px] text-muted">{d.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
            <p className="text-muted text-xs">Weekly Total</p>
            <p className="text-gold text-sm font-bold font-heading">$1,167</p>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
