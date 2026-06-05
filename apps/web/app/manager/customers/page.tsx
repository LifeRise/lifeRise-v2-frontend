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
import { useAdminList, useAdminMutation } from '@/lib/api/admin/hooks';
import { GlassCard } from '@/components/ui/GlassCard';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: string;
  last_login_at?: string;
}

export default function CustomersPage() {
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, meta, isLoading, error, refresh } = useAdminList<Customer>('customers', filters);
  const { remove, isPending } = useAdminMutation<Customer>('customers');

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
      title="Customers"
      subtitle={`${meta?.total ?? 0} customers`}
      action={
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={16} />
          New Customer
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
            <option value="inactive">Inactive</option>
          </select>
        </FilterBar>
      }
    >
      <GlassCard>
        <DataTable
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (row) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-accent/20 flex items-center justify-center text-xs font-bold text-purple-accent">
                    {row.first_name?.[0]}
                    {row.last_name?.[0]}
                  </div>
                  <span className="font-medium">
                    {row.first_name} {row.last_name}
                  </span>
                </div>
              ),
            },
            { key: 'email', header: 'Email', render: (row) => row.email },
            { key: 'phone', header: 'Phone', render: (row) => row.phone ?? '—' },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusPill status={row.status} />,
            },
            {
              key: 'last_login',
              header: 'Last Login',
              render: (row) =>
                row.last_login_at ? new Date(row.last_login_at).toLocaleDateString() : 'Never',
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
        title="Delete Customer"
        description="Are you sure you want to delete this customer? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </AdminPageShell>
  );
}
