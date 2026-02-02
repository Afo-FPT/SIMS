'use client';

import React, { useState, useEffect } from 'react';
import type { ServiceRequest } from '../../../lib/customer-types';
import type { CreateTaskFromServiceRequestPayload } from '../../../types/manager';
import {
  listServiceRequests,
  approveServiceRequest,
  rejectServiceRequest,
  createTaskFromServiceRequest,
  listInventory,
} from '../../../lib/mockApi/manager.api';
import { getContractById } from '../../../lib/customer-mock';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ManagerServiceRequestsPage() {
  const toast = useToastHelpers();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ServiceRequest | null>(null);
  const [createTaskModal, setCreateTaskModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejecting, setRejecting] = useState<ServiceRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [taskPayload, setTaskPayload] = useState<CreateTaskFromServiceRequestPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listServiceRequests();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load service requests');
      toast.error('Failed to load service requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (r: ServiceRequest) => {
    if (r.status !== 'Pending') return;
    const preferred = r.preferredTime
      ? `${r.preferredDate}T${r.preferredTime.length <= 5 ? `${r.preferredTime}:00` : r.preferredTime}`
      : `${r.preferredDate}T09:00:00`;
    const due = new Date(r.preferredDate);
    due.setDate(due.getDate() + 2);
    let items: CreateTaskFromServiceRequestPayload['items'];
    if (r.type === 'Inventory Checking') {
      const inv = await listInventory();
      items = inv.map((i) => ({
        sku: i.sku,
        productName: i.name,
        currentQty: i.quantity,
      }));
    } else {
      items = (r.items || []).map((it) => ({
        sku: it.sku,
        productName: it.name,
        expectedQty: r.type === 'Inbound' ? it.quantity : undefined,
        requiredQty: r.type === 'Outbound' ? it.quantity : undefined,
        currentQty: undefined,
      }));
    }
    setTaskPayload({
      serviceRequestId: r.id,
      contractId: r.contractId,
      type: r.type,
      preferredExecutionTime: preferred,
      dueDate: due.toISOString().slice(0, 19),
      inboundRef: r.inboundRef,
      outboundRef: r.outboundRef,
      items,
      fullCheckRequired: r.type === 'Inventory Checking' && r.scope === 'Full inventory',
      customerName: r.customerName || 'Customer',
    });
    setDetail(null);
    setCreateTaskModal(true);
  };

  const handleCreateTask = async () => {
    if (!taskPayload) return;
    try {
      setSubmitting(true);
      await approveServiceRequest(taskPayload.serviceRequestId);
      await createTaskFromServiceRequest(taskPayload);
      toast.success('Service request approved and task created');
      setCreateTaskModal(false);
      setTaskPayload(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = (r: ServiceRequest) => {
    setDetail(null);
    setRejecting(r);
    setRejectReason('');
    setRejectModal(true);
  };

  const doReject = async () => {
    if (!rejecting) return;
    try {
      await rejectServiceRequest(rejecting.id, rejectReason);
      toast.success('Service request rejected');
      setRejectModal(false);
      setRejecting(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Service Requests</h1>
        <p className="text-slate-500 mt-1">Approve and convert to tasks</p>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : requests.length === 0 ? (
        <EmptyState icon="local_shipping" title="No service requests" message="No requests yet" />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHead>
              <TableHeader>Request code</TableHeader>
              <TableHeader>Customer</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Preferred time</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHead>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-bold text-slate-900">{r.id}</TableCell>
                  <TableCell className="text-slate-700">{r.customerName || '—'}</TableCell>
                  <TableCell><Badge variant="neutral">{r.type}</Badge></TableCell>
                  <TableCell className="text-slate-700">{r.preferredDate} {r.preferredTime || ''}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === 'Completed' ? 'success' : r.status === 'Processing' ? 'info' : r.status === 'Rejected' ? 'error' : 'warning'
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setDetail(r)} className="text-sm font-bold text-primary hover:underline">View</button>
                      {r.status === 'Pending' && (
                        <>
                          <button type="button" onClick={() => handleApprove(r)} className="text-sm font-bold text-emerald-600 hover:underline">Approve → Create task</button>
                          <button type="button" onClick={() => handleReject(r)} className="text-sm font-bold text-red-600 hover:underline">Reject</button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {detail && (
        <Modal open={!!detail} onOpenChange={(o) => !o && setDetail(null)} title={`Request ${detail.id}`} size="lg">
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-slate-500">Customer</dt>
              <dd className="font-bold">{detail.customerName || '—'}</dd>
              <dt className="text-slate-500">Type</dt>
              <dd className="font-bold">{detail.type}</dd>
              <dt className="text-slate-500">Preferred</dt>
              <dd className="font-bold">{detail.preferredDate} {detail.preferredTime || ''}</dd>
              {detail.inboundRef && <><dt className="text-slate-500">Inbound ref</dt><dd className="font-bold">{detail.inboundRef}</dd></>}
              {detail.outboundRef && <><dt className="text-slate-500">Outbound ref</dt><dd className="font-bold">{detail.outboundRef}</dd></>}
            </dl>
            {detail.items && detail.items.length > 0 && (
              <div>
                <p className="text-sm font-bold text-slate-700 mb-2">Items</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50"><th className="px-4 py-2 text-left">SKU</th><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Qty</th></tr></thead>
                    <tbody>
                      {detail.items.map((it, i) => (
                        <tr key={i} className="border-t border-slate-100"><td className="px-4 py-2">{it.sku}</td><td className="px-4 py-2">{it.name || '—'}</td><td className="px-4 py-2">{it.quantity}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {detail.status === 'Pending' && (
              <div className="flex gap-3 pt-4">
                <Button onClick={() => { handleApprove(detail).then(() => { }); setDetail(null); }}>Approve → Create task</Button>
                <Button variant="ghost" onClick={() => handleReject(detail)}>Reject</Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {createTaskModal && taskPayload && (
        <Modal open={createTaskModal} onOpenChange={setCreateTaskModal} title="Create task from request" size="md">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Create task for {taskPayload.customerName}: {taskPayload.type}, due {taskPayload.dueDate.slice(0, 10)}.
            </p>
            <div className="flex gap-3">
              <Button onClick={handleCreateTask} isLoading={submitting}>Create task</Button>
              <Button variant="ghost" onClick={() => { setCreateTaskModal(false); setTaskPayload(null); }}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      {rejectModal && rejecting && (
        <Modal open={rejectModal} onOpenChange={(o) => { if (!o) { setRejectModal(false); setRejecting(null); } }} title="Reject service request" size="md">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Reject {rejecting.id}? Optionally provide a reason.</p>
            <Input label="Reason (optional)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason" />
            <div className="flex gap-3">
              <Button variant="danger" onClick={doReject}>Reject</Button>
              <Button variant="ghost" onClick={() => { setRejectModal(false); setRejecting(null); }}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
