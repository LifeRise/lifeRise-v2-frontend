'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Building2, Wrench, Users, ArrowRight } from 'lucide-react';

const roles = [
  {
    key: 'resident' as const,
    label: 'Resident',
    description: 'Browse & book services for your home',
    icon: Building2,
    href: '/signup/resident',
    accent: '#00D4AA',
    bg: 'rgba(0,212,170,0.08)',
    border: 'rgba(0,212,170,0.25)',
  },
  {
    key: 'vendor' as const,
    label: 'Service Provider',
    description: 'Manage bookings & track earnings',
    icon: Wrench,
    href: '/signup/vendor',
    accent: '#F5A623',
    bg: 'rgba(245,166,35,0.08)',
    border: 'rgba(245,166,35,0.25)',
  },
  {
    key: 'manager' as const,
    label: 'Property Manager',
    description: 'Oversee complex operations',
    icon: Users,
    href: '/signup/resident?role=manager',
    accent: '#818CF8',
    bg: 'rgba(129,140,248,0.08)',
    border: 'rgba(129,140,248,0.25)',
  },
];

export default function SignupRolePage() {
  return (
    <div className="relative min-h-screen gradient-mesh flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-125 h-125 rounded-full opacity-20 blur-[100px] orb-teal" />
        <div className="absolute -bottom-32 -right-32 w-125 h-125 rounded-full opacity-15 blur-[100px] orb-gold" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Image
            src="/liferise_logo.png"
            alt="LifeRise"
            width={64}
            height={64}
            className="h-16 w-auto object-contain mx-auto mb-4"
            priority
          />
          <h1 className="font-heading font-extrabold text-lr-white text-4xl leading-tight mb-2">
            Sign Up
          </h1>
          <p className="text-muted text-sm">Choose your account type to get started</p>
        </div>

        <div className="space-y-3">
          {roles.map((role, i) => (
            <motion.div
              key={role.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
            >
              <Link
                href={role.href}
                className="flex items-center gap-4 p-4 rounded-2xl border text-left transition-all group cursor-pointer hover:scale-[1.01]"
                style={{ background: role.bg, borderColor: role.border }}
              >
                <div
                  className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
                  style={{
                    background: `${role.accent}20`,
                    border: `1px solid ${role.accent}30`,
                  }}
                >
                  <role.icon size={20} style={{ color: role.accent }} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lr-white text-sm">{role.label}</p>
                  <p className="text-muted text-xs mt-0.5">{role.description}</p>
                </div>
                <ArrowRight
                  size={16}
                  className="text-muted group-hover:text-lr-white transition-colors"
                />
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-muted text-xs mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-teal hover:opacity-80 transition-opacity font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
