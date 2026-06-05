import { cn } from '@/lib/utils';

type PortalVariant = 'resident' | 'vendor' | 'manager';

interface StatusBadgeProps {
  status: string;
  variant?: PortalVariant;
  className?: string;
}

const statusMap: Record<string, Record<PortalVariant, string>> = {
  confirmed: {
    resident: 'bg-teal/15 text-teal border-teal/20',
    vendor: 'bg-teal/15 text-teal border-teal/20',
    manager: 'bg-teal/15 text-teal border-teal/20',
  },
  pending: {
    resident: 'bg-gold/15 text-gold border-gold/20',
    vendor: 'bg-gold/15 text-gold border-gold/20',
    manager: 'bg-gold/15 text-gold border-gold/20',
  },
  completed: {
    resident: 'bg-purple-accent/15 text-purple-accent border-purple-accent/20',
    vendor: 'bg-purple-accent/15 text-purple-accent border-purple-accent/20',
    manager: 'bg-purple-accent/15 text-purple-accent border-purple-accent/20',
  },
  cancelled: {
    resident: 'bg-red-500/15 text-red-400 border-red-500/20',
    vendor: 'bg-red-500/15 text-red-400 border-red-500/20',
    manager: 'bg-red-500/15 text-red-400 border-red-500/20',
  },
  paid: {
    resident: 'bg-teal/15 text-teal border-teal/20',
    vendor: 'bg-teal/15 text-teal border-teal/20',
    manager: 'bg-teal/15 text-teal border-teal/20',
  },
  'in-progress': {
    resident: 'bg-gold/15 text-gold border-gold/20',
    vendor: 'bg-gold/15 text-gold border-gold/20',
    manager: 'bg-gold/15 text-gold border-gold/20',
  },
  upcoming: {
    resident: 'bg-slate-light/40 text-muted border-white/10',
    vendor: 'bg-slate-light/40 text-muted border-white/10',
    manager: 'bg-slate-light/40 text-muted border-white/10',
  },
  active: {
    resident: 'bg-teal/15 text-teal border-teal/20',
    vendor: 'bg-gold/15 text-gold border-gold/20',
    manager: 'bg-purple-accent/15 text-purple-accent border-purple-accent/20',
  },
  inactive: {
    resident: 'bg-slate-light/40 text-muted border-white/10',
    vendor: 'bg-slate-light/40 text-muted border-white/10',
    manager: 'bg-slate-light/40 text-muted border-white/10',
  },
  approved: {
    resident: 'bg-teal/15 text-teal border-teal/20',
    vendor: 'bg-teal/15 text-teal border-teal/20',
    manager: 'bg-teal/15 text-teal border-teal/20',
  },
  rejected: {
    resident: 'bg-red-500/15 text-red-400 border-red-500/20',
    vendor: 'bg-red-500/15 text-red-400 border-red-500/20',
    manager: 'bg-red-500/15 text-red-400 border-red-500/20',
  },
};

function getStatusClass(status: string, variant: PortalVariant): string {
  const normalized = status.toLowerCase();
  if (statusMap[normalized]) {
    return statusMap[normalized][variant];
  }
  // Fallback per portal
  const fallback: Record<PortalVariant, string> = {
    resident: 'bg-teal/10 text-teal border-teal/15',
    vendor: 'bg-gold/10 text-gold border-gold/15',
    manager: 'bg-purple-accent/10 text-purple-accent border-purple-accent/15',
  };
  return fallback[variant];
}

export function StatusBadge({ status, variant = 'resident', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
        getStatusClass(status, variant),
        className
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' ')}
    </span>
  );
}
