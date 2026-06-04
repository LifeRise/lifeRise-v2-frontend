"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Star, Clock, MapPin, Calendar, CheckCircle, TrendingUp, Activity, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { vendors as mockVendors, categories, events, residentBookings as mockResidentBookings } from "@/lib/mock-data";
import { cn, getGreeting, formatDate, kpiColorClasses } from "@/lib/utils";
import { useActiveCategory, useSetActiveCategory } from "@/lib/store";
import { useServices, useBookings } from "@/lib/api/hooks";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const statusConfig = {
  confirmed: { label: "Confirmed", color: "#00D4AA", bg: "rgba(0,212,170,0.12)" },
  pending: { label: "Pending", color: "#F5A623", bg: "rgba(245,166,35,0.12)" },
  completed: { label: "Completed", color: "#818CF8", bg: "rgba(129,140,248,0.12)" },
};

export default function ResidentDashboard() {
  const activeCategory = useActiveCategory();
  const setActiveCategory = useSetActiveCategory();
  const [bookedId, setBookedId] = useState<string | null>(null);

  const { vendors: apiVendors } = useServices();
  const { residentBookings: apiBookings } = useBookings();

  // Use API data when available, fall back to mock data
  const vendors = apiVendors.length > 0 ? apiVendors : mockVendors;
  const residentBookings = apiBookings.length > 0 ? apiBookings : mockResidentBookings;

  const filteredVendors = activeCategory === "All" ? vendors : vendors.filter((v) => v.category === activeCategory);

  // Derive KPIs from real booking data when available
  const activeBookingsCount = apiBookings.filter((b) => b.status === "confirmed").length;
  const pendingCount = apiBookings.filter((b) => b.status === "pending").length;
  const completedCount = apiBookings.filter((b) => b.status === "completed").length;
  const totalSpent = apiBookings.reduce((sum, b) => {
    const val = parseFloat(b.amount.replace(/[^0-9.]/g, "")) || 0;
    return sum + val;
  }, 0);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-8">
        <div>
          <p className="text-muted text-sm mb-1 flex items-center gap-1.5"><Sparkles size={12} className="text-teal" />{formatDate()}</p>
          <h1 className="font-heading font-extrabold text-lr-white text-3xl sm:text-4xl">{getGreeting()}, Sarah ✦</h1>
          <p className="text-muted text-sm mt-1">Riverside Commons · Jersey City, NJ</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 glass rounded-xl px-4 py-2.5">
          <div className="w-2 h-2 rounded-full bg-teal pulse-teal" />
          <span className="text-sm text-lr-white font-medium">18 vendors active</span>
        </div>
      </motion.div>

      {/* KPI Strip */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Active Bookings", value: apiBookings.length > 0 ? String(activeBookingsCount) : "3", icon: Activity, color: "teal" },
          { label: "Pending", value: apiBookings.length > 0 ? String(pendingCount) : "1", icon: Clock, color: "gold" },
          { label: "Completed", value: apiBookings.length > 0 ? String(completedCount) : "12", icon: CheckCircle, color: "purple" },
          { label: "Total Spent", value: apiBookings.length > 0 ? `$${totalSpent.toFixed(0)}` : "$840", icon: TrendingUp, color: "rose" },
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
            </motion.div>
          );
        })}
      </motion.div>

      {/* Category Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={activeCategory === cat
              ? { background: "#00D4AA", color: "#0A0F1E" }
              : { background: "rgba(255,255,255,0.06)", color: "#94A3B8" }}>
            {cat}
          </button>
        ))}
      </div>

      <div className="flex items-end justify-between mb-4">
        <h2 className="font-heading font-bold text-lr-white text-xl">Available Services</h2>
        <Link href="/resident/services" className="text-xs text-teal font-medium flex items-center gap-1 hover:underline">
          View All <ArrowRight size={11} />
        </Link>
      </div>
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {filteredVendors.map((v) => (
          <motion.div key={v.id} variants={item} whileHover={{ y: -4, boxShadow: "0 0 30px rgba(0,212,170,0.12)" }}
            className="glass rounded-2xl overflow-hidden cursor-pointer group transition-all">
            {/* Card top gradient */}
            <div className={`bg-linear-to-br ${v.gradient} h-32 flex items-center justify-center relative`}>
              <span className="text-5xl select-none">{v.available ? "✦" : "○"}</span>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-white font-heading">{v.initials}</span>
              </div>
              {v.badge && (
                <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-midnight/60 text-teal border border-teal/30">{v.badge}</span>
              )}
              {!v.available && (
                <div className="absolute inset-0 bg-midnight/50 flex items-center justify-center">
                  <span className="text-xs text-muted font-medium bg-midnight/80 px-3 py-1.5 rounded-full">Not Available Today</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-lr-white text-sm">{v.name}</h3>
                <div className="flex items-center gap-1 text-gold text-xs font-bold">
                  <Star size={11} fill="#F5A623" /> {v.rating}
                </div>
              </div>
              <p className="text-muted text-xs mb-3">{v.specialty} · <span className="text-teal">{v.price}</span></p>
              <div className="flex items-center justify-between">
                <span className="text-muted text-xs">{v.reviews} reviews</span>
                <button onClick={() => setBookedId(v.id)} disabled={!v.available || bookedId === v.id}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={bookedId === v.id ? { background: "rgba(0,212,170,0.2)", color: "#00D4AA" } : { background: "#00D4AA", color: "#0A0F1E" }}>
                  {bookedId === v.id ? "✓ Booked!" : "Book Now"}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Events + Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Events */}
        <div>
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-heading font-bold text-lr-white text-xl flex items-center gap-2">
              <Calendar size={18} className="text-teal" /> Upcoming Events
            </h2>
            <Link href="/resident/events" className="text-xs text-teal font-medium flex items-center gap-1 hover:underline">
              View All <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-3">
            {events.map((e) => (
              <motion.div key={e.id} whileHover={{ x: 3 }} className="glass rounded-xl p-4 flex items-center gap-4">
                <div className={`bg-linear-to-br ${e.gradient} w-12 h-12 rounded-xl shrink-0 flex items-center justify-center`}>
                  <Calendar size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lr-white text-sm font-semibold truncate">{e.title}</p>
                  <p className="text-muted text-xs mt-0.5 flex items-center gap-2">
                    <Clock size={10} />{e.date} · {e.time}
                    <MapPin size={10} />{e.location}
                  </p>
                </div>
                <button className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                  style={{ background: "rgba(0,212,170,0.12)", color: "#00D4AA" }}>
                  {e.spots === 0 ? "Waitlist" : "Join"}
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Bookings */}
        <div>
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-heading font-bold text-lr-white text-xl">Recent Bookings</h2>
            <Link href="/resident/bookings" className="text-xs text-teal font-medium flex items-center gap-1 hover:underline">
              View All <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-3">
            {residentBookings.map((b) => {
              const s = statusConfig[b.status as keyof typeof statusConfig] || statusConfig.pending;
              return (
                <div key={b.id} className="glass rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-midnight shrink-0" style={{ background: s.color }}>
                    {b.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lr-white text-sm font-semibold">{b.service}</p>
                    <p className="text-muted text-xs mt-0.5">{b.vendor} · {b.date} · {b.time}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    <p className="text-muted text-xs mt-1">{b.amount}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
