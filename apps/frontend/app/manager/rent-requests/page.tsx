'use client';

import React, { useState, useEffect } from 'react';
import type { RentRequest } from '../../../lib/customer-types';
import {
  listRentRequests,
  managerUpdateRentRequestStatus,
} from '../../../lib/rent-requests.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ManagerRentRequestsPage() {
  const toast = useToastHelpers();
  const [requests, setRequests] = useState<RentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<RentRequest | null>(null);
  const [rejecting, setRejecting] = useState<RentRequest | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listRentRequests();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rent requests');
      toast.error('Failed to load rent requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (r: RentRequest) => {
    if (r.status !== 'Submitted') return;
    doApprove(r.id);
  };

  const doApprove = async (id: string) => {
    try {
      setApprovingId(id);
      await managerUpdateRentRequestStatus(id, 'Approved');
      toast.success('Rent request approved');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve rent request');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = (r: RentRequest) => {
    setDetail(null);
    setRejecting(r);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const doReject = async () => {
    if (!rejecting) return;
    try {
      await managerUpdateRentRequestStatus(rejecting.id, 'Rejected', rejectReason);
      toast.success('Rent request rejected');
      setRejectModalOpen(false);
      setRejecting(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Rent Requests</h1>
        <p className="text-slate-500 mt-1">Review and approve shelf rental requests</p>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : requests.length === 0 ? (
        <EmptyState icon="request_quote" title="No rent requests" message="No submitted requests to review" />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHead>
              <TableHeader>Request code</TableHeader>
              <TableHeader>Customer</TableHeader>
              <TableHeader>Shelves</TableHeader>
              <TableHeader>Duration</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHead>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-bold text-slate-900">{r.id}</TableCell>
                  <TableCell className="text-slate-700">{r.customerName || '—'}</TableCell>
                  <TableCell className="text-slate-700">{r.shelves}</TableCell>
                  <TableCell className="text-slate-700">{r.durationMonths} months</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === 'Approved' ? 'success' : r.status === 'Rejected' ? 'error' : 'warning'
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDetail(r)}
                        className="text-sm font-bold text-primary hover:underline"
                      >
                        View
                      </button>
                      {r.status === 'Submitted' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(r)}
                            className="text-sm font-bold text-emerald-600 hover:underline"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(r)}
                            className="text-sm font-bold text-red-600 hover:underline"
                          >
                            Reject
                          </button>
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

      {/* Detail modal */}
      {detail && (
        <Modal open={!!detail} onOpenChange={(o) => !o && setDetail(null)} title={`Request ${detail.id}`} size="md">
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-slate-500">Customer</dt>
              <dd className="font-bold">{detail.customerName || '—'}</dd>
              <dt className="text-slate-500">Shelves</dt>
              <dd className="font-bold">{detail.shelves}</dd>
              <dt className="text-slate-500">Start / Duration</dt>
              <dd className="font-bold">{detail.startDate} / {detail.durationMonths} months</dd>
              <dt className="text-slate-500">Zone</dt>
              <dd className="font-bold">{detail.zonePreference || '—'}</dd>
              <dt className="text-slate-500">Counting unit</dt>
              <dd className="font-bold">{detail.countingUnit}</dd>
              <dt className="text-slate-500">Categories</dt>
              <dd className="font-bold">{detail.goodsCategory?.join(', ') || '—'}</dd>
            </dl>
            {detail.specialNotes && (
              <div>
                <p className="text-slate-500 text-sm mb-1">Special notes</p>
                <p className="text-slate-800">{detail.specialNotes}</p>
              </div>
            )}
            {detail.status === 'Submitted' && (
              <div className="flex gap-3 pt-4">
                <Button onClick={() => { handleApprove(detail); setDetail(null); }}>Approve → Create contract</Button>
                <Button variant="ghost" onClick={() => handleReject(detail)}>Reject</Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reject modal */}
      {rejectModalOpen && rejecting && (
        <Modal open={rejectModalOpen} onOpenChange={(o) => { if (!o) { setRejectModalOpen(false); setRejecting(null); } }} title="Reject rent request" size="md">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Reject request {rejecting.id}? You may provide a reason.</p>
            <Input
              label="Reason (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection"
            />
            <div className="flex gap-3">
              <Button variant="danger" onClick={doReject}>Reject</Button>
              <Button variant="ghost" onClick={() => { setRejectModalOpen(false); setRejecting(null); }}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
