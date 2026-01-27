'use client';

import React, { useState, useEffect } from 'react';
import type { StaffTask } from '../../../types/staff';
import { listTasks, assignStaffToTask, cancelTask, getStaffUsers } from '../../../lib/mockApi/manager.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ManagerTasksPage() {
  const toast = useToastHelpers();
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<StaffTask | null>(null);
  const [assignStaffId, setAssignStaffId] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState<StaffTask | null>(null);
  const [updating, setUpdating] = useState(false);

  const staffUsers = getStaffUsers();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listTasks();
      setTasks(data.filter((t) => t.status !== 'CANCELLED'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!detail || !assignStaffId) return;
    try {
      setUpdating(true);
      await assignStaffToTask(detail.id, assignStaffId);
      toast.success('Staff assigned');
      setDetail(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async (t: StaffTask) => {
    try {
      await cancelTask(t.id);
      toast.success('Task cancelled');
      setCancelConfirm(null);
      setDetail(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tasks</h1>
        <p className="text-slate-500 mt-1">Coordinate and assign staff tasks</p>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : tasks.length === 0 ? (
        <EmptyState icon="assignment" title="No tasks" message="Create tasks from approved service requests" />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHead>
              <TableHeader>Task code</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Assigned staff</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Due date</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHead>
            <TableBody>
              {tasks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-bold text-slate-900">{t.taskCode}</TableCell>
                  <TableCell><Badge variant="neutral">{t.type}</Badge></TableCell>
                  <TableCell className="text-slate-700">{t.assignedToStaffName || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'COMPLETED' ? 'success' : t.status === 'IN_PROGRESS' ? 'info' : 'warning'}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-700 text-sm">{new Date(t.dueDate).toLocaleString()}</TableCell>
                  <TableCell>
                    <button type="button" onClick={() => { setDetail(t); setAssignStaffId(t.assignedToStaffId || ''); }} className="text-sm font-bold text-primary hover:underline">
                      Open
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {detail && (
        <Modal open={!!detail} onOpenChange={(o) => !o && setDetail(null)} title={detail.taskCode} size="lg">
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Type</dt><dd className="font-bold">{detail.type}</dd></div>
              <div><dt className="text-slate-500">Customer</dt><dd className="font-bold">{detail.customerName}</dd></div>
              <div><dt className="text-slate-500">Contract</dt><dd className="font-bold">{detail.contractCode}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd><Badge variant={detail.status === 'COMPLETED' ? 'success' : detail.status === 'IN_PROGRESS' ? 'info' : 'warning'}>{detail.status}</Badge></dd></div>
              <div><dt className="text-slate-500">Due</dt><dd className="font-bold">{new Date(detail.dueDate).toLocaleString()}</dd></div>
              <div><dt className="text-slate-500">Assigned to</dt><dd className="font-bold">{detail.assignedToStaffName || '—'}</dd></div>
            </dl>
            {detail.status !== 'COMPLETED' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-700">Assign staff</h4>
                <div className="flex gap-3 items-end">
                  <Select
                    label=""
                    value={assignStaffId}
                    onChange={(e) => setAssignStaffId(e.target.value)}
                    options={[{ value: '', label: 'Select staff' }, ...staffUsers.map((s) => ({ value: s.id, label: s.name }))]}
                    className="min-w-[200px]"
                  />
                  <Button onClick={handleAssign} disabled={!assignStaffId || updating}>Assign</Button>
                </div>
                <Button variant="ghost" onClick={() => setCancelConfirm(detail)} className="text-red-600">
                  Cancel task
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {cancelConfirm && (
        <ConfirmDialog
          open={!!cancelConfirm}
          onOpenChange={(o) => !o && setCancelConfirm(null)}
          title="Cancel task"
          message={`Cancel ${cancelConfirm?.taskCode}? This cannot be undone.`}
          confirmLabel="Cancel task"
          variant="danger"
          onConfirm={() => cancelConfirm && handleCancel(cancelConfirm)}
        />
      )}
    </div>
  );
}
