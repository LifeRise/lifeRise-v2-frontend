'use client';

import { useState, useRef, useEffect } from 'react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getYear,
  setYear,
  setMonth,
  setHours,
  setMinutes,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string;
  onChange: (isoString: string) => void;
  placeholder?: string;
  includeTime?: boolean;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  includeTime = true,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    try {
      return value ? parseISO(value) : new Date();
    } catch {
      return new Date();
    }
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? parseISO(value) : null;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start so the first day aligns with the correct weekday (Sun = 0)
  const startWeekday = monthStart.getDay();
  const padDays = Array.from({ length: startWeekday }, (_, i) => {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - (startWeekday - i));
    return d;
  });
  const allDays = [...padDays, ...days];

  const handleSelectDay = (day: Date) => {
    let next = new Date(day);
    if (selectedDate && includeTime) {
      next = setHours(next, selectedDate.getHours());
      next = setMinutes(next, selectedDate.getMinutes());
    } else if (includeTime) {
      next = setHours(next, 12);
      next = setMinutes(next, 0);
    }
    onChange(next.toISOString());
    if (!includeTime) setOpen(false);
  };

  const handleTimeChange = (type: 'hour' | 'minute', val: string) => {
    if (!selectedDate) return;
    let next = new Date(selectedDate);
    const num = parseInt(val, 10);
    if (type === 'hour') next = setHours(next, num);
    if (type === 'minute') next = setMinutes(next, num);
    onChange(next.toISOString());
  };

  const displayValue = selectedDate
    ? includeTime
      ? format(selectedDate, "MMM d, yyyy 'at' HH:mm")
      : format(selectedDate, 'MMM d, yyyy')
    : placeholder;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center justify-between w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-lr-white text-sm focus:outline-none focus:border-purple-accent/50 transition-colors',
          open && 'border-purple-accent/50'
        )}
      >
        <span className={cn(!selectedDate && 'text-muted')}>{displayValue}</span>
        <Calendar size={14} className="text-muted shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-72 rounded-xl border border-white/10 bg-slate-deep shadow-2xl p-3">
          {/* Month/Year header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate((d) => subMonths(d, 1))}
              className="p-1 rounded-lg hover:bg-white/5 text-muted hover:text-lr-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <select
                value={viewDate.getMonth()}
                onChange={(e) => setViewDate((d) => setMonth(d, Number(e.target.value)))}
                className="bg-transparent text-sm text-lr-white font-medium focus:outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i} className="bg-slate-deep">
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={viewDate.getFullYear()}
                onChange={(e) => setViewDate((d) => setYear(d, Number(e.target.value)))}
                className="bg-transparent text-sm text-lr-white font-medium focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 11 }, (_, i) => getYear(new Date()) - 5 + i).map((y) => (
                  <option key={y} value={y} className="bg-slate-deep">
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setViewDate((d) => addMonths(d, 1))}
              className="p-1 rounded-lg hover:bg-white/5 text-muted hover:text-lr-white transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-muted py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {allDays.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, viewDate);
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    'h-8 w-8 rounded-lg text-xs flex items-center justify-center transition-colors',
                    !isCurrentMonth && 'text-muted/40',
                    isCurrentMonth && !isSelected && 'text-lr-white hover:bg-white/5',
                    isSelected && 'bg-purple-accent text-midnight font-semibold'
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {/* Time picker */}
          {includeTime && selectedDate && (
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
              <span className="text-xs text-muted">Time</span>
              <input
                type="number"
                min={0}
                max={23}
                value={String(selectedDate.getHours()).padStart(2, '0')}
                onChange={(e) => handleTimeChange('hour', e.target.value)}
                className="w-12 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-lr-white text-xs text-center focus:outline-none focus:border-purple-accent/50"
              />
              <span className="text-muted">:</span>
              <input
                type="number"
                min={0}
                max={59}
                value={String(selectedDate.getMinutes()).padStart(2, '0')}
                onChange={(e) => handleTimeChange('minute', e.target.value)}
                className="w-12 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-lr-white text-xs text-center focus:outline-none focus:border-purple-accent/50"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
