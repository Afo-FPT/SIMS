'use client';

import React, { useState, useEffect } from 'react';
import {
  getCycleCounts,
  approveCycleCount,
  rejectCycleCount,
  type CycleCountResponse,
} from '../../../lib/cycle-count.api';
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
import { Button } from '../../../components/ui/Button';

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
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCycleCounts();
      setList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cycle counts');
      toast.error('Failed to load cycle count list');
    } finally {
      setLoading(false);
    }
  };

  const filtered = list.filter((cc) =>
    statusFilter ? cc.status === statusFilter : true
  );

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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cycle Count</h1>
          <p className="text-slate-500 mt-1">
            Monitor customer cycle count requests and execution status
          </p>
        </div>
        <TableSkeleton rows={5} cols={10} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cycle Count</h1>
          <p className="text-slate-500 mt-1">
            Monitor customer cycle count requests and execution status
          </p>
        </div>
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cycle Count</h1>
        <p className="text-slate-500 mt-1">
          Monitor customer cycle count requests and execution status
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            <option value="">All</option>
            <option value="PENDING_MANAGER_APPROVAL">Pending approval</option>
            <option value="ASSIGNED_TO_STAFF">Assigned to staff</option>
            <option value="STAFF_SUBMITTED">Submitted by staff</option>
            <option value="RECOUNT_REQUIRED">Recount required</option>
            <option value="ADJUSTMENT_REQUESTED">Adjustment requested</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="fact_check"
          title="No cycle counts"
          message="No cycle counts match the current filter."
        />
      ) : (
        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHead>
              <TableHeader>Contract</TableHeader>
              <TableHeader>Customer</TableHeader>
              <TableHeader>Warehouse</TableHeader>
              <TableHeader>Assigned Staff</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Requested at</TableHeader>
              <TableHeader>Deadline</TableHeader>
              <TableHeader>Executed At</TableHeader>
              <TableHeader>Last Updated</TableHeader>
              <TableHeader>Notes</TableHeader>
              <TableHeader>Action</TableHeader>
            </TableHead>
            <TableBody>
              {filtered.map((cc) => (
                <TableRow key={cc.cycle_count_id}>
                  <TableCell className="font-bold text-slate-900">
                    {cc.contract_code}
                  </TableCell>
                  <TableCell className="text-slate-700">{cc.customer_name}</TableCell>
                  <TableCell className="text-slate-700">{cc.warehouse_name}</TableCell>
                  <TableCell className="text-slate-700">
                    {cc.assigned_staff?.length
                      ? cc.assigned_staff.map((s) => s.name).join(', ')
                      : '—'}
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
                    {new Date(cc.requested_at).toLocaleString('vi-VN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {cc.counting_deadline
                      ? new Date(cc.counting_deadline).toLocaleString('vi-VN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {cc.completed_at
                      ? new Date(cc.completed_at).toLocaleString('vi-VN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {new Date(cc.updated_at).toLocaleString('vi-VN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm max-w-[240px] truncate">
                    {cc.note || '—'}
                  </TableCell>
                  <TableCell>
                    {cc.status === 'RECOUNT_REQUIRED' ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveRecount(cc.cycle_count_id)}
                          disabled={processingId === cc.cycle_count_id}
                        >
                          Approve recount
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

