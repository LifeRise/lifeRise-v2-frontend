"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Star, ArrowRight, ShoppingBag } from "lucide-react";
import { serviceDetails } from "@/lib/mock-data";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { staggerContainer, fadeUpItem } from "@/lib/animations";
import Link from "next/link";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["v1", "v4"]));
  const [bookedId, setBookedId] = useState<string | null>(null);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const favServices = serviceDetails.filter((s) => favorites.has(s.id));

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto pb-24 lg:pb-8">
      <SectionHeader
        title="Favorites"
        subtitle="Your saved vendors and services"
      />

      {favServices.length > 0 ? (
        <motion.div
          variants={staggerContainer(0.06)}
          initial="hidden"
          animate="show"
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
                      onClick={() => toggleFavorite(v.id)}
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

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                      <button
                        onClick={() => toggleFavorite(v.id)}
                        className="text-[11px] text-muted hover:text-red-400 transition-colors flex items-center gap-1"
                      >
                        <Heart size={10} className="fill-red-400 text-red-400" /> Remove
                      </button>
                      <button
                        onClick={() => setBookedId(v.id)}
                        disabled={!v.available || bookedId === v.id}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                        style={
                          bookedId === v.id
                            ? { background: "rgba(0,212,170,0.2)", color: "#00D4AA" }
                            : { background: "#00D4AA", color: "#0A0F1E" }
                        }
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
