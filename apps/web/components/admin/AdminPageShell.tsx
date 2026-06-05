'use client';

import { SectionHeader } from '@/components/ui/SectionHeader';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { fadeUpItem } from '@/lib/animations';

interface AdminPageShellProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AdminPageShell({
  title,
  subtitle,
  action,
  filters,
  children,
  className,
}: AdminPageShellProps) {
  return (
    <div className={cn('px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto', className)}>
      <motion.div variants={fadeUpItem} initial="hidden" animate="show">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <SectionHeader title={title} subtitle={subtitle} />
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {filters && <div className="mb-4">{filters}</div>}
      </motion.div>
      {children}
    </div>
  );
}
