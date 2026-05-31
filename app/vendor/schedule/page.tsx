"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Clock, User, MapPin } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth/hooks";
import { useBookings } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  Pending: { label: "Pending", color: "text-gold", bg: "bg-gold/10" },
  Confirmed: { label: "Confirmed", color: "text-teal", bg: "bg-teal/10" },
  Completed: { label: "Completed", color: "text-purple-accent", bg: "bg-purple-accent/10" },
  Cancelled: { label: "Cancelled", color: "text-rose", bg: "bg-rose/10" },
};

export default function VendorSchedulePage() {
  const { profile } = useAuth();
  const { bookings: apiBookings, isLoading } = useBookings();
  const isLive = apiBookings.length > 0;

  // Group bookings by date
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    apiBookings.forEach((b: any) => {
      const date = b.booking_date?.split("T")[0] ?? "Unknown";
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(b);
    });
    // Sort dates
    return new Map([...map.entries()].sort());
  }, [apiBookings]);

  const dates = Array.from(grouped.keys());

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-lr-white text-xl flex items-center gap-2">
          <CalendarDays size={20} className="text-gold" /> My Schedule
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
          icon={<CalendarDays className="h-6 w-6 text-muted" />}
          title="No scheduled bookings"
          description="Your upcoming appointments will appear here."
        />
      ) : (
        <div className="space-y-6">
          {dates.map((date) => {
            const dayBookings = grouped.get(date)!;
            const isToday = date === new Date().toISOString().split("T")[0];
            const displayDate = isToday
              ? "Today"
              : new Date(date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                });

            return (
              <div key={date}>
                <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
                  {displayDate}
                  {isToday && <span className="text-teal ml-2">●</span>}
                </h2>
                <div className="space-y-2">
                  {dayBookings.map((b: any, i: number) => {
                    const cfg = statusConfig[b.status] ?? statusConfig.Pending;
                    return (
                      <motion.div
                        key={b.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <GlassCard className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="text-center shrink-0 w-14">
                              <p className="text-gold text-[10px] font-bold">
                                {b.start_time?.slice(0, 5) ?? "—"}
                              </p>
                              <p className="text-muted text-[8px]">{b.duration} min</p>
                            </div>
                            <div className="w-px h-8 bg-white/8" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-lr-white text-xs font-semibold truncate">
                                  Service #{b.service_id}
                                </p>
                                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", cfg.bg, cfg.color)}>
                                  {cfg.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted">
                                <span className="flex items-center gap-0.5">
                                  <User size={8} /> Customer #{b.customer_id}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <MapPin size={8} /> On-site
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-gold text-xs font-bold">
                                ${parseFloat(b.final_price ?? b.price ?? "0").toFixed(0)}
                              </p>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
