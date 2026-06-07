'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';
import Link from 'next/link';
import {
  AdminPageShell,
  DataTable,
  FilterBar,
  Pagination,
  ConfirmDialog,
} from '@/components/admin';
import { useAdminList, useAdminMutation } from '@/lib/api/admin/hooks';
import { GlassCard } from '@/components/ui/GlassCard';

interface Role {
  id: number;
  name: string;
  slug: string;
  level: number;
  description?: string;
}

export default function RolesPage() {
  const [filters, setFilters] = useState({ search: '', page: 1 });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, meta, isLoading, error, refresh } = useAdminList<Role>('roles', filters);
  const { remove, isPending } = useAdminMutation<Role>('roles');

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
      title="Roles"
      subtitle={`${meta?.total ?? 0} roles`}
      action={
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={16} />
          New Role
        </button>
      }
      filters={
        <FilterBar
          searchPlaceholder="Search by name or slug..."
          onSearchChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
        />
      }
    >
      <GlassCard>
        <DataTable
          columns={[
            { key: 'name', header: 'Name', render: (row) => row.name },
            {
              key: 'slug',
              header: 'Slug',
              render: (row) => <span className="text-muted font-mono text-xs">{row.slug}</span>,
            },
            { key: 'level', header: 'Level', render: (row) => row.level },
          ]}
          rows={data ?? []}
          isLoading={isLoading}
          error={error}
          onRetry={refresh}
          keyExtractor={(row) => row.id}
          rowActions={(row) => [
            <Link
              key="perms"
              href={`/admin/roles/${row.id}/permissions`}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-lr-white transition-colors"
              title="Manage Permissions"
            >
              <Shield size={14} />
            </Link>,
            <button
              key="edit"
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-lr-white transition-colors"
              title="Edit"
            >
              <Pencil size={14} />
            </button>,
            <button
              key="delete"
              onClick={() => setDeleteId(row.id)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors"
              title="Delete"
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
        title="Delete Role"
        description="Are you sure you want to delete this role? Users assigned to this role may lose access."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </AdminPageShell>
  );
}
