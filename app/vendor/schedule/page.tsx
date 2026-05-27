"use client";

import { CalendarDays } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export default function VendorSchedulePage() {
  return (
    <div className="px-4 sm:px-6 py-6">
      <h1 className="font-heading font-bold text-lr-white text-xl mb-6 flex items-center gap-2">
        <CalendarDays size={20} className="text-gold" /> My Schedule
      </h1>
      <GlassCard className="p-8 text-center">
        <p className="text-muted text-sm">Schedule management coming soon.</p>
      </GlassCard>
    </div>
  );
}
