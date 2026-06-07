'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
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

interface Announcement {
  id: number;
  title: string;
  audience: string;
  priority: string;
  published_at: string;
  expires_at?: string;
}

export default function AnnouncementsPage() {
  const [filters, setFilters] = useState({ search: '', audience: '', priority: '', page: 1 });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, meta, isLoading, error, refresh } = useAdminList<Announcement>(
    'announcements',
    filters
  );
  const { remove, isPending } = useAdminMutation<Announcement>('announcements');

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
      title="Announcements"
      subtitle={`${meta?.total ?? 0} announcements`}
      action={
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={16} />
          New Announcement
        </button>
      }
      filters={
        <FilterBar
          searchPlaceholder="Search by title..."
          onSearchChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
        >
          <select
            value={filters.audience}
            onChange={(e) => setFilters((f) => ({ ...f, audience: e.target.value, page: 1 }))}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-lr-white text-sm focus:outline-none focus:border-purple-accent/50"
          >
            <option value="">All Audiences</option>
            <option value="all">All</option>
            <option value="residents">Residents</option>
            <option value="vendors">Vendors</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value, page: 1 }))}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-lr-white text-sm focus:outline-none focus:border-purple-accent/50"
          >
            <option value="">All Priorities</option>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
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
                  <Megaphone size={14} className="text-purple-accent" />
                  <span className="font-medium">{row.title}</span>
                </div>
              ),
            },
            {
              key: 'audience',
              header: 'Audience',
              render: (row) => <span className="capitalize">{row.audience}</span>,
            },
            {
              key: 'priority',
              header: 'Priority',
              render: (row) => <StatusPill status={row.priority} />,
            },
            {
              key: 'published',
              header: 'Published',
              render: (row) => new Date(row.published_at).toLocaleDateString(),
            },
            {
              key: 'expires',
              header: 'Expires',
              render: (row) =>
                row.expires_at ? new Date(row.expires_at).toLocaleDateString() : '—',
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
        title="Delete Announcement"
        description="Are you sure you want to delete this announcement? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </AdminPageShell>
  );
}
