'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  children: (activeTab: string) => React.ReactNode;
  className?: string;
  tabClassName?: string;
  indicatorClassName?: string;
}

export function Tabs({
  tabs,
  defaultTab,
  onChange,
  children,
  className,
  tabClassName,
  indicatorClassName,
}: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);

  const handleSelect = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  return (
    <div className={className}>
      <div className="relative flex items-center gap-1 border-b border-white/[0.07]">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => handleSelect(tab.id)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              active === tab.id ? 'text-lr-white' : 'text-muted hover:text-lr-white/80',
              tabClassName
            )}
          >
            {tab.label}
            {active === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className={cn(
                  'absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-teal',
                  indicatorClassName
                )}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="mt-5"
        >
          {children(active)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
