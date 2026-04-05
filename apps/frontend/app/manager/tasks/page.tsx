'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { listStorageRequests, type StorageRequestView } from '../../../lib/storage-requests.api';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Pagination } from '../../../components/ui/Pagination';
import { useToastHelpers } from '../../../lib/toast';

const PAGE_SIZE = 10;

/** e.g. DONE_BY_STAFF → "Done By Staff" */
function formatRequestStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

type TaskStatusFilter = 'ALL' | 'APPROVED' | 'DONE_BY_STAFF' | 'COMPLETED';

export default function ManagerTasksPage() {
  const toast = useToastHelpers();
  const [tasks, setTasks] = useState<StorageRequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<StorageRequestView | null>(null);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [approvedIn, approvedOut, doneByStaffIn, doneByStaffOut, completedIn, completedOut] = await Promise.all([
        listStorageRequests({ requestType: 'IN', status: 'APPROVED' }),
        listStorageRequests({ requestType: 'OUT', status: 'APPROVED' }),
        listStorageRequests({ requestType: 'IN', status: 'DONE_BY_STAFF' }),
        listStorageRequests({ requestType: 'OUT', status: 'DONE_BY_STAFF' }),
        listStorageRequests({ requestType: 'IN', status: 'COMPLETED' }),
        listStorageRequests({ requestType: 'OUT', status: 'COMPLETED' }),
      ]);
      setTasks([...approvedIn, ...approvedOut, ...doneByStaffIn, ...doneByStaffOut, ...completedIn, ...completedOut]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort(
        (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime(),
      ),
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    return sortedTasks.filter((t) => {
      if (typeFilter !== 'ALL' && t.request_type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      return true;
    });
  }, [sortedTasks, typeFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedTasks = filteredTasks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tasks</h1>
        <p className="text-slate-500 mt-1">Task list after assignment (approved, done by staff, completed)</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-500">Task type</p>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'IN' | 'OUT')}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm min-w-[140px]"
          >
            <option value="ALL">All types</option>
            <option value="IN">Inbound</option>
            <option value="OUT">Outbound</option>
          </select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-500">Status</p>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatusFilter)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm min-w-[180px]"
          >
            <option value="ALL">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="DONE_BY_STAFF">Done by staff</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : filteredTasks.length === 0 ? (
        <EmptyState icon="assignment" title="No tasks" message="No tasks found for this filter" />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHead>
              <TableHeader>Reference</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Contract</TableHeader>
              <TableHeader>Items</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Updated</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHead>
            <TableBody>
              {pagedTasks.map((t) => (
                <TableRow key={t.request_id}>
                  <TableCell className="font-bold text-slate-900">{t.reference ?? t.request_id}</TableCell>
                  <TableCell><Badge variant="neutral">{t.request_type === 'IN' ? 'Inbound' : 'Outbound'}</Badge></TableCell>
                  <TableCell className="text-slate-700">{t.contract_code ?? t.contract_id}</TableCell>
                  <TableCell className="text-slate-700">{t.items.length}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'COMPLETED' ? 'success' : t.status === 'DONE_BY_STAFF' ? 'info' : 'warning'}>
                      {formatRequestStatus(t.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-700 text-sm">
                    {new Date(t.updated_at || t.created_at).toLocaleString('en-GB', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                  <TableCell>
                    <button type="button" onClick={() => setDetail(t)} className="text-sm font-bold text-primary hover:underline">
                      Open
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && !error && filteredTasks.length > 0 && (
        <div className="flex items-center justify-center flex-wrap gap-3 pb-4">
          <p className="text-sm text-slate-500 whitespace-nowrap">
            Showing{' '}
            <span className="font-bold text-slate-700">
              {Math.min((safePage - 1) * PAGE_SIZE + 1, filteredTasks.length)}
            </span>
            {' '}to{' '}
            <span className="font-bold text-slate-700">
              {Math.min(safePage * PAGE_SIZE, filteredTasks.length)}
            </span>
            {' '}of{' '}
            <span className="font-bold text-slate-700">{filteredTasks.length}</span>
          </p>
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {detail && (
        <Modal
          open={!!detail}
          onOpenChange={(o) => !o && setDetail(null)}
          title={detail.reference ?? detail.request_id}
          size="xl"
        >
          <div className="space-y-5">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Type</dt>
                <dd className="font-bold text-slate-900">{detail.request_type === 'IN' ? 'Inbound' : 'Outbound'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Contract</dt>
                <dd className="font-bold text-slate-900">{detail.contract_code ?? detail.contract_id}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Status</dt>
                <dd><Badge variant={detail.status === 'COMPLETED' ? 'success' : detail.status === 'DONE_BY_STAFF' ? 'info' : 'warning'}>{formatRequestStatus(detail.status)}</Badge></dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Updated</dt>
                <dd className="font-bold text-slate-900">{new Date(detail.updated_at || detail.created_at).toLocaleString('en-GB')}</dd>
              </div>
            </dl>

            <section>
              <h3 className="text-sm font-black text-slate-900 mb-3">Items</h3>
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHead>
                    <TableHeader>Item name</TableHeader>
                    <TableHeader>Requested</TableHeader>
                    <TableHeader>Actual</TableHeader>
                    <TableHeader>Shelf</TableHeader>
                  </TableHead>
                  <TableBody>
                    {detail.items.map((it) => (
                      <TableRow key={it.request_detail_id}>
                        <TableCell className="text-slate-900">{it.item_name}</TableCell>
                        <TableCell className="text-slate-700">{it.quantity_requested} {it.unit}</TableCell>
                        <TableCell className="text-slate-700">{it.quantity_actual ?? '—'}</TableCell>
                        <TableCell className="text-slate-700">{it.shelf_code ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        </Modal>
      )}
    </div>
  );
}
