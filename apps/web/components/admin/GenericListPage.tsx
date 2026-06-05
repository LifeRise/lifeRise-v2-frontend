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

export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
}

interface GenericListPageProps<T> {
  resource: string;
  title: string;
  columns: ColumnDef<T>[];
  filters?: React.ReactNode;
  searchPlaceholder?: string;
  onSearchChange?: (search: string) => void;
  showStatus?: boolean;
  statusField?: keyof T;
}

export function GenericListPage<T extends { id: number; status?: string }>({
  resource,
  title,
  columns,
  filters,
  searchPlaceholder = 'Search...',
  onSearchChange,
  showStatus,
}: GenericListPageProps<T>) {
  const [pageParams, setPageParams] = useState({ search: '', page: 1 });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, meta, isLoading, error, refresh } = useAdminList<T>(resource, pageParams);
  const { remove, isPending } = useAdminMutation<T>(resource);

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

  const allColumns: ColumnDef<T>[] = showStatus
    ? [
        ...columns,
        {
          key: 'status',
          header: 'Status',
          render: (row) => (row.status ? <StatusPill status={row.status} /> : '—'),
        },
      ]
    : columns;

  return (
    <AdminPageShell
      title={title}
      subtitle={`${meta?.total ?? 0} ${title.toLowerCase()}`}
      action={
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={16} />
          New
        </button>
      }
      filters={
        <FilterBar
          searchPlaceholder={searchPlaceholder}
          onSearchChange={(search) => {
            setPageParams((p) => ({ ...p, search, page: 1 }));
            onSearchChange?.(search);
          }}
        >
          {filters}
        </FilterBar>
      }
    >
      <GlassCard>
        <DataTable
          columns={allColumns}
          rows={data ?? []}
          isLoading={isLoading}
          error={error}
          onRetry={refresh}
          keyExtractor={(row) => row.id}
          rowActions={() => [
            <button
              key="edit"
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-lr-white transition-colors"
            >
              <Pencil size={14} />
            </button>,
            <button
              key="delete"
              onClick={(e) => {
                const id = Number((e.currentTarget.closest('tr') as HTMLElement)?.dataset?.rowId);
                setDeleteId(id);
              }}
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
        onPageChange={(page) => setPageParams((p) => ({ ...p, page }))}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={`Delete ${title}`}
        description={`Are you sure you want to delete this ${title.toLowerCase()}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </AdminPageShell>
  );
}
