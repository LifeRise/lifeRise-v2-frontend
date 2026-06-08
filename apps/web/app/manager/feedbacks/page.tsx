'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Flag } from 'lucide-react';
import {
  AdminPageShell,
  DataTable,
  FilterBar,
  Pagination,
  ConfirmDialog,
} from '@/components/admin';
import { useAdminMutation } from '@/lib/api/admin/hooks';
import { useSupabaseList } from '@/lib/supabase/admin-hooks';
import { GlassCard } from '@/components/ui/GlassCard';

interface Feedback {
  id: number;
  customerId: number;
  serviceProviderId: number;
  serviceId?: number;
  rating?: number;
  review?: string;
  flagged_at?: string;
}

export default function FeedbacksPage() {
  const [filters, setFilters] = useState({ search: '', rating_min: '', rating_max: '', page: 1 });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, meta, isLoading, error, refresh } = useSupabaseList<Feedback>('feedbacks', {
    ...filters,
    searchColumn: 'review',
  });
  const { remove, isPending } = useAdminMutation<Feedback>('feedbacks');

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await remove(deleteId);
      setDeleteId(null);
      refresh();
    } catch {
      // handled by hook
    }
  };

  return (
    <AdminPageShell
      title="Feedbacks"
      subtitle={`${meta?.total ?? 0} feedbacks`}
      action={
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={16} />
          New Feedback
        </button>
      }
      filters={
        <FilterBar
          searchPlaceholder="Search..."
          onSearchChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
        >
          <select
            value={filters.rating_min}
            onChange={(e) => setFilters((f) => ({ ...f, rating_min: e.target.value, page: 1 }))}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-lr-white text-sm focus:outline-none focus:border-purple-accent/50"
          >
            <option value="">Min Rating</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5</option>
          </select>
        </FilterBar>
      }
    >
      <GlassCard>
        <DataTable
          columns={[
            { key: 'customer', header: 'Customer', render: (row) => `#${row.customerId}` },
            { key: 'provider', header: 'Provider', render: (row) => `#${row.serviceProviderId}` },
            { key: 'rating', header: 'Rating', render: (row) => row.rating ?? '—' },
            {
              key: 'review',
              header: 'Review',
              render: (row) => <span className="truncate max-w-xs block">{row.review ?? '—'}</span>,
            },
            {
              key: 'flagged',
              header: 'Flagged',
              render: (row) => (row.flagged_at ? <Flag size={14} className="text-red-400" /> : '—'),
            },
          ]}
          rows={data ?? []}
          isLoading={isLoading}
          error={error}
          onRetry={refresh}
          keyExtractor={(row) => row.id}
          rowActions={(row) => [
            <button
              key="edit"
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-lr-white transition-colors"
            >
              <Pencil size={14} />
            </button>,
            <button
              key="delete"
              onClick={() => setDeleteId(row.id)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>,
          ]}
        />
      </GlassCard>

      <Pagination
        meta={meta}
        links={null}
        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Feedback"
        description="Are you sure you want to delete this feedback? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </AdminPageShell>
  );
}
