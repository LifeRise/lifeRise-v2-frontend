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
