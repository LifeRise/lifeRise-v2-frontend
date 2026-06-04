"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  TrendingUp,
  Star,
  DollarSign,
  CalendarDays,
  List,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth/hooks";
import { useBookings, useServices } from "@/lib/api/hooks";
import { getGreeting } from "@/lib/utils";

export default function VendorDashboard() {
  const isOnline = useAppStore((s) => s.isOnline);
  const setIsOnline = useAppStore((s) => s.setIsOnline);
  const { profile } = useAuth();
  const { bookings: apiBookings, isLoading: bookingsLoading } = useBookings();
  const { services: apiServices, isLoading: servicesLoading } = useServices();

  const firstName = profile?.first_name ?? "Vendor";
  const isLive = apiBookings.length > 0 || apiServices.length > 0;

  // Compute stats from real data
  const stats = useMemo(() => {
    if (apiBookings.length === 0) {
      return [
        { label: "Jobs", value: "0", color: "text-teal", icon: Briefcase },
        { label: "Week", value: "$0", color: "text-gold", icon: DollarSign },
        { label: "Rating", value: "—", color: "text-purple-accent", icon: Star },
        { label: "Done", value: "—", color: "text-emerald", icon: TrendingUp },
      ];
    }

    const totalEarnings = apiBookings
      .filter((b) => b.status === "Completed" || b.status === "Confirmed")
      .reduce((sum, b) => sum + parseFloat(b.final_price ?? b.price ?? "0"), 0);

    const completedCount = apiBookings.filter((b) => b.status === "Completed").length;
    const totalCount = apiBookings.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return [
      { label: "Jobs", value: String(totalCount), color: "text-teal", icon: Briefcase },
      { label: "Week", value: `$${totalEarnings.toFixed(0)}`, color: "text-gold", icon: DollarSign },
      { label: "Rating", value: "4.9★", color: "text-purple-accent", icon: Star },
      { label: "Done", value: `${completionRate}%`, color: "text-emerald", icon: TrendingUp },
    ];
  }, [apiBookings]);

  // Today's schedule from bookings
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySchedule = useMemo(() => {
    if (apiBookings.length === 0) return [];
    return apiBookings
      .filter((b) => {
        const bDate = b.booking_date?.split("T")[0];
        return bDate === todayStr && (b.status === "Pending" || b.status === "Confirmed");
      })
      .slice(0, 5)
      .map((b) => ({
        time: b.start_time?.slice(0, 5) ?? "—",
        duration: `${b.duration} min`,
        service: `Service #${b.service_id}`,
        client: `Customer #${b.customer_id}`,
        status: b.status === "Confirmed" ? "in-progress" as const : "upcoming" as const,
      }));
  }, [apiBookings, todayStr]);

  // Weekly earnings bars
  const weeklyBars = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    if (apiBookings.length === 0) {
      return days.map((day) => ({ day, h: "10%" }));
    }
    // Group by day of week
    const dayTotals = new Array(7).fill(0);
    apiBookings.forEach((b) => {
      if (!b.booking_date) return;
      const d = new Date(b.booking_date);
      const dayIdx = (d.getDay() + 6) % 7; // Mon=0, Sun=6
      const amount = parseFloat(b.final_price ?? b.price ?? "0");
      dayTotals[dayIdx] += amount;
    });
    const max = Math.max(...dayTotals, 1);
    return days.map((day, i) => ({
      day,
      h: `${Math.max((dayTotals[i] / max) * 100, 5)}%`,
    }));
  }, [apiBookings]);

  const isLoading = bookingsLoading || servicesLoading;

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted text-xs uppercase tracking-wider">
            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
          <h1 className="font-heading font-bold text-lr-white text-xl mt-0.5">
            {getGreeting()}, {firstName} ✦
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="text-[10px] text-teal bg-teal/10 px-2 py-0.5 rounded-full">Live data</span>
          )}
          {!isLive && !isLoading && (
            <span className="text-[10px] text-muted bg-white/5 px-2 py-0.5 rounded-full">Demo data</span>
          )}
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
          {todaySchedule.length > 0 ? (
            todaySchedule.map((s, i) => (
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
            ))
          ) : (
            <GlassCard className="p-4 text-center">
              <p className="text-muted text-xs">No bookings scheduled for today.</p>
            </GlassCard>
          )}
        </div>
      </section>

      {/* Weekly Earnings */}
      <section>
        <SectionHeader title="Weekly Earnings" />
        <GlassCard className="p-4 mt-3">
          <div className="flex items-end gap-1 h-20">
            {weeklyBars.map((d) => (
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
            <p className="text-gold text-sm font-bold font-heading">
              {stats[1]?.value ?? "$0"}
            </p>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
