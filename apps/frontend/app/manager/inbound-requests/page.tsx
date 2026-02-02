'use client';

import React, { useEffect, useState } from 'react';
import { useToastHelpers } from '../../../lib/toast';
import { listStorageRequests, approveInboundRequest, type StorageRequestView } from '../../../lib/storage-requests.api';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input } from '../../../components/ui/Input';

export default function ManagerInboundRequestsPage() {
  const toast = useToastHelpers();
  const [items, setItems] = useState<StorageRequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<StorageRequestView | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listStorageRequests({ requestType: 'IN', status: 'PENDING' });
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inbound requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const doApprove = async (id: string) => {
    try {
      setActing(true);
      await approveInboundRequest(id, { decision: 'APPROVED' });
      toast.success('Inbound request approved');
      setDetail(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setActing(false);
    }
  };

  const doReject = async () => {
    if (!detail) return;
    try {
      setActing(true);
      await approveInboundRequest(detail.request_id, { decision: 'REJECTED', note: rejectReason });
      toast.success('Inbound request rejected');
      setRejectOpen(false);
      setDetail(null);
      setRejectReason('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inbound Requests</h1>
        <p className="text-slate-500 mt-1">Approve inbound requests so staff can putaway into shelves</p>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon="inbox" title="No inbound requests" message="No pending inbound requests" />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHead>
              <TableHeader>Request ID</TableHeader>
              <TableHeader>Contract</TableHeader>
              <TableHeader>Items</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHead>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.request_id}>
                  <TableCell className="font-bold text-slate-900">{r.request_id}</TableCell>
                  <TableCell className="text-slate-700">{r.contract_id}</TableCell>
                  <TableCell className="text-slate-700">{r.items.length}</TableCell>
                  <TableCell><Badge variant="warning">{r.status}</Badge></TableCell>
                  <TableCell>
                    <button type="button" onClick={() => setDetail(r)} className="text-sm font-bold text-primary hover:underline">
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
        <Modal open={!!detail} onOpenChange={(o) => !o && setDetail(null)} title={`Inbound ${detail.request_id}`} size="lg">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Contract: <span className="font-bold">{detail.contract_id}</span></p>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-2 text-left">Item</th>
                    <th className="px-4 py-2 text-left">Qty</th>
                    <th className="px-4 py-2 text-left">Unit</th>
                    <th className="px-4 py-2 text-left">Qty/unit</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((it) => (
                    <tr key={it.request_detail_id} className="border-t border-slate-100">
                      <td className="px-4 py-2">{it.item_name}</td>
                      <td className="px-4 py-2">{it.quantity_requested}</td>
                      <td className="px-4 py-2">{it.unit}</td>
                      <td className="px-4 py-2">{it.quantity_per_unit ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => doApprove(detail.request_id)} isLoading={acting}>Approve</Button>
              <Button variant="secondary" onClick={() => setRejectOpen(true)} disabled={acting}>Reject</Button>
            </div>
          </div>
        </Modal>
      )}

      {rejectOpen && detail && (
        <Modal open={rejectOpen} onOpenChange={setRejectOpen} title="Reject inbound request" size="md">
          <div className="space-y-3">
            <Input label="Reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason is required" />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={doReject} disabled={!rejectReason.trim()} isLoading={acting}>Reject</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

