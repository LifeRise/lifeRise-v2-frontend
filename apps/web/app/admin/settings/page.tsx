'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Bell, CreditCard, AlertTriangle, RotateCcw, Check } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { staggerContainerResponsive, fadeUpItem } from '@/lib/animations';
import { cn } from '@/lib/utils';

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label ? `Toggle ${label}` : 'Toggle'}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors',
        checked ? 'bg-purple-accent' : 'bg-slate-light'
      )}
    >
      <motion.div
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

const ACCENT = '#EF4444';

export default function SettingsPage() {
  const [platformName, setPlatformName] = useState('LifeRise Solutions');
  const [supportEmail, setSupportEmail] = useState('support@liferise.com');
  const [platformFee, setPlatformFee] = useState('12');
  const [toggles, setToggles] = useState({
    vendorApprovalAlerts: true,
    dailyPlatformDigest: true,
    fraudAlerts: true,
    maintenanceMode: false,
  });
  const [resetting, setResetting] = useState(false);

  const handleReset = () => {
    setResetting(true);
    setTimeout(() => setResetting(false), 2000);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto pb-24 lg:pb-8">
      <SectionHeader title="Platform Settings" />

      <motion.div
        variants={staggerContainerResponsive(0.06)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="space-y-5"
      >
        {/* Platform Info */}
        <motion.div variants={fadeUpItem}>
          <GlassCard className="p-5 border-l-2 border-l-[#EF4444]">
            <h3 className="font-heading text-sm font-semibold text-lr-white mb-4 flex items-center gap-2">
              <Building2 size={14} style={{ color: ACCENT }} /> Platform Configuration
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
                  Platform Name
                </p>
                <input
                  aria-label="Platform name"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full bg-midnight/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-lr-white focus:outline-none focus:border-[#EF4444]/40"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
                  Support Email
                </p>
                <input
                  aria-label="Support email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full bg-midnight/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-lr-white focus:outline-none focus:border-[#EF4444]/40"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
                  Platform Fee (%)
                </p>
                <input
                  aria-label="Platform fee percentage"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(e.target.value)}
                  className="w-full bg-midnight/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-lr-white focus:outline-none focus:border-[#EF4444]/40"
                />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Notification Rules */}
        <motion.div variants={fadeUpItem}>
          <GlassCard className="p-5 border-l-2 border-l-[#EF4444]">
            <h3 className="font-heading text-sm font-semibold text-lr-white mb-4 flex items-center gap-2">
              <Bell size={14} style={{ color: ACCENT }} /> Admin Notification Rules
            </h3>
            <div className="space-y-4">
              {[
                {
                  key: 'vendorApprovalAlerts' as const,
                  label: 'Vendor Approval Alerts',
                  desc: 'Notify when a vendor application needs review',
                },
                {
                  key: 'dailyPlatformDigest' as const,
                  label: 'Daily Platform Digest',
                  desc: 'Platform-wide activity summary email',
                },
                {
                  key: 'fraudAlerts' as const,
                  label: 'Fraud & Abuse Alerts',
                  desc: 'Immediate alert on suspicious activity',
                },
                {
                  key: 'maintenanceMode' as const,
                  label: 'Maintenance Mode',
                  desc: 'Take the platform offline for maintenance',
                },
              ].map((rule) => (
                <div key={rule.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-lr-white">{rule.label}</p>
                    <p className="text-[11px] text-muted">{rule.desc}</p>
                  </div>
                  <Toggle
                    label={rule.label}
                    checked={toggles[rule.key]}
                    onChange={(v) => setToggles((prev) => ({ ...prev, [rule.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Billing */}
        <motion.div variants={fadeUpItem}>
          <GlassCard className="p-5 border-l-2 border-l-[#EF4444]">
            <h3 className="font-heading text-sm font-semibold text-lr-white mb-4 flex items-center gap-2">
              <CreditCard size={14} style={{ color: ACCENT }} /> Platform Billing
            </h3>
            <div className="p-3 rounded-xl bg-midnight/40 border border-white/5 mb-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-lr-white font-medium">LifeRise Enterprise</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal/10 text-teal">
                  Active
                </span>
              </div>
              <p className="text-muted text-xs">Next invoice: July 1, 2026</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-lg bg-midnight/40 border border-white/5">
                <p className="text-lg font-heading font-bold text-lr-white">1,482</p>
                <p className="text-[10px] text-muted">Users</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-midnight/40 border border-white/5">
                <p className="text-lg font-heading font-bold text-lr-white">84</p>
                <p className="text-[10px] text-muted">Vendors</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-midnight/40 border border-white/5">
                <p className="text-lg font-heading font-bold text-lr-white">12</p>
                <p className="text-[10px] text-muted">Properties</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Danger Zone */}
        <motion.div variants={fadeUpItem}>
          <GlassCard className="p-5 border-l-2 border-l-red-400/50">
            <h3 className="font-heading text-sm font-semibold text-lr-white mb-4 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400" /> Danger Zone
            </h3>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className={cn(
                'w-full py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2',
                resetting
                  ? 'bg-teal/15 text-teal'
                  : 'bg-red-400/10 text-red-400 hover:bg-red-400/20 border border-red-400/20'
              )}
            >
              {resetting ? <Check size={14} /> : <RotateCcw size={14} />}
              {resetting ? 'Demo data reset!' : 'Reset Demo Data'}
            </button>
            <p className="text-muted text-[10px] mt-2 text-center">
              This will restore all mock data to its original state.
            </p>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
