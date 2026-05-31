"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Clock, Briefcase, CheckCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAuth } from "@/lib/auth/hooks";
import { useBookings } from "@/lib/api/hooks";

export default function VendorEarningsPage() {
  const { profile } = useAuth();
  const { bookings: apiBookings, isLoading } = useBookings();
  const isLive = apiBookings.length > 0;

  const stats = useMemo(() => {
    if (apiBookings.length === 0) {
      return {
        totalEarnings: 0,
        weeklyTotal: 0,
        completedJobs: 0,
        pendingJobs: 0,
        avgJobValue: 0,
        platformFee: 0.12,
      };
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalEarnings = apiBookings
      .filter((b: any) => b.status === "Completed")
      .reduce((sum: number, b: any) => sum + parseFloat(b.final_price ?? b.price ?? "0"), 0);

    const weeklyTotal = apiBookings
      .filter((b: any) => {
        if (b.status !== "Completed" || !b.booking_date) return false;
        const d = new Date(b.booking_date);
        return d >= weekAgo;
      })
      .reduce((sum: number, b: any) => sum + parseFloat(b.final_price ?? b.price ?? "0"), 0);

    const completedJobs = apiBookings.filter((b: any) => b.status === "Completed").length;
    const pendingJobs = apiBookings.filter((b: any) => b.status === "Pending" || b.status === "Confirmed").length;
    const avgJobValue = completedJobs > 0 ? totalEarnings / completedJobs : 0;

    return { totalEarnings, weeklyTotal, completedJobs, pendingJobs, avgJobValue, platformFee: 0.12 };
  }, [apiBookings]);

  const weeklyBars = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    if (apiBookings.length === 0) {
      return days.map((day) => ({ day, h: "10%", amount: 0 }));
    }
    const dayTotals = new Array(7).fill(0);
    apiBookings.forEach((b: any) => {
      if (!b.booking_date || b.status !== "Completed") return;
      const d = new Date(b.booking_date);
      const dayIdx = (d.getDay() + 6) % 7;
      const amount = parseFloat(b.final_price ?? b.price ?? "0");
      dayTotals[dayIdx] += amount;
    });
    const max = Math.max(...dayTotals, 1);
    return days.map((day, i) => ({
      day,
      h: `${Math.max((dayTotals[i] / max) * 100, 5)}%`,
      amount: dayTotals[i],
    }));
  }, [apiBookings]);

  const recentJobs = useMemo(() => {
    return apiBookings
      .filter((b: any) => b.status === "Completed")
      .slice(0, 5)
      .map((b: any) => ({
        id: b.id,
        service: `Service #${b.service_id}`,
        date: b.booking_date?.split("T")[0] ?? "—",
        amount: parseFloat(b.final_price ?? b.price ?? "0"),
        commission: parseFloat(b.final_price ?? b.price ?? "0") * 0.12,
      }));
  }, [apiBookings]);

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-lr-white text-xl flex items-center gap-2">
          <DollarSign size={20} className="text-gold" /> Earnings
        </h1>
        {isLive && (
          <span className="text-[10px] text-teal bg-teal/10 px-2 py-0.5 rounded-full">Live data</span>
        )}
        {!isLive && !isLoading && (
          <span className="text-[10px] text-muted bg-white/5 px-2 py-0.5 rounded-full">Demo data</span>
        )}
      </div>

      {apiBookings.length === 0 && !isLoading ? (
        <EmptyState
          icon={<DollarSign className="h-6 w-6 text-muted" />}
          title="No earnings yet"
          description="Complete bookings to start earning."
        />
      ) : (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Earnings", value: `$${stats.totalEarnings.toFixed(0)}`, icon: DollarSign, color: "text-gold" },
              { label: "This Week", value: `$${stats.weeklyTotal.toFixed(0)}`, icon: TrendingUp, color: "text-teal" },
              { label: "Completed", value: String(stats.completedJobs), icon: CheckCircle, color: "text-purple-accent" },
              { label: "Pending", value: String(stats.pendingJobs), icon: Clock, color: "text-gold" },
            ].map((s) => (
              <GlassCard key={s.label} className="p-3 text-center">
                <s.icon size={14} className={`mx-auto mb-1 ${s.color}`} />
                <p className="text-sm font-bold text-lr-white font-heading">{s.value}</p>
                <p className="text-[10px] text-muted mt-0.5">{s.label}</p>
              </GlassCard>
            ))}
          </div>

          {/* Weekly Chart */}
          <section>
            <SectionHeader title="Weekly Earnings" />
            <GlassCard className="p-4 mt-3">
              <div className="flex items-end gap-1 h-24">
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
                <p className="text-gold text-sm font-bold font-heading">${stats.weeklyTotal.toFixed(0)}</p>
              </div>
            </GlassCard>
          </section>

          {/* Recent Jobs */}
          <section>
            <SectionHeader title="Recent Jobs" />
            <div className="space-y-2 mt-3">
              {recentJobs.length > 0 ? (
                recentJobs.map((job, i) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <GlassCard className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lr-white text-xs font-semibold">{job.service}</p>
                          <p className="text-muted text-[10px]">{job.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gold text-xs font-bold">${job.amount.toFixed(0)}</p>
                          <p className="text-muted text-[9px]">Fee: ${job.commission.toFixed(0)}</p>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))
              ) : (
                <GlassCard className="p-4 text-center">
                  <p className="text-muted text-xs">No completed jobs yet.</p>
                </GlassCard>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
