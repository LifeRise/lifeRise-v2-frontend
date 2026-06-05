'use client';

import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  children?: React.ReactNode;
  className?: string;
}

export function FilterBar({
  searchPlaceholder = 'Search...',
  onSearchChange,
  children,
  className,
}: FilterBarProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => onSearchChange(value), 300);
    return () => clearTimeout(timeout);
  }, [value, onSearchChange]);

  return (
    <div className={cn('flex flex-col sm:flex-row gap-3', className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-lr-white text-sm placeholder:text-muted focus:outline-none focus:border-purple-accent/50 transition-colors"
        />
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
