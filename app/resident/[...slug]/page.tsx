"use client";

import { motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { Sparkles, ArrowLeft } from "lucide-react";

const sectionNames: Record<string, { label: string; emoji: string; desc: string }> = {
  services:      { label: "Services",      emoji: "🛍️",  desc: "Browse and book from our full catalog of resident services." },
  bookings:      { label: "My Bookings",   emoji: "📅",  desc: "View, reschedule, or cancel your upcoming appointments." },
  events:        { label: "Events",        emoji: "🎉",  desc: "Discover community events and activities in your complex." },
  favorites:     { label: "Favorites",     emoji: "❤️",  desc: "Your saved vendors and services for quick re-booking." },
  notifications: { label: "Notifications", emoji: "🔔",  desc: "Stay informed with alerts and updates from your complex." },
  profile:       { label: "Profile",       emoji: "👤",  desc: "Manage your account, preferences, and payment methods." },
};

export default function ResidentSubPage() {
  const router = useRouter();
  const pathname = usePathname();
  const slug = pathname.split("/").pop() ?? "";
  const section = sectionNames[slug] ?? { label: slug.charAt(0).toUpperCase() + slug.slice(1), emoji: "✨", desc: "This section is coming soon." };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
        className="glass rounded-3xl p-10 max-w-md w-full">
        <div className="text-5xl mb-5">{section.emoji}</div>
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles size={14} className="text-teal" />
          <span className="text-teal text-xs font-bold uppercase tracking-widest">Coming Soon</span>
        </div>
        <h1 className="font-heading font-extrabold text-lr-white text-3xl mb-3">{section.label}</h1>
        <p className="text-muted text-sm leading-relaxed mb-8">{section.desc}</p>
        <button onClick={() => router.push("/resident")}
          className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-midnight transition-all hover:opacity-90 active:scale-95 bg-teal">
          <ArrowLeft size={15} /> Back to Dashboard
        </button>
      </motion.div>
    </div>
  );
}
