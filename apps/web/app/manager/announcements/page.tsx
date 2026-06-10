'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Megaphone, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AdminPageShell,
  DataTable,
  FilterBar,
  Pagination,
  ConfirmDialog,
  StatusPill,
} from '@/components/admin';
import { useAdminList, useAdminMutation } from '@/lib/api/admin/hooks';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { GlassCard } from '@/components/ui/GlassCard';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { safeFormatDate } from '@/lib/utils';

interface Announcement {
  id: number;
  title: string;
  audience: string;
  priority: string;
  published_at: string;
  expires_at?: string;
}

const audienceOptions = [
  { value: 'all', label: 'All' },
  { value: 'residents', label: 'Residents' },
  { value: 'vendors', label: 'Vendors' },
];

const priorityOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
];

export default function AnnouncementsPage() {
  const [filters, setFilters] = useState({ search: '', audience: '', priority: '', page: 1 });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    audience: 'all',
    priority: 'normal',
    published_at: new Date().toISOString(),
    expires_at: '',
  });

  const { data, meta, isLoading, error, refresh } = useAdminList<Announcement>(
    'announcements',
    filters
  );
  const {
    create,
    remove,
    isPending,
    error: mutationError,
  } = useAdminMutation<Announcement>('announcements');

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await remove(deleteId);
      toast.success('Announcement deleted');
      setDeleteId(null);
      refresh();
    } catch {
      // handled by hook
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      title: form.title,
      body: form.body,
      audience: form.audience,
      priority: form.priority,
      published_at: form.published_at,
    };
    if (form.expires_at) {
      payload.expires_at = form.expires_at;
    }
    try {
      await create(payload);
      toast.success('Announcement created and emails queued');
      setIsCreateOpen(false);
      setForm({
        title: '',
        body: '',
        audience: 'all',
        priority: 'normal',
        published_at: new Date().toISOString(),
        expires_at: '',
      });
      refresh();
    } catch {
      toast.error(mutationError ?? 'Failed to create announcement');
    }
  };

  return (
    <AdminPageShell
      title="Announcements"
      subtitle={`${meta?.total ?? 0} announcements`}
      action={
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          New Announcement
        </button>
      }
      filters={
        <FilterBar
          searchPlaceholder="Search by title..."
          onSearchChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
        >
          <Select
            value={filters.audience || '_all_'}
            onChange={(v) =>
              setFilters((f) => ({ ...f, audience: v === '_all_' ? '' : v, page: 1 }))
            }
            options={[{ value: '_all_', label: 'All Audiences' }, ...audienceOptions]}
          />
          <Select
            value={filters.priority || '_all_'}
            onChange={(v) =>
              setFilters((f) => ({ ...f, priority: v === '_all_' ? '' : v, page: 1 }))
            }
            options={[{ value: '_all_', label: 'All Priorities' }, ...priorityOptions]}
          />
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
              render: (row) => safeFormatDate(row.published_at),
            },
            {
              key: 'expires',
              header: 'Expires',
              render: (row) => safeFormatDate(row.expires_at),
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

      <ResponsiveModal open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-lr-white">New Announcement</h3>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center glass hover:bg-white/10 transition-colors text-muted hover:text-lr-white"
            >
              <X size={16} />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-lr-white text-sm focus:outline-none focus:border-purple-accent/50"
              placeholder="Enter announcement title"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Body</label>
            <textarea
              required
              rows={4}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-lr-white text-sm focus:outline-none focus:border-purple-accent/50 resize-none"
              placeholder="Enter announcement body"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Audience</label>
              <Select
                value={form.audience}
                onChange={(v) => setForm((f) => ({ ...f, audience: v }))}
                options={audienceOptions}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Priority</label>
              <Select
                value={form.priority}
                onChange={(v) => setForm((f) => ({ ...f, priority: v }))}
                options={priorityOptions}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Published At</label>
              <DatePicker
                value={form.published_at}
                onChange={(v) => setForm((f) => ({ ...f, published_at: v }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Expires At (optional)
              </label>
              <DatePicker
                value={form.expires_at}
                onChange={(v) => setForm((f) => ({ ...f, expires_at: v }))}
                placeholder="No expiration"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-lr-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-purple-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create Announcement'}
            </button>
          </div>
        </form>
      </ResponsiveModal>
    </AdminPageShell>
  );
}
