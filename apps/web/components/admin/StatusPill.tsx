'use client';

import { cn } from '@/lib/utils';

const statusStyles: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  inactive: { bg: 'bg-slate-500/15', text: 'text-slate-400' },
  pending: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  suspended: { bg: 'bg-red-500/15', text: 'text-red-400' },
  open: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  resolved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  closed: { bg: 'bg-slate-500/15', text: 'text-slate-400' },
  in_progress: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  urgent: { bg: 'bg-red-500/15', text: 'text-red-400' },
  high: { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  normal: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  low: { bg: 'bg-slate-500/15', text: 'text-slate-400' },
};

interface StatusPillProps {
  status: string;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  const style = statusStyles[normalized] ?? { bg: 'bg-white/10', text: 'text-lr-white' };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        style.bg,
        style.text,
        className
      )}
    >
      {status}
    </span>
  );
}
