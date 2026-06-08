'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
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

interface GroupEvent {
  id: number;
  title: string;
  start_at: string;
  capacity?: number;
  status: string;
}

export default function EventsPage() {
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, meta, isLoading, error, refresh } = useSupabaseList<GroupEvent>('group_events', {
    ...filters,
    searchColumn: 'title',
  });
  const { remove, isPending } = useAdminMutation<GroupEvent>('group-events');

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
      title="Group Events"
      subtitle={`${meta?.total ?? 0} events`}
      action={
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={16} />
          New Event
        </button>
      }
      filters={
        <FilterBar
          searchPlaceholder="Search by title..."
          onSearchChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
        >
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-lr-white text-sm focus:outline-none focus:border-purple-accent/50"
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </FilterBar>
      }
    >
      <GlassCard>
        <DataTable
          columns={[
            {
              key: 'title',
              header: 'Title',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-purple-accent" />
                  <span className="font-medium">{row.title}</span>
                </div>
              ),
            },
            {
              key: 'start',
              header: 'Start',
              render: (row) => new Date(row.start_at).toLocaleString(),
            },
            { key: 'capacity', header: 'Capacity', render: (row) => row.capacity ?? 'Unlimited' },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusPill status={row.status} />,
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
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </AdminPageShell>
  );
}
