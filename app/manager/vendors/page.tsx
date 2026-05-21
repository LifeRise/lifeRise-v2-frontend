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
} from "lucide-react";
import { vendorApplications, vendorLeaderboard } from "@/lib/mock-data";
import type { VendorApplication } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { staggerContainer, fadeUpItem } from "@/lib/animations";
import { getInitials } from "@/lib/utils";

const trendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus };
const trendColor = { up: "#00D4AA", down: "#F87171", stable: "#94A3B8" };

export default function VendorsPage() {
  const [applications, setApplications] = useState<VendorApplication[]>(vendorApplications);
  const [, setActiveTab] = useState("applications");

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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto pb-24 lg:pb-8">
      <SectionHeader title="Vendor Management" subtitle="Review applications and monitor performance" />

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
              variants={staggerContainer(0.04)}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {tabId === "applications" && (
                <>
                  {pendingApps.length > 0 ? (
                    pendingApps.map((app) => (
                      <motion.div key={app.id} variants={fadeUpItem}>
                        <GlassCard className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-linear-to-br from-gold to-amber-700 flex items-center justify-center text-xs font-bold text-midnight font-heading">
                                {getInitials(app.name)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-lr-white">{app.name}</p>
                                <p className="text-muted text-xs">{app.email}</p>
                                <p className="text-muted text-[11px] mt-0.5">{app.specialty} · Applied {app.appliedDate}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  {app.documents.map((doc, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-muted border border-white/[0.05] flex items-center gap-1"
                                    >
                                      <FileText size={9} /> {doc}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApprove(app.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal text-midnight hover:opacity-90 transition-opacity flex items-center gap-1"
                              >
                                <CheckCircle size={11} /> Approve
                              </button>
                              <button
                                onClick={() => handleReject(app.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.06] text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-1"
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
                    <GlassCard className="overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/[0.07]">
                            {["Vendor", "Specialty", "Jobs", "Rating", "Earnings", "Trend"].map((h) => (
                              <th key={h} className="px-4 py-3 text-[10px] text-muted uppercase tracking-wider font-medium">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {activeVendors.map((v) => {
                            const TrendIcon = trendIcon[v.trend as keyof typeof trendIcon];
                            const tc = trendColor[v.trend as keyof typeof trendColor];
                            return (
                              <tr
                                key={v.rank}
                                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs w-4">
                                      {v.rank === 1 ? "🥇" : v.rank === 2 ? "🥈" : v.rank === 3 ? "🥉" : v.rank}
                                    </span>
                                    <span className="text-lr-white font-medium">{v.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-muted">{v.specialty}</td>
                                <td className="px-4 py-3 text-muted">{v.bookings}</td>
                                <td className="px-4 py-3 text-gold font-semibold">{v.rating}★</td>
                                <td className="px-4 py-3 text-teal font-semibold">{v.earnings}</td>
                                <td className="px-4 py-3">
                                  <TrendIcon size={14} style={{ color: tc }} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </GlassCard>
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
