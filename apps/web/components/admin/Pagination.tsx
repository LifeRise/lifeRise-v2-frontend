'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaginationMeta, PaginationLinks } from '@/lib/api/admin/_factory';

interface PaginationProps {
  meta: PaginationMeta | null;
  links: PaginationLinks | null;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, links, onPageChange }: PaginationProps) {
  if (!meta || meta.last_page <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs text-muted">
        Showing <span className="text-lr-white font-medium">{meta.from}</span> to{' '}
        <span className="text-lr-white font-medium">{meta.to}</span> of{' '}
        <span className="text-lr-white font-medium">{meta.total}</span> results
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => links?.prev && onPageChange(meta.current_page - 1)}
          disabled={!links?.prev}
          className={cn(
            'p-2 rounded-lg transition-colors',
            links?.prev ? 'hover:bg-white/10 text-lr-white' : 'text-muted cursor-not-allowed'
          )}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm text-lr-white px-2">
          Page {meta.current_page} of {meta.last_page}
        </span>
        <button
          type="button"
          onClick={() => links?.next && onPageChange(meta.current_page + 1)}
          disabled={!links?.next}
          className={cn(
            'p-2 rounded-lg transition-colors',
            links?.next ? 'hover:bg-white/10 text-lr-white' : 'text-muted cursor-not-allowed'
          )}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
