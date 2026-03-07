'use client';

import React, { useState, useEffect } from 'react';
import type { ServiceRequest, ServiceRequestType } from '../../../lib/customer-types';
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
  const [createTaskModal] = useState(false);
  const [rejectModal] = useState(false);
  const [rejecting] = useState<ServiceRequest | null>(null);
  const [rejectReason] = useState('');
  const [taskPayload] = useState<CreateTaskFromServiceRequestPayload | null>(null);
  const [submitting] = useState(false);
  const [requestType, setRequestType] = useState<ServiceRequestType | 'ALL'>('ALL');

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

  const filteredRequests = requests.filter((r) => (requestType === 'ALL' ? true : r.type === requestType));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Service Requests</h1>
        <p className="text-slate-500 mt-1">View all inbound / outbound / inventory checking requests (read only).</p>
      </div>

      {/* Request type tabs */}
      <div className="space-y-4">
        <p className="text-sm font-bold text-slate-700">Request type</p>
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'Inbound', 'Outbound', 'Inventory Checking'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setRequestType(type)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                requestType === type
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight pt-1">
          {requestType === 'ALL' ? 'ALL REQUESTS' : requestType.toUpperCase()}
        </h2>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          icon="local_shipping"
          title={`No ${requestType} requests`}
          message={`No ${requestType.toLowerCase()} requests in this tab`}
        />
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
              {filteredRequests.map((r) => (
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
                    <button
                      type="button"
                      onClick={() => setDetail(r)}
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      View
                    </button>
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

      {/* Read-only page: no approve/reject/actions besides viewing details */}
    </div>
  );
}
