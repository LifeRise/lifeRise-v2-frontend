'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import {
  AdminPageShell,
  DataTable,
  FilterBar,
  Pagination,
  ConfirmDialog,
  StatusPill,
} from '@/components/admin';
import { useAdminList, useAdminMutation } from '@/lib/api/admin/hooks';
import { GlassCard } from '@/components/ui/GlassCard';

interface EventBooking {
  id: number;
  event_id: number;
  customer_id: number;
  status: string;
  booked_at: string;
}

export default function EventBookingsPage() {
  const [filters, setFilters] = useState({ search: '', event_id: '', status: '', page: 1 });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, meta, isLoading, error, refresh } = useAdminList<EventBooking>(
    'event-bookings',
    filters
  );
  const { remove, isPending } = useAdminMutation<EventBooking>('event-bookings');

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
      title="Event Bookings"
      subtitle={`${meta?.total ?? 0} bookings`}
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
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </FilterBar>
      }
    >
      <GlassCard>
        <DataTable
          columns={[
            { key: 'event', header: 'Event', render: (row) => `#${row.event_id}` },
            { key: 'customer', header: 'Customer', render: (row) => `#${row.customer_id}` },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusPill status={row.status} />,
            },
            {
              key: 'booked',
              header: 'Booked At',
              render: (row) => new Date(row.booked_at).toLocaleString(),
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
        title="Delete Booking"
        description="Are you sure you want to delete this event booking? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </AdminPageShell>
  );
}
