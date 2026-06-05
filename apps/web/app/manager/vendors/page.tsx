"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Star,
  Phone,
} from "lucide-react";
import { vendorApplications, vendorLeaderboard } from "@/lib/mock-data";
import type { VendorApplication } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { staggerContainerResponsive, fadeUpItem } from "@/lib/animations";
import { cn, getInitials } from "@/lib/utils";

const trendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus };
const trendColor = { up: "#00D4AA", down: "#F87171", stable: "#94A3B8" };

export default function VendorsPage() {
  const [applications, setApplications] = useState<VendorApplication[]>(vendorApplications);
  const [, setActiveTab] = useState("applications");
  const [expandedVendor, setExpandedVendor] = useState<number | null>(null);

  const handleApprove = (id: string) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "approved" as const } : a))
    );
  };

  const handleReject = (id: string) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "rejected" as const } : a))
    );
  };

  const pendingApps = applications.filter((a) => a.status === "pending");
  const activeVendors = vendorLeaderboard.map((v) => ({ ...v, status: "approved" as const }));
  const rejectedApps = applications.filter((a) => a.status === "rejected");

  // Summary stats for the header bar
  const totalActiveJobs = activeVendors.reduce((s, v) => s + v.bookings, 0);
  const avgRating = (activeVendors.reduce((s, v) => s + v.rating, 0) / activeVendors.length).toFixed(1);
  const avgCompletion = Math.round(
    activeVendors.reduce((s, v) => s + (v.completionRate ?? 95), 0) / activeVendors.length
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto pb-24 lg:pb-8">
      <SectionHeader title="Vendor Management" subtitle="Review applications and monitor performance" />

      {/* Stats summary bar */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Active Vendors", value: activeVendors.length.toString(), color: "#818CF8" },
          { label: "Total Jobs (30d)", value: totalActiveJobs.toString(), color: "#00D4AA" },
          { label: "Avg Rating", value: `${avgRating}★`, color: "#F5A623" },
          { label: "Avg Completion", value: `${avgCompletion}%`, color: "#34D399" },
          { label: "Pending Applications", value: pendingApps.length.toString(), color: "#F5A623" },
          { label: "Rejected", value: applications.filter((a) => a.status === "rejected").length.toString(), color: "#F87171" },
        ].map((s) => (
          <GlassCard key={s.label} className="p-3 text-center">
            <p className="font-heading font-bold text-xl" style={{ color: s.color }}>{s.value}</p>
            <p className="text-muted text-[10px] mt-0.5">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      <Tabs
        tabs={[
          { id: "applications", label: `Applications (${pendingApps.length})` },
          { id: "active", label: "Active Vendors" },
          { id: "rejected", label: "Rejected" },
        ]}
        defaultTab="applications"
        onChange={setActiveTab}
        indicatorClassName="bg-purple-accent"
      >
        {(tabId) => (
          <AnimatePresence mode="wait">
            <motion.div
              key={tabId}
              variants={staggerContainerResponsive(0.04)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              className="space-y-3"
            >
              {tabId === "applications" && (
                <>
                  {pendingApps.length > 0 ? (
                    pendingApps.map((app) => (
                      <motion.div key={app.id} variants={fadeUpItem}>
                        <GlassCard className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-11 h-11 rounded-full bg-linear-to-br from-gold to-amber-700 flex items-center justify-center text-xs font-bold text-midnight font-heading shrink-0">
                                {getInitials(app.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-lr-white">{app.name}</p>
                                <p className="text-muted text-xs">{app.email}</p>
                                <div className="flex items-center flex-wrap gap-2 mt-1">
                                  <span className="text-muted text-[11px]">{app.specialty}</span>
                                  <span className="text-muted/50 text-[11px]">·</span>
                                  <span className="text-muted text-[11px]">Applied {app.appliedDate}</span>
                                  {app.yearsExperience !== undefined && (
                                    <>
                                      <span className="text-muted/50 text-[11px]">·</span>
                                      <span className="text-muted text-[11px]">{app.yearsExperience} yrs exp</span>
                                    </>
                                  )}
                                </div>
                                {app.bio && (
                                  <p className="text-muted/80 text-[11px] mt-2 leading-relaxed line-clamp-2">
                                    {app.bio}
                                  </p>
                                )}
                                <div className="flex items-center flex-wrap gap-2 mt-2">
                                  {app.documents.map((doc, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-white/6 text-muted border border-white/5 flex items-center gap-1"
                                    >
                                      <FileText size={9} /> {doc}
                                    </span>
                                  ))}
                                  {app.phone && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/6 text-muted border border-white/5 flex items-center gap-1">
                                      <Phone size={9} /> {app.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleApprove(app.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal text-midnight hover:opacity-90 transition-opacity flex items-center gap-1"
                              >
                                <CheckCircle size={11} /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(app.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/6 text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-1"
                              >
                                <XCircle size={11} /> Reject
                              </button>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))
                  ) : (
                    <EmptyState
                      icon={<Briefcase className="h-6 w-6 text-muted" />}
                      title="No pending applications"
                      description="All vendor applications have been reviewed."
                    />
                  )}
                </>
              )}

              {tabId === "active" && (
                <>
                  {activeVendors.length > 0 ? (
                    <div className="space-y-2">
                      {activeVendors.map((v) => {
                        const TrendIcon = trendIcon[v.trend as keyof typeof trendIcon];
                        const tc = trendColor[v.trend as keyof typeof trendColor];
                        const isExpanded = expandedVendor === v.rank;
                        const maxBookings = activeVendors[0]?.bookings ?? 1;
                        const fillPct = Math.round((v.bookings / maxBookings) * 100);

                        return (
                          <motion.div key={v.rank} variants={fadeUpItem}>
                            <GlassCard className="overflow-hidden">
                              <button
                                type="button"
                                className="w-full text-left"
                                onClick={() => setExpandedVendor(isExpanded ? null : v.rank)}
                              >
                                <div className="flex items-center gap-3 px-4 py-3">
                                  {/* Rank medal or number */}
                                  <span className="text-sm w-5 shrink-0 text-center">
                                    {v.rank === 1 ? "🥇" : v.rank === 2 ? "🥈" : v.rank === 3 ? "🥉" : <span className="text-xs text-muted">{v.rank}</span>}
                                  </span>
                                  {/* Gradient avatar */}
                                  <div
                                    className={cn(
                                      "w-9 h-9 rounded-full bg-linear-to-br flex items-center justify-center text-[11px] font-bold text-white font-heading shrink-0",
                                      v.gradient ?? "from-slate-600 to-slate-700"
                                    )}
                                  >
                                    {v.initials ?? getInitials(v.name)}
                                  </div>
                                  {/* Name + specialty */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-lr-white font-medium truncate">{v.name}</p>
                                    <p className="text-[11px] text-muted">{v.specialty}</p>
                                  </div>
                                  {/* Stats */}
                                  <div className="hidden sm:flex items-center gap-4 shrink-0">
                                    <div className="text-center">
                                      <p className="text-xs font-semibold text-lr-white">{v.bookings}</p>
                                      <p className="text-[10px] text-muted">jobs</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs font-semibold text-gold">{v.rating}★</p>
                                      <p className="text-[10px] text-muted">{v.reviewCount ?? 0} reviews</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs font-semibold text-teal">{v.earnings}</p>
                                      <p className="text-[10px] text-muted">earnings</p>
                                    </div>
                                    <TrendIcon size={14} style={{ color: tc }} />
                                  </div>
                                </div>
                                {/* Completion rate bar */}
                                {v.completionRate !== undefined && (
                                  <div className="px-4 pb-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] text-muted">Completion rate</span>
                                      <span className="text-[10px] text-teal font-semibold">{v.completionRate}%</span>
                                    </div>
                                    <div className="h-1 rounded-full bg-slate-mid overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-teal transition-all duration-700"
                                        style={{ width: `${fillPct}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </button>

                              {/* Expanded detail */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden border-t border-white/6"
                                  >
                                    <div className="px-4 py-3 space-y-2">
                                      {v.bio && (
                                        <p className="text-muted text-[12px] leading-relaxed">{v.bio}</p>
                                      )}
                                      <div className="flex flex-wrap gap-3 mt-2">
                                        {v.topService && (
                                          <span className="flex items-center gap-1 text-[11px] text-muted bg-white/5 rounded-full px-3 py-1">
                                            <Star size={10} className="text-gold" /> {v.topService}
                                          </span>
                                        )}
                                        {v.avgResponseTime && (
                                          <span className="flex items-center gap-1 text-[11px] text-muted bg-white/5 rounded-full px-3 py-1">
                                            <Clock size={10} className="text-purple-accent" /> {v.avgResponseTime} response
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </GlassCard>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState title="No active vendors" description="" />
                  )}
                </>
              )}

              {tabId === "rejected" && (
                <>
                  {rejectedApps.length > 0 ? (
                    rejectedApps.map((app) => (
                      <motion.div key={app.id} variants={fadeUpItem}>
                        <GlassCard className="p-4 opacity-60">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-mid flex items-center justify-center text-xs font-bold text-muted font-heading">
                              {getInitials(app.name)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-lr-white">{app.name}</p>
                              <p className="text-muted text-xs">{app.specialty} · Applied {app.appliedDate}</p>
                            </div>
                            <StatusBadge status="rejected" variant="manager" />
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))
                  ) : (
                    <EmptyState title="No rejected applications" description="" />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </Tabs>
    </div>
  );
}
