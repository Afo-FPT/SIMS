'use client';

import React, { useState, useEffect } from 'react';
import {
  getCycleCounts,
  approveCycleCount,
  rejectCycleCount,
  type CycleCountResponse,
} from '../../../lib/cycle-count.api';
import { useToastHelpers } from '../../../lib/toast';
import { formatDateTime } from '../../../lib/date-format';
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
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { PageHeader } from '../../../components/ui/PageHeader';

const STATUS_LABEL: Record<string, string> = {
  PENDING_MANAGER_APPROVAL: 'Pending approval',
  ASSIGNED_TO_STAFF: 'Assigned to staff',
  STAFF_SUBMITTED: 'Submitted by staff',
  ADJUSTMENT_REQUESTED: 'Adjustment requested by customer',
  CONFIRMED: 'Confirmed',
  RECOUNT_REQUIRED: 'Recount required',
  REJECTED: 'Rejected',
};

type StatusFilter =
  | ''
  | 'PENDING_MANAGER_APPROVAL'
  | 'ASSIGNED_TO_STAFF'
  | 'STAFF_SUBMITTED'
  | 'RECOUNT_REQUIRED'
  | 'ADJUSTMENT_REQUESTED'
  | 'CONFIRMED'
  | 'REJECTED';

export default function ManagerCycleCountPage() {
  const toast = useToastHelpers();
  const [list, setList] = useState<CycleCountResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCycleCounts({ includeItems: false });
      setList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cycle counts');
      toast.error('Failed to load cycle count list');
    } finally {
      setLoading(false);
    }
  };

  const filtered = list.filter((cc) => {
    if (statusFilter && cc.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const contract = (cc.contract_code ?? '').toLowerCase();
      const customer = (cc.customer_name ?? '').toLowerCase();
      const warehouse = (cc.warehouse_name ?? '').toLowerCase();
      if (!contract.includes(q) && !customer.includes(q) && !warehouse.includes(q)) return false;
    }
    return true;
  });

  const hasActiveFilter = search.trim() !== '' || statusFilter !== '';

  const handleApproveRecount = async (id: string) => {
    try {
      setProcessingId(id);
      await approveCycleCount(id);
      toast.success('Recount approved and reassigned to staff');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve recount');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRecount = async (id: string) => {
    try {
      setProcessingId(id);
      await rejectCycleCount(id, 'Recount request rejected');
      toast.success('Recount rejected, keeping current submission');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject recount');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cycle Count" description="Monitor customer cycle count requests and execution status." />
        <TableSkeleton rows={5} cols={7} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cycle Count" description="Monitor customer cycle count requests and execution status." />
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Cycle Count" description="Monitor customer cycle count requests and execution status." />

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            placeholder="Search by contract, customer, warehouse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'PENDING_MANAGER_APPROVAL', label: 'Pending approval' },
              { value: 'ASSIGNED_TO_STAFF', label: 'Assigned to staff' },
              { value: 'STAFF_SUBMITTED', label: 'Submitted by staff' },
              { value: 'RECOUNT_REQUIRED', label: 'Recount required' },
              { value: 'ADJUSTMENT_REQUESTED', label: 'Adjustment requested' },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />
        </div>
        {hasActiveFilter && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {filtered.length}/{list.length} result{filtered.length !== 1 ? 's' : ''}
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

      {list.length === 0 ? (
        <EmptyState
          icon="fact_check"
          title="No cycle counts"
          message="No cycle count requests have been created yet."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="No results found"
          message="No cycle counts match your current filters. Try adjusting or clearing them."
        />
      ) : (
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
          <Table>
            <TableHead>
              <TableHeader>Contract / Customer</TableHeader>
              <TableHeader>Warehouse / Staff</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Requested</TableHeader>
              <TableHeader>Deadline</TableHeader>
              <TableHeader>Notes</TableHeader>
              <TableHeader>Action</TableHeader>
            </TableHead>
            <TableBody>
              {filtered.map((cc) => (
                <TableRow key={cc.cycle_count_id}>
                  <TableCell>
                    <p className="font-bold text-slate-900">{cc.contract_code}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{cc.customer_name}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-slate-700">{cc.warehouse_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {cc.assigned_staff?.length
                        ? cc.assigned_staff.map((s) => s.name).join(', ')
                        : 'Unassigned'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        cc.status === 'PENDING_MANAGER_APPROVAL'
                          ? 'warning'
                          : cc.status === 'ASSIGNED_TO_STAFF'
                            ? 'info'
                            : cc.status === 'STAFF_SUBMITTED'
                              ? 'warning'
                              : cc.status === 'ADJUSTMENT_REQUESTED'
                                ? 'info'
                                : cc.status === 'CONFIRMED'
                                  ? 'success'
                                  : cc.status === 'REJECTED'
                                    ? 'error'
                                    : 'neutral'
                      }
                    >
                      {STATUS_LABEL[cc.status] || cc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {formatDateTime(cc.requested_at)}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {formatDateTime(cc.counting_deadline)}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm max-w-[200px] truncate" title={cc.note || undefined}>
                    {cc.note || '—'}
                  </TableCell>
                  <TableCell>
                    {cc.status === 'RECOUNT_REQUIRED' ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveRecount(cc.cycle_count_id)}
                          disabled={processingId === cc.cycle_count_id}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRejectRecount(cc.cycle_count_id)}
                          disabled={processingId === cc.cycle_count_id}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}

