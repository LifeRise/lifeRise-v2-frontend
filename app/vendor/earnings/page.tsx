"use client";

import { DollarSign } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export default function VendorEarningsPage() {
  return (
    <div className="px-4 sm:px-6 py-6">
      <h1 className="font-heading font-bold text-lr-white text-xl mb-6 flex items-center gap-2">
        <DollarSign size={20} className="text-gold" /> Earnings
      </h1>
      <GlassCard className="p-8 text-center">
        <p className="text-muted text-sm">Earnings tracking coming soon.</p>
      </GlassCard>
    </div>
  );
}
