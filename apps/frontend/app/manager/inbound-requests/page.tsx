'use client';

import React, { useState, useEffect } from 'react';
import {
  listStorageRequests,
  type StorageRequestView,
} from '../../../lib/storage-requests.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
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

export default function ManagerInboundRequestsPage() {
  const toast = useToastHelpers();
  const PAGE_SIZE = 10;
  const [items, setItems] = useState<StorageRequestView[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inbound Tasks</h1>
        <p className="text-slate-500 mt-1">
          Manager can monitor inbound task execution by assigned staff.
        </p>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="No inbound requests"
          message="No inbound requests found."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHead>
              <TableHeader>Inbound reference</TableHeader>
              <TableHeader>Warehouse</TableHeader>
              <TableHeader>Zone</TableHeader>
              <TableHeader>Items</TableHeader>
              <TableHeader>Assigned Staff</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Executed At</TableHeader>
              <TableHeader>Created</TableHeader>
              <TableHeader>Last Updated</TableHeader>
            </TableHead>
            <TableBody>
              {paged.map((r) => (
                <TableRow key={r.request_id}>
                  <TableCell className="font-bold text-slate-900">
                    {r.reference ?? r.request_id}
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {r.warehouse_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {r.requested_zone_code ??
                      r.items.find((it) => it.zone_code)?.zone_code ??
                      '—'}
                  </TableCell>
                  <TableCell className="text-slate-700">{r.items.length}</TableCell>
                  <TableCell className="text-slate-700">
                    {r.assigned_staff?.length
                      ? r.assigned_staff.map((s) => s.name).join(', ')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      color={
                        r.status === 'COMPLETED'
                          ? 'green'
                          : r.status === 'REJECTED'
                          ? 'red'
                          : r.status === 'DONE_BY_STAFF'
                          ? 'blue'
                          : 'orange'
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {r.status === 'DONE_BY_STAFF' || r.status === 'COMPLETED'
                      ? new Date(r.updated_at).toLocaleString('vi-VN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {new Date(r.created_at).toLocaleString('vi-VN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {new Date(r.updated_at).toLocaleString('vi-VN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="flex items-center justify-center flex-wrap gap-3 pb-4">
          <p className="text-sm text-slate-500 whitespace-nowrap">
            Showing{' '}
            <span className="font-bold text-slate-700">
              {Math.min((safePage - 1) * PAGE_SIZE + 1, items.length)}
            </span>
            {' '}to{' '}
            <span className="font-bold text-slate-700">
              {Math.min(safePage * PAGE_SIZE, items.length)}
            </span>
            {' '}of{' '}
            <span className="font-bold text-slate-700">{items.length}</span>
          </p>
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
