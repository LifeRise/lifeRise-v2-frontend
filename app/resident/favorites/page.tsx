"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Star, ArrowRight, ShoppingBag } from "lucide-react";
import { serviceDetails as mockServiceDetails } from "@/lib/mock-data";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { staggerContainerResponsive, fadeUpItem } from "@/lib/animations";
import Link from "next/link";
import { useServices, useFavorites } from "@/lib/api/hooks";
import { toggleFavorite } from "@/lib/api/favorites";

export default function FavoritesPage() {
  const [bookedId, setBookedId] = useState<string | null>(null);
  const { details: apiServices, isLoading: servicesLoading } = useServices();
  const { favorites: apiFavorites, isLoading: favsLoading, refresh: refreshFavs } = useFavorites();

  // Build a set of favorited service IDs from API
  const favServiceIds = useMemo(() => {
    if (apiFavorites.length === 0) return new Set<string>();
    return new Set(
      apiFavorites
        .map((f) => f.service_id)
        .filter(Boolean)
        .map(String)
    );
  }, [apiFavorites]);

  // Use API services when available, fall back to mock
  const allServices = apiServices.length > 0 ? apiServices : mockServiceDetails;

  // Filter to favorited services
  const favServices = useMemo(() => {
    if (apiFavorites.length > 0) {
      return allServices.filter((s) => favServiceIds.has(s.id));
    }
    // Fallback: use mock favorites (v1, v4)
    return allServices.filter((s) => s.id === "v1" || s.id === "v4");
  }, [allServices, favServiceIds, apiFavorites]);

  const isLoading = servicesLoading || favsLoading;
  const isLive = apiFavorites.length > 0 && apiServices.length > 0;

  const handleToggleFavorite = useCallback(
    async (id: string) => {
      if (apiFavorites.length > 0) {
        // Real API mode
        try {
          await toggleFavorite(Number(id));
          refreshFavs();
        } catch {
          // ignore
        }
      }
    },
    [apiFavorites, refreshFavs]
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <SectionHeader title="Favorites" subtitle="Your saved vendors and services" />
        {isLive && (
          <span className="text-[10px] text-teal bg-teal/10 px-2 py-0.5 rounded-full shrink-0">Live data</span>
        )}
        {!isLive && !isLoading && (
          <span className="text-[10px] text-muted bg-white/5 px-2 py-0.5 rounded-full shrink-0">Demo data</span>
        )}
      </div>

      {favServices.length > 0 ? (
        <motion.div
          variants={staggerContainerResponsive(0.06)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {favServices.map((v) => (
              <motion.div
                key={v.id}
                variants={fadeUpItem}
                layout
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
              >
                <GlassCard hover className="overflow-hidden group h-full flex flex-col">
                  <div className={`bg-linear-to-br ${v.gradient} h-36 flex items-center justify-center relative`}>
                    <span className="text-5xl select-none opacity-30">✦</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-white font-heading backdrop-blur-sm">
                        {v.initials}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove from favorites"
                      onClick={() => handleToggleFavorite(v.id)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-midnight/60 flex items-center justify-center border border-white/10 hover:bg-midnight/80 transition-colors"
                    >
                      <Heart size={14} className="text-red-400 fill-red-400" />
                    </button>
                  </div>

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

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => handleToggleFavorite(v.id)}
                        className="text-[11px] text-muted hover:text-red-400 transition-colors flex items-center gap-1"
                      >
                        <Heart size={10} className="fill-red-400 text-red-400" /> Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookedId(v.id)}
                        disabled={!v.available || bookedId === v.id}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 ${bookedId === v.id ? "bg-teal/20 text-teal" : "bg-teal text-midnight"}`}
                      >
                        {bookedId === v.id ? "✓ Booked!" : <>Book <ArrowRight size={11} /></>}
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
          icon={<Heart className="h-6 w-6 text-muted" />}
          title="No favorites yet"
          description="Save your preferred vendors to quickly book them again."
          action={
            <Link
              href="/resident/services"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal text-midnight inline-flex items-center gap-1"
            >
              <ShoppingBag size={12} /> Browse Services
            </Link>
          }
        />
      )}
    </div>
  );
}
