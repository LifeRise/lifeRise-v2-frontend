"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Home,
  CreditCard,
  Plus,
  Trash2,
  Check,
  Bell,
  Smartphone,
  Edit3,
  X,
  Download,
} from "lucide-react";
import { usePWA } from "@/components/pwa/PWAProvider";
import { residentProfile as mockResidentProfile, paymentMethods } from "@/lib/mock-data";
import type { PaymentMethod } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { staggerContainerResponsive, fadeUpItem } from "@/lib/animations";
import { cn, getInitials } from "@/lib/utils";
import { useAuth } from "@/lib/auth/hooks";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={checked ? "true" : "false"}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        checked ? "bg-teal" : "bg-slate-light"
      )}
    >
      <motion.div
        className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

function CardBrandIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    visa: "from-blue-600 to-blue-800",
    mastercard: "from-red-600 to-yellow-600",
    amex: "from-cyan-600 to-blue-600",
  };
  return (
    <div
      className={cn(
        "w-8 h-5 rounded bg-linear-to-br flex items-center justify-center text-[8px] font-bold text-white uppercase",
        colors[type] || "from-slate-light to-slate-mid"
      )}
    >
      {type.slice(0, 2)}
    </div>
  );
}

export default function ProfilePage() {
  const { profile: apiProfile } = useAuth();

  // Merge API profile with mock data for fields backend doesn't have yet
  const [profile, setProfile] = useState(() => ({
    ...mockResidentProfile,
    name: apiProfile ? `${apiProfile.first_name} ${apiProfile.last_name}` : mockResidentProfile.name,
    email: apiProfile?.email ?? mockResidentProfile.email,
    phone: apiProfile?.phone ?? mockResidentProfile.phone,
  }));

  // Sync when API profile loads
  useEffect(() => {
    if (apiProfile) {
      setProfile((prev) => ({
        ...prev,
        name: `${apiProfile.first_name} ${apiProfile.last_name}`,
        email: apiProfile.email,
        phone: apiProfile.phone,
      }));
    }
  }, [apiProfile]);

  const [cards, setCards] = useState<PaymentMethod[]>(paymentMethods);
  const [editing, setEditing] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState<{
    type: "visa" | "mastercard" | "amex";
    last4: string;
    expiry: string;
    cardholderName: string;
  }>({
    type: "visa",
    last4: "",
    expiry: "",
    cardholderName: profile.name,
  });

  const handleSaveProfile = () => setEditing(false);

  const handleAddCard = () => {
    if (newCard.last4.length !== 4 || !newCard.expiry.includes("/")) return;
    const card: PaymentMethod = {
      id: `pm${Date.now()}`,
      type: newCard.type,
      last4: newCard.last4,
      expiry: newCard.expiry,
      isDefault: cards.length === 0,
      cardholderName: newCard.cardholderName,
    };
    setCards((prev) => [...prev, card]);
    setShowAddCard(false);
    setNewCard({ type: "visa", last4: "", expiry: "", cardholderName: profile.name });
  };

  const handleRemoveCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
  };

  const isLive = !!apiProfile;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <SectionHeader title="Profile" />
        {isLive && (
          <span className="text-[10px] text-teal bg-teal/10 px-2 py-0.5 rounded-full">Live data</span>
        )}
        {!isLive && (
          <span className="text-[10px] text-muted bg-white/5 px-2 py-0.5 rounded-full">Demo data</span>
        )}
      </div>

      <motion.div variants={staggerContainerResponsive(0.06)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} className="space-y-5">
        {/* Profile Header */}
        <motion.div variants={fadeUpItem}>
          <GlassCard className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-linear-to-br from-teal to-emerald-700 flex items-center justify-center text-2xl font-bold text-midnight font-heading">
                {getInitials(profile.name)}
              </div>
              <div className="flex-1">
                <h2 className="font-heading text-lg font-bold text-lr-white">{profile.name}</h2>
                <p className="text-muted text-xs">{profile.email}</p>
                <p className="text-muted text-xs mt-0.5">Unit {profile.unit} · Riverside Commons</p>
              </div>
              <button
                type="button"
                onClick={() => (editing ? handleSaveProfile() : setEditing(true))}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/6 text-muted hover:text-lr-white hover:bg-white/10 transition-colors flex items-center gap-1"
              >
                {editing ? <Check size={12} /> : <Edit3 size={12} />}
                {editing ? "Save" : "Edit"}
              </button>
            </div>
          </GlassCard>
        </motion.div>

        {/* Profile Details */}
        <motion.div variants={fadeUpItem}>
          <GlassCard className="p-5">
            <h3 className="font-heading text-sm font-semibold text-lr-white mb-4 flex items-center gap-2">
              <User size={14} className="text-teal" /> Personal Info
            </h3>
            <div className="space-y-3">
              {[
                { label: "Full Name", value: profile.name, icon: User, key: "name" },
                { label: "Email", value: profile.email, icon: Mail, key: "email" },
                { label: "Phone", value: profile.phone, icon: Phone, key: "phone" },
                { label: "Unit", value: profile.unit, icon: Home, key: "unit" },
              ].map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <field.icon size={14} className="text-muted shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-muted uppercase tracking-wider">{field.label}</p>
                    {editing ? (
                      <input
                        aria-label={field.label}
                        value={profile[field.key as keyof typeof profile] as string}
                        onChange={(e) =>
                          setProfile((p) => ({ ...p, [field.key]: e.target.value }))
                        }
                        className="w-full bg-midnight/60 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-lr-white mt-0.5 focus:outline-none focus:border-teal/40"
                      />
                    ) : (
                      <p className="text-sm text-lr-white">{field.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Payment Methods */}
        <motion.div variants={fadeUpItem}>
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-sm font-semibold text-lr-white flex items-center gap-2">
                <CreditCard size={14} className="text-teal" /> Payment Methods
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCard(!showAddCard)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal/10 text-teal hover:bg-teal/20 transition-colors flex items-center gap-1"
              >
                <Plus size={12} /> Add Card
              </button>
            </div>

            <AnimatePresence>
              {showAddCard && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-midnight/60 border border-white/10 rounded-xl p-4 mb-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-lr-white">Add New Card</p>
                      <button type="button" aria-label="Close" onClick={() => setShowAddCard(false)} className="text-muted hover:text-lr-white">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        aria-label="Card type"
                        value={newCard.type}
                        onChange={(e) => setNewCard((c) => ({ ...c, type: e.target.value as typeof c.type }))}
                        className="bg-slate-deep border border-white/10 rounded-lg px-3 py-2 text-sm text-lr-white"
                      >
                        <option value="visa">Visa</option>
                        <option value="mastercard">Mastercard</option>
                        <option value="amex">Amex</option>
                      </select>
                      <input
                        placeholder="Last 4 digits"
                        maxLength={4}
                        value={newCard.last4}
                        onChange={(e) => setNewCard((c) => ({ ...c, last4: e.target.value.replace(/\D/g, "") }))}
                        className="bg-slate-deep border border-white/10 rounded-lg px-3 py-2 text-sm text-lr-white placeholder:text-muted"
                      />
                      <input
                        placeholder="MM/YY"
                        maxLength={5}
                        value={newCard.expiry}
                        onChange={(e) => setNewCard((c) => ({ ...c, expiry: e.target.value }))}
                        className="bg-slate-deep border border-white/10 rounded-lg px-3 py-2 text-sm text-lr-white placeholder:text-muted"
                      />
                      <input
                        placeholder="Cardholder Name"
                        value={newCard.cardholderName}
                        onChange={(e) => setNewCard((c) => ({ ...c, cardholderName: e.target.value }))}
                        className="bg-slate-deep border border-white/10 rounded-lg px-3 py-2 text-sm text-lr-white placeholder:text-muted"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCard}
                      className="w-full py-2 rounded-lg text-xs font-semibold bg-teal text-midnight"
                    >
                      Save Card
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <AnimatePresence>
                {cards.map((card) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-midnight/40 border border-white/5"
                  >
                    <CardBrandIcon type={card.type} />
                    <div className="flex-1">
                      <p className="text-sm text-lr-white font-medium">
                        •••• •••• •••• {card.last4}
                      </p>
                      <p className="text-muted text-[10px]">
                        Expires {card.expiry} · {card.cardholderName}
                      </p>
                    </div>
                    {card.isDefault ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal/10 text-teal">
                        Default
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(card.id)}
                        className="text-[10px] text-muted hover:text-lr-white transition-colors"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Remove card"
                      onClick={() => handleRemoveCard(card.id)}
                      className="text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </GlassCard>
        </motion.div>

        {/* Preferences */}
        <motion.div variants={fadeUpItem}>
          <GlassCard className="p-5">
            <h3 className="font-heading text-sm font-semibold text-lr-white mb-4 flex items-center gap-2">
              <Bell size={14} className="text-teal" /> Preferences
            </h3>
            <div className="space-y-4">
              {[
                {
                  key: "notifications" as const,
                  label: "Push Notifications",
                  desc: "Get notified about bookings and updates",
                  icon: Bell,
                },
                {
                  key: "marketing" as const,
                  label: "Email Updates",
                  desc: "Receive news and special offers",
                  icon: Mail,
                },
                {
                  key: "sms" as const,
                  label: "SMS Alerts",
                  desc: "Get text messages for urgent updates",
                  icon: Smartphone,
                },
              ].map((pref) => (
                <div key={pref.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <pref.icon size={14} className="text-muted" />
                    <div>
                      <p className="text-sm text-lr-white">{pref.label}</p>
                      <p className="text-[11px] text-muted">{pref.desc}</p>
                    </div>
                  </div>
                  <Toggle
                    label={pref.label}
                    checked={profile.preferences[pref.key]}
                    onChange={(v) =>
                      setProfile((p) => ({
                        ...p,
                        preferences: { ...p.preferences, [pref.key]: v },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Install App */}
        <InstallAppRow />
      </motion.div>
    </div>
  );
}

function InstallAppRow() {
  const { canShowInstall, triggerInstall } = usePWA();
  if (!canShowInstall) return null;
  return (
    <motion.div variants={fadeUpItem}>
      <GlassCard className="p-5">
        <button
          type="button"
          onClick={triggerInstall}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-3">
            <Download size={16} className="text-teal" />
            <div>
              <p className="text-sm font-semibold text-lr-white">Install App</p>
              <p className="text-[11px] text-muted">Add LifeRise to your home screen</p>
            </div>
          </div>
          <span className="text-xs font-medium text-teal">Install</span>
        </button>
      </GlassCard>
    </motion.div>
  );
}
