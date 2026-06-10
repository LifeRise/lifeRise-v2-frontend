import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** Safely parse an ISO-ish date string and format it for display.
 *  Returns fallback string (default '—') for null, undefined, empty, or invalid values. */
export function safeFormatDate(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Safely parse an ISO-ish datetime string and format it for display. */
export function safeFormatDateTime(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Map a color key to Tailwind text + background utility classes for KPI strips */
export const kpiColorClasses: Record<string, { text: string; bg: string }> = {
  teal: { text: 'text-teal', bg: 'bg-teal/10' },
  gold: { text: 'text-gold', bg: 'bg-gold/10' },
  purple: { text: 'text-purple-accent', bg: 'bg-purple-accent/10' },
  emerald: { text: 'text-emerald', bg: 'bg-emerald/10' },
  rose: { text: 'text-rose', bg: 'bg-rose/10' },
};

/** Generate an inline style color string from a CSS variable name */
export function cssVarColor(name: string): string {
  return `var(--color-${name})`;
}

/** Clamp a number between min and max (inclusive) */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Truncate a string to maxLength, appending ellipsis if cut */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 1)}…`;
}
