'use client';

import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  rowActions?: (row: T) => React.ReactNode;
  keyExtractor: (row: T) => string | number;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-white/5 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T>({
  columns,
  rows,
  isLoading,
  error,
  onRetry,
  rowActions,
  keyExtractor,
}: DataTableProps<T>) {
  const totalCols = columns.length + (rowActions ? 1 : 0);

  if (error) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-400 mb-3" />
        <p className="text-lr-white font-medium mb-2">Error loading data</p>
        <p className="text-muted text-sm mb-4">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!isLoading && rows.length === 0) {
    return (
      <div className="glass rounded-2xl p-8">
        <EmptyState title="No results" description="There are no items to display." />
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-muted uppercase text-[10px] tracking-wider">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 font-semibold whitespace-nowrap',
                    col.width && `w-[${col.width}]`
                  )}
                >
                  {col.header}
                </th>
              ))}
              {rowActions && <th className="px-4 py-3 w-16" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={totalCols} />)
              : rows.map((row) => (
                  <tr key={keyExtractor(row)} className="hover:bg-white/[0.02] transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-lr-white whitespace-nowrap">
                        {col.render(row)}
                      </td>
                    ))}
                    {rowActions && (
                      <td key="actions" className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">{rowActions(row)}</div>
                      </td>
                    )}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
