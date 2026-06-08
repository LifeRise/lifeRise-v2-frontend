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

interface Booking {
  id: number;
  booking_number: string;
  customer_id: number;
  service_id: number;
  service_provider_id: number;
  status: string;
  booking_date: string;
  final_price: number;
}

export default function BookingsPage() {
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, meta, isLoading, error, refresh } = useSupabaseList<Booking>('bookings', {
    ...filters,
    searchColumn: 'booking_number',
  });
  const { remove, isPending } = useAdminMutation<Booking>('bookings');

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
      title="Bookings"
      subtitle={`${meta?.total ?? 0} bookings`}
      action={
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={16} />
          New Booking
        </button>
      }
      filters={
        <FilterBar
          searchPlaceholder="Search by booking number..."
          onSearchChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
        >
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-lr-white text-sm focus:outline-none focus:border-purple-accent/50"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Current">Current</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </FilterBar>
      }
    >
      <GlassCard>
        <DataTable
          columns={[
            { key: 'booking_number', header: 'Booking #', render: (row) => row.booking_number },
            { key: 'customer', header: 'Customer', render: (row) => `#${row.customer_id}` },
            { key: 'service', header: 'Service', render: (row) => `#${row.service_id}` },
            { key: 'provider', header: 'Provider', render: (row) => `#${row.service_provider_id}` },
            {
              key: 'date',
              header: 'Date',
              render: (row) => new Date(row.booking_date).toLocaleDateString(),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusPill status={row.status} />,
            },
            { key: 'price', header: 'Final Price', render: (row) => `$${row.final_price}` },
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
        description="Are you sure you want to delete this booking? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </AdminPageShell>
  );
}
