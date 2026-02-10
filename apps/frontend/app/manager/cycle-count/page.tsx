'use client';

import React, { useState, useEffect } from 'react';
import {
  getCycleCounts,
  type CycleCountResponse,
  approveCycleCount,
  rejectCycleCount,
  assignStaffToCycleCount,
  applyCycleCountAdjustment,
  requestRecount,
} from '../../../lib/cycle-count.api';
import {
  listStaffUsers,
  type StaffUserOption,
} from '../../../lib/staff-users.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '../../../components/ui/Table';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

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
  | 'ADJUSTMENT_REQUESTED'
  | 'CONFIRMED'
  | 'REJECTED';

export default function ManagerCycleCountPage() {
  const toast = useToastHelpers();
  const [list, setList] = useState<CycleCountResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');

  const [rejecting, setRejecting] = useState<CycleCountResponse | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [assigning, setAssigning] = useState<CycleCountResponse | null>(null);
  const [assignStaffIds, setAssignStaffIds] = useState<string[]>([]);
  const [assignDeadline, setAssignDeadline] = useState('');

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [staffUsers, setStaffUsers] = useState<StaffUserOption[]>([]);
  const [staffError, setStaffError] = useState<string | null>(null);

  const [openStaffDropdown, setOpenStaffDropdown] = useState(false);


  useEffect(() => {
    load();
    loadStaff();
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

  const loadStaff = async () => {
    try {
      setStaffError(null);
      const users = await listStaffUsers();
      setStaffUsers(users);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to load staff users');
      toast.error('Failed to load staff list');
    }
  };

  const handleApprove = async (cc: CycleCountResponse) => {
    try {
      setActionLoadingId(cc.cycle_count_id);
      await approveCycleCount(cc.cycle_count_id);
      toast.success('Cycle count approved');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    try {
      setActionLoadingId(rejecting.cycle_count_id);
      await rejectCycleCount(rejecting.cycle_count_id, rejectReason || 'Rejected by manager');
      toast.success('Cycle count rejected');
      setRejecting(null);
      setRejectReason('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAssign = async () => {
    if (!assigning) return;
    const ids = assignStaffIds;
    if (ids.length === 0 || !assignDeadline) {
      toast.warning('Please select staff and a valid deadline');
      return;
    }
    try {
      setActionLoadingId(assigning.cycle_count_id);
      await assignStaffToCycleCount(assigning.cycle_count_id, {
        staffIds: ids,
        countingDeadline: new Date(assignDeadline).toISOString(),
      });
      toast.success('Staff assigned to cycle count');
      setAssigning(null);
      setAssignStaffIds([]);
      setAssignDeadline('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign staff');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRecount = async (cc: CycleCountResponse) => {
    try {
      setActionLoadingId(cc.cycle_count_id);
      await requestRecount(cc.cycle_count_id);
      toast.success('Recount requested');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to request recount');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApplyAdjustment = async (cc: CycleCountResponse) => {
    try {
      setActionLoadingId(cc.cycle_count_id);
      await applyCycleCountAdjustment(cc.cycle_count_id);
      toast.success('Inventory adjustment applied');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply adjustment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = list.filter((cc) =>
    statusFilter ? cc.status === statusFilter : true
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cycle Count</h1>
          <p className="text-slate-500 mt-1">
            Manage cycle count requests (approve, assign staff, adjust inventory)
          </p>
        </div>
        <TableSkeleton rows={5} cols={7} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cycle Count</h1>
          <p className="text-slate-500 mt-1">
            Manage cycle count requests (approve, assign staff, adjust inventory)
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
          Manage contract inventory cycle counts
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
              <TableHeader>Status</TableHeader>
              <TableHeader>Requested at</TableHeader>
              <TableHeader>Deadline</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHead>
            <TableBody>
              {filtered.map((cc) => (
                <TableRow key={cc.cycle_count_id}>
                  <TableCell className="font-bold text-slate-900">
                    {cc.contract_code}
                  </TableCell>
                  <TableCell className="text-slate-700">{cc.customer_name}</TableCell>
                  <TableCell className="text-slate-700">{cc.warehouse_name}</TableCell>
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
                    {new Date(cc.requested_at).toLocaleString('en-US')}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {cc.counting_deadline
                      ? new Date(cc.counting_deadline).toLocaleString('en-US')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {cc.status === 'PENDING_MANAGER_APPROVAL' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(cc)}
                            disabled={actionLoadingId === cc.cycle_count_id}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRejecting(cc);
                              setRejectReason('');
                            }}
                            disabled={actionLoadingId === cc.cycle_count_id}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {cc.status === 'ASSIGNED_TO_STAFF' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setAssigning(cc);
                            setAssignStaffIds([]);
                            setAssignDeadline(
                              cc.counting_deadline
                                ? cc.counting_deadline.slice(0, 10)
                                : ''
                            );
                          }}
                          disabled={actionLoadingId === cc.cycle_count_id}
                        >
                          Assign / Re-assign staff
                        </Button>
                      )}
                      {cc.status === 'STAFF_SUBMITTED' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRecount(cc)}
                          disabled={actionLoadingId === cc.cycle_count_id}
                        >
                          Request recount
                        </Button>
                      )}
                      {cc.status === 'ADJUSTMENT_REQUESTED' && (
                        <Button
                          size="sm"
                          onClick={() => handleApplyAdjustment(cc)}
                          disabled={actionLoadingId === cc.cycle_count_id}
                        >
                          Apply inventory adjustment
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {/* Reject modal */}
      {rejecting && (
        <Modal
          open={!!rejecting}
          onOpenChange={(open) => {
            if (!open) setRejecting(null);
          }}
          title={`Reject cycle count – ${rejecting.contract_code}`}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to reject this cycle count request? Please provide a reason (required).
            </p>
            <Input
              label="Reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason"
            />
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={() => setRejecting(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                disabled={!rejectReason.trim()}
              >
                Reject
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign staff modal */}
      {assigning && (
        <Modal
          open={!!assigning}
          onOpenChange={(open) => {
            if (!open) setAssigning(null);
          }}
          title={`Assign staff – ${assigning.contract_code}`}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Select staff members to assign to this cycle count.
            </p>
            <div className="space-y-2 relative">
              <p className="text-xs font-bold text-slate-600">Select staff</p>

              {staffError && (
                <p className="text-xs text-red-500 mb-1">{staffError}</p>
              )}

              {/* Button to open dropdown */}
              <button
                type="button"
                onClick={() => setOpenStaffDropdown(!openStaffDropdown)}
                className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-sm text-left bg-white
               focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {assignStaffIds.length > 0
                  ? `Selected ${assignStaffIds.length} staff`
                  : "Choose staff"}
              </button>

              {/* Dropdown */}
              {openStaffDropdown && (
                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto
                    rounded-2xl border border-slate-200 bg-white p-2 shadow-md">
                  {staffUsers.map((s) => (
                    <label
                      key={s.user_id}
                      className="flex items-center gap-2 px-2 py-1 rounded-lg
                     hover:bg-slate-50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={assignStaffIds.includes(s.user_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignStaffIds([...assignStaffIds, s.user_id]);
                          } else {
                            setAssignStaffIds(
                              assignStaffIds.filter((id) => id !== s.user_id),
                            );
                          }
                        }}
                      />
                      <span>
                        {s.name} <span className="text-xs text-slate-400">({s.email})</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                Click to open the list and select multiple staff members.
              </p>
            </div>

            <Input
              label="Counting deadline"
              type="date"
              value={assignDeadline}
              onChange={(e) => setAssignDeadline(e.target.value)}
            />
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={() => setAssigning(null)}>
                Cancel
              </Button>
              <Button onClick={handleAssign}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

