'use client';

import * as RadixSelect from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className,
}: SelectProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  return (
    <RadixSelect.Root value={value} onValueChange={onChange}>
      <RadixSelect.Trigger
        className={cn(
          'inline-flex items-center justify-between w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-lr-white text-sm focus:outline-none focus:border-purple-accent/50 data-[state=open]:border-purple-accent/50 transition-colors',
          className
        )}
        aria-label={placeholder}
      >
        <RadixSelect.Value placeholder={placeholder}>{selectedLabel}</RadixSelect.Value>
        <RadixSelect.Icon>
          <ChevronDown size={14} className="text-muted" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 w-[--radix-select-trigger-width] rounded-xl border border-white/10 bg-slate-deep shadow-2xl overflow-hidden"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                className={cn(
                  'relative flex items-center px-3 py-2 rounded-lg text-sm text-lr-white cursor-pointer select-none',
                  'hover:bg-white/5 focus:bg-white/5 focus:outline-none',
                  'data-[state=checked]:text-purple-accent data-[state=checked]:bg-purple-accent/10'
                )}
              >
                <span className="flex-1">{option.label}</span>
                <RadixSelect.ItemIndicator>
                  <Check size={14} className="text-purple-accent" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
