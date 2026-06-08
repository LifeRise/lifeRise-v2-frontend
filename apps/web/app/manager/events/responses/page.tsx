'use client';

import { useState } from 'react';
import { AdminPageShell, DataTable, FilterBar, Pagination } from '@/components/admin';
import { useSupabaseList } from '@/lib/supabase/admin-hooks';
import { GlassCard } from '@/components/ui/GlassCard';

interface EventResponse {
  id: number;
  event_id: number;
  customer_id: number;
  response: string;
  responded_at: string;
}

export default function EventResponsesPage() {
  const [filters, setFilters] = useState({ search: '', event_id: '', response: '', page: 1 });
  const { data, meta, isLoading, error, refresh } = useSupabaseList<EventResponse>(
    'event_responses',
    filters
  );

  return (
    <AdminPageShell
      title="Event Responses"
      subtitle={`${meta?.total ?? 0} responses`}
      filters={
        <FilterBar
          searchPlaceholder="Search..."
          onSearchChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
        >
          <select
            value={filters.response}
            onChange={(e) => setFilters((f) => ({ ...f, response: e.target.value, page: 1 }))}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-lr-white text-sm focus:outline-none focus:border-purple-accent/50"
          >
            <option value="">All Responses</option>
            <option value="going">Going</option>
            <option value="maybe">Maybe</option>
            <option value="declined">Declined</option>
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
              key: 'response',
              header: 'Response',
              render: (row) => <span className="capitalize">{row.response}</span>,
            },
            {
              key: 'responded',
              header: 'Responded At',
              render: (row) => new Date(row.responded_at).toLocaleString(),
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
