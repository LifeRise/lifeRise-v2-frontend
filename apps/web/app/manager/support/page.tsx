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

interface SupportTicket {
  id: number;
  subject: string;
  status: string;
  priority: string;
  requester_email?: string;
  assignee_user_id?: number;
  created_at: string;
}

export default function SupportPage() {
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', page: 1 });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, meta, isLoading, error, refresh } = useSupabaseList<SupportTicket>(
    'support_tickets',
    {
      ...filters,
      searchColumn: 'subject',
    }
  );
  const { remove, isPending } = useAdminMutation<SupportTicket>('support');

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
      title="Support Tickets"
      subtitle={`${meta?.total ?? 0} tickets`}
      action={
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={16} />
          New Ticket
        </button>
      }
      filters={
        <FilterBar
          searchPlaceholder="Search by subject..."
          onSearchChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
        >
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-lr-white text-sm focus:outline-none focus:border-purple-accent/50"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value, page: 1 }))}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-lr-white text-sm focus:outline-none focus:border-purple-accent/50"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </FilterBar>
      }
    >
      <GlassCard>
        <DataTable
          columns={[
            { key: 'subject', header: 'Subject', render: (row) => row.subject },
            { key: 'requester', header: 'Requester', render: (row) => row.requester_email ?? '—' },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusPill status={row.status} />,
            },
            {
              key: 'priority',
              header: 'Priority',
              render: (row) => <StatusPill status={row.priority} />,
            },
            {
              key: 'assignee',
              header: 'Assignee',
              render: (row) => row.assignee_user_id ?? 'Unassigned',
            },
            {
              key: 'created',
              header: 'Created',
              render: (row) => new Date(row.created_at).toLocaleDateString(),
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
        title="Delete Ticket"
        description="Are you sure you want to delete this ticket? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </AdminPageShell>
  );
}
