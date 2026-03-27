'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToastHelpers } from '../../../lib/toast';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import {
  listStorageRequests,
  type StorageRequestView,
} from '../../../lib/storage-requests.api';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
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

type TaskType = 'INBOUND' | 'OUTBOUND' | 'INVENTORY_CHECKING';
type StatusGroup = 'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';

type StaffTaskRow = {
  rowKey: string;
  type: TaskType;
  reference: string;
  contractCode: string;
  customerName: string;
  warehouseName?: string;
  zoneCode?: string;
  status: string;
  updatedAt: string;
  actionHref: string;
  actionLabel: string;
};

const CYCLE_STATUS_LABEL: Record<string, string> = {
  PENDING_MANAGER_APPROVAL: 'Pending approval',
  ASSIGNED_TO_STAFF: 'Assigned to staff',
  STAFF_SUBMITTED: 'Submitted',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  ADJUSTMENT_REQUESTED: 'Adjustment requested',
  RECOUNT_REQUIRED: 'Recount required',
};

function safeToDate(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateTime(v: string): string {
  const d = safeToDate(v);
  if (!d) return '—';
  return d.toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getStatusGroupForRow(row: StaffTaskRow): Exclude<StatusGroup, 'ALL'> {
  if (row.type === 'INVENTORY_CHECKING') {
    if (row.status === 'ASSIGNED_TO_STAFF') return 'IN_PROGRESS';
    if (row.status === 'REJECTED') return 'REJECTED';
    return 'COMPLETED';
  }

  // StorageRequest: IN/OUT
  if (row.status === 'APPROVED') return 'IN_PROGRESS';
  if (row.status === 'REJECTED') return 'REJECTED';
  return 'COMPLETED';
}

function badgeVariantForStatusGroup(group: Exclude<StatusGroup, 'ALL'>): 'success' | 'info' | 'warning' | 'error' | 'neutral' {
  switch (group) {
    case 'IN_PROGRESS':
      return 'info';
    case 'COMPLETED':
      return 'success';
    case 'REJECTED':
      return 'error';
    default:
      return 'neutral';
  }
}

function typeToLabel(t: TaskType): string {
  switch (t) {
    case 'INBOUND':
      return 'Inbound';
    case 'OUTBOUND':
      return 'Outbound';
    case 'INVENTORY_CHECKING':
      return 'Inventory Checking';
    default:
      return t;
  }
}

function badgeVariantForType(t: TaskType): 'info' | 'warning' | 'neutral' {
  switch (t) {
    case 'INBOUND':
      return 'info';
    case 'OUTBOUND':
      return 'warning';
    case 'INVENTORY_CHECKING':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export default function StaffTasksPage() {
  const toast = useToastHelpers();
  const [allRows, setAllRows] = useState<StaffTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusGroup, setStatusGroup] = useState<StatusGroup>('ALL');
  const [taskTypeFilter, setTaskTypeFilter] = useState<TaskType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        inApproved,
        inDoneByStaff,
        inCompleted,
        inRejected,
        outApproved,
        outDoneByStaff,
        outCompleted,
        outRejected,
        cycleCounts,
      ] = await Promise.all([
        listStorageRequests({ requestType: 'IN', status: 'APPROVED' }),
        listStorageRequests({ requestType: 'IN', status: 'DONE_BY_STAFF' }),
        listStorageRequests({ requestType: 'IN', status: 'COMPLETED' }),
        listStorageRequests({ requestType: 'IN', status: 'REJECTED' }),
        listStorageRequests({ requestType: 'OUT', status: 'APPROVED' }),
        listStorageRequests({ requestType: 'OUT', status: 'DONE_BY_STAFF' }),
        listStorageRequests({ requestType: 'OUT', status: 'COMPLETED' }),
        listStorageRequests({ requestType: 'OUT', status: 'REJECTED' }),
        getCycleCounts(),
      ]);

      const rows: StaffTaskRow[] = [];

      const mapStorage = (r: StorageRequestView, kind: TaskType) => {
        const reference = r.reference ?? r.request_id;
        const contractCode = r.contract_code ?? r.contract_id;
        const customerName = r.customer_name ?? r.customer_id;
        const updatedAt = r.updated_at ?? r.created_at;

        rows.push({
          rowKey: `${kind}:${r.request_id}`,
          type: kind,
          reference,
          contractCode,
          customerName,
          warehouseName: r.warehouse_name,
          zoneCode: r.requested_zone_code,
          status: r.status,
          updatedAt,
          actionHref: kind === 'INBOUND' ? `/staff/inbound-requests/${r.request_id}` : `/staff/outbound-requests/${r.request_id}`,
          actionLabel: r.status === 'APPROVED' ? 'Open' : 'View',
        });
      };

      for (const r of inApproved) mapStorage(r, 'INBOUND');
      for (const r of inDoneByStaff) mapStorage(r, 'INBOUND');
      for (const r of inCompleted) mapStorage(r, 'INBOUND');
      for (const r of inRejected) mapStorage(r, 'INBOUND');

      for (const r of outApproved) mapStorage(r, 'OUTBOUND');
      for (const r of outDoneByStaff) mapStorage(r, 'OUTBOUND');
      for (const r of outCompleted) mapStorage(r, 'OUTBOUND');
      for (const r of outRejected) mapStorage(r, 'OUTBOUND');

      for (const cc of cycleCounts) {
        rows.push({
          rowKey: `INVENTORY_CHECKING:${cc.cycle_count_id}`,
          type: 'INVENTORY_CHECKING',
          reference: cc.cycle_count_id,
          contractCode: cc.contract_code,
          customerName: cc.customer_name,
          warehouseName: cc.warehouse_name || undefined,
          zoneCode: undefined,
          status: cc.status,
          updatedAt: cc.updated_at || cc.created_at,
          actionHref: `/staff/cycle-count/${cc.cycle_count_id}`,
          actionLabel: cc.status === 'ASSIGNED_TO_STAFF' ? 'Start' : 'View',
        });
      }

      rows.sort((a, b) => {
        const da = safeToDate(a.updatedAt)?.getTime() ?? 0;
        const db = safeToDate(b.updatedAt)?.getTime() ?? 0;
        return db - da;
      });

      setAllRows(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load tasks';
      setError(msg);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (taskTypeFilter !== 'ALL' && r.type !== taskTypeFilter) return false;

      if (statusGroup !== 'ALL') {
        const g = getStatusGroupForRow(r);
        if (g !== statusGroup) return false;
      }

      if (!q) return true;
      return (
        r.reference.toLowerCase().includes(q) ||
        r.contractCode.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        (r.warehouseName ?? '').toLowerCase().includes(q) ||
        (r.zoneCode ?? '').toLowerCase().includes(q)
      );
    });
  }, [allRows, taskTypeFilter, statusGroup, search]);

  useEffect(() => {
    setPage(1);
  }, [taskTypeFilter, statusGroup, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * limit;
    return filteredRows.slice(start, start + limit);
  }, [filteredRows, safePage]);

  const statusBadgeText = (row: StaffTaskRow) => {
    if (row.type === 'INVENTORY_CHECKING') return CYCLE_STATUS_LABEL[row.status] || row.status;
    return row.status;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tasks</h1>
        <p className="text-slate-500 mt-1">Inbound, outbound & inventory tasks assigned to you</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by reference, contract code, customer, warehouse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          options={[
            { value: 'ALL', label: 'All statuses' },
            { value: 'IN_PROGRESS', label: 'In progress' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'REJECTED', label: 'Rejected' },
          ]}
          value={statusGroup}
          onChange={(e) => setStatusGroup(e.target.value as StatusGroup)}
        />

        <Select
          options={[
            { value: 'ALL', label: 'All types' },
            { value: 'INBOUND', label: 'Inbound' },
            { value: 'OUTBOUND', label: 'Outbound' },
            { value: 'INVENTORY_CHECKING', label: 'Inventory Checking' },
          ]}
          value={taskTypeFilter}
          onChange={(e) => setTaskTypeFilter(e.target.value as TaskType | 'ALL')}
        />
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : error ? (
        <ErrorState title="Failed to load tasks" message={error} onRetry={load} />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          icon="assignment"
          title="No tasks found"
          message="Try adjusting your filters or search."
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableHeader>Type</TableHeader>
              <TableHeader>Reference</TableHeader>
              <TableHeader>Customer</TableHeader>
              <TableHeader>Location</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Updated</TableHeader>
              <TableHeader>Action</TableHeader>
            </TableHead>
            <TableBody>
              {paginatedRows.map((r) => {
                const group = getStatusGroupForRow(r);
                return (
                  <TableRow key={r.rowKey}>
                    <TableCell>
                      <Badge variant={badgeVariantForType(r.type)}>{typeToLabel(r.type)}</Badge>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">{r.reference}</TableCell>
                    <TableCell className="text-slate-700">{r.customerName}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-slate-700">
                          Warehouse: {r.warehouseName || '—'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Zone: {r.zoneCode || '—'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariantForStatusGroup(group)}>
                        {statusBadgeText(r)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">{formatDateTime(r.updatedAt)}</TableCell>
                    <TableCell>
                      <Link href={r.actionHref} className="text-sm font-bold text-primary hover:underline">
                        {r.actionLabel}
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
