"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Star, Clock, ArrowRight } from "lucide-react";
import { serviceDetails as mockServiceDetails, categories } from "@/lib/mock-data";
import { useServices } from "@/lib/api/hooks";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { staggerContainerResponsive, fadeUpItem } from "@/lib/animations";
import { trackAction } from "@/lib/pwa";
import { cn } from "@/lib/utils";
import { useActiveCategory, useSetActiveCategory } from "@/lib/store";

export default function ServicesPage() {
  const activeCategory = useActiveCategory();
  const setActiveCategory = useSetActiveCategory();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookedId, setBookedId] = useState<string | null>(null);
  const { details: apiServices, isLoading: apiLoading } = useServices();

  // Use API data when available, fall back to mock data
  const serviceData = apiServices.length > 0 ? apiServices : mockServiceDetails;

  const filtered = useMemo(() => {
    return serviceData.filter((s) => {
      const matchesCategory = activeCategory === "All" || s.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        q === "" ||
        s.name.toLowerCase().includes(q) ||
        s.specialty.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery, serviceData]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto pb-24 lg:pb-8">
      <SectionHeader
        title="Services Marketplace"
        subtitle="Browse and book premium services from verified vendors"
      />

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services, vendors, or tags..."
            className="w-full rounded-xl bg-midnight/60 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-lr-white placeholder:text-muted focus:outline-none focus:border-teal/40 transition-colors"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeCategory === cat
                ? "bg-teal text-midnight"
                : "bg-white/[0.06] text-muted hover:text-lr-white"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results Count + API Status */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted text-xs">
          {filtered.length} {filtered.length === 1 ? "service" : "services"} available
        </p>
        {apiServices.length > 0 && (
          <span className="text-[10px] text-teal bg-teal/10 px-2 py-0.5 rounded-full">
            Live data
          </span>
        )}
        {apiServices.length === 0 && !apiLoading && (
          <span className="text-[10px] text-muted bg-white/5 px-2 py-0.5 rounded-full">
            Demo data
          </span>
        )}
      </div>

      {/* Service Grid */}
      {filtered.length > 0 ? (
        <motion.div
          variants={staggerContainerResponsive(0.06)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((v) => (
              <motion.div
                key={v.id}
                variants={fadeUpItem}
                layout
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ layout: { duration: 0.25 } }}
              >
                <GlassCard hover className="overflow-hidden group h-full flex flex-col">
                  {/* Gradient Header */}
                  <div className={`bg-linear-to-br ${v.gradient} h-36 flex items-center justify-center relative`}>
                    <span className="text-5xl select-none opacity-30">✦</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-white font-heading backdrop-blur-sm">
                        {v.initials}
                      </span>
                    </div>
                    {v.badge && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-midnight/60 text-teal border border-teal/30">
                        {v.badge}
                      </span>
                    )}
                    {!v.available && (
                      <div className="absolute inset-0 bg-midnight/50 flex items-center justify-center">
                        <span className="text-xs text-muted font-medium bg-midnight/80 px-3 py-1.5 rounded-full">
                          Not Available Today
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-lr-white text-sm">{v.name}</h3>
                      <div className="flex items-center gap-1 text-gold text-xs font-bold">
                        <Star size={11} fill="#F5A623" /> {v.rating}
                      </div>
                    </div>
                    <p className="text-muted text-xs mb-2">
                      {v.specialty} · <span className="text-teal">{v.price}</span>
                    </p>
                    <p className="text-muted text-xs line-clamp-2 mb-3 flex-1">{v.description}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {v.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-muted border border-white/[0.05]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                      <span className="text-muted text-[11px] flex items-center gap-1">
                        <Clock size={10} /> {v.estimatedDuration}
                      </span>
                      <button
                        onClick={() => {
                          setBookedId(v.id);
                          trackAction("book_service");
                        }}
                        disabled={!v.available || bookedId === v.id}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                        style={
                          bookedId === v.id
                            ? { background: "rgba(0,212,170,0.2)", color: "#00D4AA" }
                            : { background: "#00D4AA", color: "#0A0F1E" }
                        }
                      >
                        {bookedId === v.id ? (
                          "✓ Booked!"
                        ) : (
                          <>
                            Book Now <ArrowRight size={11} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <EmptyState
          icon={<Search className="h-6 w-6 text-muted" />}
          title="No services found"
          description="Try adjusting your search or category filter to find what you're looking for."
          action={
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("All");
              }}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal text-midnight"
            >
              Clear Filters
            </button>
          }
        />
      )}
    </div>
  );
}
