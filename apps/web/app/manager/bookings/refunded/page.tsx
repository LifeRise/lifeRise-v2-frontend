'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { AdminPageShell, DataTable, FilterBar, Pagination } from '@/components/admin';
import { useAdminList } from '@/lib/api/admin/hooks';
import { GlassCard } from '@/components/ui/GlassCard';

interface RefundedBooking {
  id: number;
  booking_number: string;
  customer_id: number;
  amount: number;
  reason?: string;
  refunded_at: string;
}

export default function RefundedBookingsPage() {
  const [filters, setFilters] = useState({ search: '', date_from: '', date_to: '', page: 1 });
  const { data, meta, isLoading, error, refresh } = useAdminList<RefundedBooking>(
    'bookings/refunded',
    filters
  );

  return (
    <AdminPageShell
      title="Refunded Bookings"
      subtitle={`${meta?.total ?? 0} refunds`}
      action={
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          <Download size={16} />
          Export CSV
        </button>
      }
      filters={
        <FilterBar
          searchPlaceholder="Search by booking number..."
          onSearchChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
        />
      }
    >
      <GlassCard>
        <DataTable
          columns={[
            { key: 'booking_number', header: 'Booking #', render: (row) => row.booking_number },
            { key: 'customer', header: 'Customer', render: (row) => `#${row.customer_id}` },
            { key: 'amount', header: 'Amount', render: (row) => `$${row.amount}` },
            { key: 'reason', header: 'Reason', render: (row) => row.reason ?? '—' },
            {
              key: 'refunded_at',
              header: 'Refunded At',
              render: (row) => new Date(row.refunded_at).toLocaleDateString(),
            },
          ]}
          rows={data ?? []}
          isLoading={isLoading}
          error={error}
          onRetry={refresh}
          keyExtractor={(row) => row.id}
        />
      </GlassCard>

      <Pagination
        meta={meta}
        links={null}
        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
      />
    </AdminPageShell>
  );
}
