'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  AdminPageShell,
  DataTable,
  FilterBar,
  Pagination,
  ConfirmDialog,
  StatusPill,
} from '@/components/admin';
import { useAdminMutation } from '@/lib/api/admin/hooks';
import { useSupabaseList } from '@/lib/supabase/admin-hooks';
import { GlassCard } from '@/components/ui/GlassCard';

interface Waitlist {
  id: number;
  customer_id: number;
  service_id: number;
  provider_id: number;
  desired_date: string;
  status: string;
  notified_at?: string;
}

export default function WaitlistsPage() {
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, meta, isLoading, error, refresh } = useSupabaseList<Waitlist>(
    'waitlist_entries',
    filters
  );
  const { remove, isPending } = useAdminMutation<Waitlist>('waitlists');

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
      title="Waitlists"
      subtitle={`${meta?.total ?? 0} entries`}
      action={
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={16} />
          New Entry
        </button>
      }
      filters={
        <FilterBar
          searchPlaceholder="Search..."
          onSearchChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
        >
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-lr-white text-sm focus:outline-none focus:border-purple-accent/50"
          >
            <option value="">All Statuses</option>
            <option value="waiting">Waiting</option>
            <option value="notified">Notified</option>
            <option value="converted">Converted</option>
          </select>
        </FilterBar>
      }
    >
      <GlassCard>
        <DataTable
          columns={[
            { key: 'customer', header: 'Customer', render: (row) => `#${row.customer_id}` },
            { key: 'service', header: 'Service', render: (row) => `#${row.service_id}` },
            { key: 'provider', header: 'Provider', render: (row) => `#${row.provider_id}` },
            {
              key: 'date',
              header: 'Desired Date',
              render: (row) => new Date(row.desired_date).toLocaleDateString(),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusPill status={row.status} />,
            },
            {
              key: 'notified',
              header: 'Notified',
              render: (row) => (row.notified_at ? 'Yes' : 'No'),
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
        title="Delete Waitlist Entry"
        description="Are you sure you want to delete this entry? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </AdminPageShell>
  );
}
