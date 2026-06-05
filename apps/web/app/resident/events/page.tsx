"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Users, Heart } from "lucide-react";
import { events } from "@/lib/mock-data";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { staggerContainerResponsive, fadeUpItem } from "@/lib/animations";
import { cn } from "@/lib/utils";

export default function EventsPage() {
  const [interestedMap, setInterestedMap] = useState<Record<string, boolean>>({});

  const toggleInterested = (id: string) => {
    setInterestedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto pb-24 lg:pb-8">
      <SectionHeader
        title="Community Events"
        subtitle="Discover what's happening at Riverside Commons"
      />

      {events.length > 0 ? (
        <motion.div
          variants={staggerContainerResponsive(0.07)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {events.map((e) => {
            const interested = interestedMap[e.id] || false;
            const spotsLeft = e.spots;
            const spotPercent = spotsLeft > 0 ? Math.min(100, (interested ? e.interested + 1 : e.interested) / (e.spots + e.interested) * 100) : 100;

            return (
              <motion.div key={e.id} variants={fadeUpItem}>
                <GlassCard hover className="overflow-hidden h-full flex flex-col">
                  {/* Image Placeholder with Gradient */}
                  <div className={`bg-linear-to-br ${e.gradient} h-40 flex items-center justify-center relative`}>
                    <Calendar size={32} className="text-white/40" />
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-midnight/60 text-lr-white border border-white/10">
                        {e.date}
                      </span>
                    </div>
                    {spotsLeft === 0 && (
                      <div className="absolute inset-0 bg-midnight/60 flex items-center justify-center">
                        <span className="text-xs font-bold text-muted bg-midnight/80 px-3 py-1.5 rounded-full">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-heading text-base font-semibold text-lr-white mb-1">
                      {e.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-muted text-[11px] mb-3">
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {e.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {e.location}
                      </span>
                    </div>

                    {/* Spots bar */}
                    <div className="mt-auto">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-muted flex items-center gap-1">
                          <Users size={10} />
                          {spotsLeft > 0 ? `${spotsLeft} spots left` : "Join waitlist"}
                        </span>
                        <span className="text-muted">
                          {interested ? e.interested + 1 : e.interested} interested
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-mid overflow-hidden mb-3">
                        <motion.div
                          className="h-full rounded-full bg-teal"
                          initial={{ width: 0 }}
                          animate={{ width: `${spotPercent}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>

                      <button
                        onClick={() => toggleInterested(e.id)}
                        className={cn(
                          "w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                          interested
                            ? "bg-teal/15 text-teal border border-teal/20"
                            : "bg-white/[0.06] text-lr-white hover:bg-white/[0.10]"
                        )}
                      >
                        <motion.div
                          animate={interested ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Heart size={13} className={cn(interested && "fill-teal text-teal")} />
                        </motion.div>
                        {interested ? "Interested" : "I'm Interested"}
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <EmptyState
          icon={<Calendar className="h-6 w-6 text-muted" />}
          title="No upcoming events"
          description="Check back soon for new community events and activities."
        />
      )}
    </div>
  );
}
