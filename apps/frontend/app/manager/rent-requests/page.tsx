'use client';

import React, { useState, useEffect } from 'react';
import type { Contract } from '../../../lib/customer-types';
import { listContracts, updateContractStatus } from '../../../lib/mockApi/manager.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  } catch {
    return dateStr;
  }
}

export default function ManagerRentRequestsPage() {
  const toast = useToastHelpers();
  const [draftContracts, setDraftContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Contract | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listContracts();
      // Chỉ hiển thị các hợp đồng ở trạng thái draft như là "rent requests"
      const drafts = data.filter((c) => c.status === 'draft');
      setDraftContracts(drafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rent requests');
      toast.error('Failed to load rent requests');
    } finally {
      setLoading(false);
    }
  };

  const doApprove = async (id: string) => {
    try {
      setApprovingId(id);
      await updateContractStatus(id, 'pending_payment');
      toast.success('Draft contract approved. Status changed to pending payment and moved to Contracts.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve draft contract');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Rent Requests</h1>
        <p className="text-slate-500 mt-1">
          Review draft contracts created from customer rental requests. Approving will move them to Contracts with
          status <span className="font-bold">pending payment</span>.
        </p>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : draftContracts.length === 0 ? (
        <EmptyState
          icon="request_quote"
          title="No rent requests"
          message="No draft contracts from rental requests to review."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHead>
              <TableHeader>Contract code</TableHeader>
              <TableHeader>Customer</TableHeader>
              <TableHeader>Warehouse</TableHeader>
              <TableHeader>Rental period</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHead>
            <TableBody>
              {draftContracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold text-slate-900">{c.code}</TableCell>
                  <TableCell className="text-slate-700">{c.customerName || '—'}</TableCell>
                  <TableCell className="text-slate-700">{c.warehouseName || c.warehouseId}</TableCell>
                  <TableCell className="text-slate-700">
                    {c.requestedStartDate && c.requestedEndDate
                      ? `${formatDate(c.requestedStartDate)} → ${formatDate(c.requestedEndDate)}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">draft</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => doApprove(c.id)}
                      isLoading={approvingId === c.id}
                    >
                      Approve
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <Modal
          open={!!detail}
          onOpenChange={(o) => !o && setDetail(null)}
          title={`Draft contract ${detail.code}`}
          size="md"
        >
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-slate-500">Customer</dt>
              <dd className="font-bold">{detail.customerName || '—'}</dd>
              <dt className="text-slate-500">Warehouse</dt>
              <dd className="font-bold">{detail.warehouseName || detail.warehouseId}</dd>
              <dt className="text-slate-500">Rental period</dt>
              <dd className="font-bold">
                {detail.requestedStartDate && detail.requestedEndDate
                  ? `${formatDate(detail.requestedStartDate)} → ${formatDate(detail.requestedEndDate)}`
                  : '—'}
              </dd>
              <dt className="text-slate-500">Status</dt>
              <dd className="font-bold">draft</dd>
            </dl>
            <div className="flex gap-3 pt-4">
              <Button onClick={() => { doApprove(detail.id); setDetail(null); }}>
                Approve
              </Button>
              <Button variant="ghost" onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
