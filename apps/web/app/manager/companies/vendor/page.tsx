'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
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

interface Company {
  id: number;
  name: string;
  slug: string;
  email: string;
  type: string;
  status: string;
  verified_at?: string;
}

export default function VendorCompaniesPage() {
  const [filters, setFilters] = useState({ search: '', type: 'vendor', status: '', page: 1 });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, meta, isLoading, error, refresh } = useAdminList<Company>('companies', filters);
  const { remove, isPending } = useAdminMutation<Company>('companies');

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
      title="Vendor Companies"
      subtitle={`${meta?.total ?? 0} vendors`}
      action={
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={16} />
          New Vendor
        </button>
      }
      filters={
        <FilterBar
          searchPlaceholder="Search by name or email..."
          onSearchChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
        >
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-lr-white text-sm focus:outline-none focus:border-purple-accent/50"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </FilterBar>
      }
    >
      <GlassCard>
        <DataTable
          columns={[
            { key: 'name', header: 'Name', render: (row) => row.name },
            { key: 'email', header: 'Email', render: (row) => row.email },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusPill status={row.status} />,
            },
            {
              key: 'verified',
              header: 'Verified',
              render: (row) =>
                row.verified_at ? (
                  <span className="text-emerald-400 text-xs font-medium">Yes</span>
                ) : (
                  <span className="text-muted text-xs">No</span>
                ),
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
            !row.verified_at && (
              <button
                key="verify"
                className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-emerald-400 transition-colors"
              >
                <ShieldCheck size={14} />
              </button>
            ),
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
        title="Delete Company"
        description="Are you sure you want to delete this company? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </AdminPageShell>
  );
}
