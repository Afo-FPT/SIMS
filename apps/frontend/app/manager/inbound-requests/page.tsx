'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  listStorageRequests,
  type StorageRequestView,
} from '../../../lib/storage-requests.api';
import { formatDateTime } from '../../../lib/date-format';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '../../../components/ui/Table';
import { TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Pagination } from '../../../components/ui/Pagination';
import { PageHeader } from '../../../components/ui/PageHeader';

type StatusFilter = '' | 'PENDING' | 'APPROVED' | 'DONE_BY_STAFF' | 'COMPLETED' | 'REJECTED';

function formatStatusLabel(status: string): string {
  const s = String(status || '').toLowerCase().replace(/_/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
}

function statusVariant(status: string): 'success' | 'error' | 'info' | 'warning' | 'neutral' {
  if (status === 'COMPLETED') return 'success';
  if (status === 'REJECTED') return 'error';
  if (status === 'DONE_BY_STAFF') return 'info';
  return 'warning';
}

export default function ManagerInboundRequestsPage() {
  const toast = useToastHelpers();
  const PAGE_SIZE = 10;
  const [items, setItems] = useState<StorageRequestView[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const requests = await listStorageRequests({ requestType: 'IN' });
      setItems(requests);
      setPage(1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load inbound requests';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const ref = (r.reference ?? r.request_id).toLowerCase();
        const customer = (r.customer_name ?? '').toLowerCase();
        const warehouse = (r.warehouse_name ?? '').toLowerCase();
        if (!ref.includes(q) && !customer.includes(q) && !warehouse.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, statusFilter]);

  const hasActiveFilter = search.trim() !== '' || statusFilter !== '';

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader title="Inbound Tasks" description="Monitor inbound task execution by assigned staff." />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            placeholder="Search by reference, customer, warehouse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'DONE_BY_STAFF', label: 'Done by staff' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />
        </div>
        {hasActiveFilter && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {filteredItems.length}/{items.length} result{filteredItems.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => { setSearch(''); setStatusFilter(''); }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="No inbound requests"
          message="No inbound requests have been created yet."
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="No results found"
          message="No inbound requests match your current filters. Try adjusting or clearing them."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
          <Table>
            <TableHead>
              <TableHeader>Reference</TableHeader>
              <TableHeader>Customer</TableHeader>
              <TableHeader>Warehouse / Zone</TableHeader>
              <TableHeader>Items</TableHeader>
              <TableHeader>Assigned Staff</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Created</TableHeader>
            </TableHead>
            <TableBody>
              {paged.map((r) => (
                <TableRow key={r.request_id}>
                  <TableCell className="font-bold text-slate-900">
                    {r.reference ?? r.request_id}
                  </TableCell>
                  <TableCell className="text-slate-700">{r.customer_name ?? '—'}</TableCell>
                  <TableCell>
                    <p className="text-slate-700">{r.warehouse_name ?? '—'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {r.requested_zone_code ??
                        r.items.find((it) => it.zone_code)?.zone_code ??
                        '—'}
                    </p>
                  </TableCell>
                  <TableCell className="text-slate-700">{r.items.length}</TableCell>
                  <TableCell className="text-slate-700">
                    {r.assigned_staff?.length
                      ? r.assigned_staff.map((s) => s.name).join(', ')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>
                      {formatStatusLabel(r.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {formatDateTime(r.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && !error && filteredItems.length > 0 && (
        <div className="flex items-center justify-center flex-wrap gap-3 pb-4">
          <p className="text-sm text-slate-500 whitespace-nowrap">
            Showing{' '}
            <span className="font-bold text-slate-700">
              {Math.min((safePage - 1) * PAGE_SIZE + 1, filteredItems.length)}
            </span>
            {' '}to{' '}
            <span className="font-bold text-slate-700">
              {Math.min(safePage * PAGE_SIZE, filteredItems.length)}
            </span>
            {' '}of{' '}
            <span className="font-bold text-slate-700">{filteredItems.length}</span>
          </p>
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
