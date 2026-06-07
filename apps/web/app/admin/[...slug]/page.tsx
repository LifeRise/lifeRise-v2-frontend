'use client';

import { motion } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { Sparkles, ArrowLeft } from 'lucide-react';

const sectionNames: Record<string, { label: string; emoji: string; desc: string }> = {
  analytics: {
    label: 'Analytics',
    emoji: '📊',
    desc: 'Platform-wide reports on usage, revenue, and service adoption.',
  },
  users: { label: 'Users', emoji: '👥', desc: 'Manage all platform users across all roles.' },
  roles: { label: 'Roles', emoji: '🔐', desc: 'Define platform roles and permission levels.' },
  companies: {
    label: 'Companies',
    emoji: '🏢',
    desc: 'Manage vendor and affiliate company accounts.',
  },
  locations: {
    label: 'Locations',
    emoji: '📍',
    desc: 'Configure regions, cities, and neighborhoods.',
  },
  banners: {
    label: 'App Banners',
    emoji: '🖼️',
    desc: 'Manage promotional banners shown in the resident app.',
  },
  services: { label: 'Services', emoji: '🔧', desc: 'Manage service listings and categories.' },
  settings: {
    label: 'Settings',
    emoji: '⚙️',
    desc: 'Configure platform-wide settings and integrations.',
  },
  support: {
    label: 'Support',
    emoji: '🎧',
    desc: 'Review and respond to platform support tickets.',
  },
};

export default function AdminSubPage() {
  const router = useRouter();
  const pathname = usePathname();
  const slug = pathname.split('/').pop() ?? '';
  const section = sectionNames[slug] ?? {
    label: slug.charAt(0).toUpperCase() + slug.slice(1),
    emoji: '✨',
    desc: 'This section is coming soon.',
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass rounded-3xl p-10 max-w-md w-full"
      >
        <div className="text-5xl mb-5">{section.emoji}</div>
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles size={14} className="text-red-400" />
          <span className="text-red-400 text-xs font-bold uppercase tracking-widest">
            Coming Soon
          </span>
        </div>
        <h1 className="font-heading font-extrabold text-lr-white text-3xl mb-3">{section.label}</h1>
        <p className="text-muted text-sm leading-relaxed mb-8">{section.desc}</p>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 bg-red-500"
        >
          <ArrowLeft size={15} /> Back to Overview
        </button>
      </motion.div>
    </div>
  );
}
