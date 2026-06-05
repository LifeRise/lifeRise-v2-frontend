import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center text-center px-6 py-16', className)}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-deep border border-white/[0.07]">
        {icon || <Sparkles className="h-6 w-6 text-muted" />}
      </div>
      <h3 className="font-heading text-lg font-semibold text-lr-white">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
