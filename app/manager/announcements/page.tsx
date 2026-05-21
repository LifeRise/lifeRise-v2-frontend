"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Send, AlertTriangle, Info, CalendarDays, Copy } from "lucide-react";
import { announcements as initialAnnouncements } from "@/lib/mock-data";
import type { Announcement } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { staggerContainer, fadeUpItem } from "@/lib/animations";
import { cn } from "@/lib/utils";

type Audience = "all" | "residents" | "vendors";
type Priority = "normal" | "urgent";

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>(initialAnnouncements);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [priority, setPriority] = useState<Priority>("normal");
  const [sent, setSent] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");

  const categories = ["All", ...Array.from(new Set(items.map((a) => a.category)))];

  const filtered =
    categoryFilter === "All" ? items : items.filter((a) => a.category === categoryFilter);

  const sendAnnouncement = () => {
    if (!title.trim()) return;
    const newAnn: Announcement = {
      id: `a${Date.now()}`,
      title,
      body,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      category: priority === "urgent" ? "Urgent" : "General",
      urgent: priority === "urgent",
    };
    setItems((prev) => [newAnn, ...prev]);
    setSent(true);
    setTitle("");
    setBody("");
    setAudience("all");
    setPriority("normal");
    setTimeout(() => setSent(false), 2500);
  };

  const duplicate = (ann: Announcement) => {
    setItems((prev) => [
      {
        ...ann,
        id: `a${Date.now()}`,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      },
      ...prev,
    ]);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto pb-24 lg:pb-8">
      <SectionHeader title="Announcements" subtitle="Broadcast updates to residents and vendors" />

      {/* Composer */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="p-5 mb-6">
          <h3 className="font-heading text-sm font-semibold text-lr-white mb-3 flex items-center gap-2">
            <Megaphone size={14} className="text-purple-accent" /> New Announcement
          </h3>

          <div className="flex flex-wrap gap-2 mb-3">
            {(["all", "residents", "vendors"] as Audience[]).map((a) => (
              <button
                key={a}
                onClick={() => setAudience(a)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                  audience === a
                    ? "bg-purple-accent text-white"
                    : "bg-white/[0.06] text-muted hover:text-lr-white"
                )}
              >
                {a === "all" ? "All" : a}
              </button>
            ))}
            <div className="w-px h-5 bg-white/[0.1] mx-1" />
            {(["normal", "urgent"] as Priority[]).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                  priority === p
                    ? p === "urgent"
                      ? "bg-red-400/15 text-red-400 border border-red-400/20"
                      : "bg-purple-accent text-white"
                    : "bg-white/[0.06] text-muted hover:text-lr-white"
                )}
              >
                {p}
              </button>
            ))}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title…"
            className="w-full bg-midnight/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-lr-white placeholder:text-muted focus:outline-none focus:border-purple-accent/50 transition-colors mb-3"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message…"
            rows={3}
            className="w-full bg-midnight/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-lr-white placeholder:text-muted focus:outline-none focus:border-purple-accent/50 transition-colors resize-none mb-3"
          />
          <button
            onClick={sendAnnouncement}
            disabled={!title.trim()}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
              sent
                ? "bg-teal/15 text-teal"
                : "bg-purple-accent text-white"
            )}
          >
            <Send size={14} />
            {sent ? "Sent successfully ✓" : "Send Announcement"}
          </button>
        </GlassCard>
      </motion.div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              categoryFilter === c
                ? "bg-purple-accent text-white"
                : "bg-white/[0.06] text-muted hover:text-lr-white"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* History */}
      <motion.div variants={staggerContainer(0.04)} initial="hidden" animate="show" className="space-y-2">
        <AnimatePresence>
          {filtered.map((a) => (
            <motion.div key={a.id} variants={fadeUpItem} layout exit={{ opacity: 0, x: 20 }}>
              <GlassCard className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      a.urgent ? "bg-red-400/15" : "bg-purple-accent/15"
                    )}
                  >
                    {a.urgent ? (
                      <AlertTriangle size={14} className="text-red-400" />
                    ) : (
                      <Info size={14} className="text-purple-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-lr-white">{a.title}</p>
                      <span className="text-[10px] text-muted shrink-0">{a.date}</span>
                    </div>
                    <p className="text-muted text-xs mt-0.5">{a.body}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-muted flex items-center gap-1">
                        <CalendarDays size={9} /> {a.category}
                      </span>
                      <button
                        onClick={() => duplicate(a)}
                        className="text-[10px] text-muted hover:text-purple-accent transition-colors flex items-center gap-1"
                      >
                        <Copy size={9} /> Duplicate
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <EmptyState
          icon={<Megaphone className="h-6 w-6 text-muted" />}
          title="No announcements"
          description="Create your first announcement above."
        />
      )}
    </div>
  );
}
