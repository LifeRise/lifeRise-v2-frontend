"use client";

import { List } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export default function VendorQueuePage() {
  return (
    <div className="px-4 sm:px-6 py-6">
      <h1 className="font-heading font-bold text-lr-white text-xl mb-6 flex items-center gap-2">
        <List size={20} className="text-gold" /> Booking Queue
      </h1>
      <GlassCard className="p-8 text-center">
        <p className="text-muted text-sm">Booking queue management coming soon.</p>
      </GlassCard>
    </div>
  );
}
