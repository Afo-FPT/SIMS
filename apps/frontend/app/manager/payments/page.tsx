'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { listManagerPayments, type ManagerPayment, type PaymentStatus } from '../../../lib/payment.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';

type StatusFilter = PaymentStatus | 'all';

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ManagerPaymentsPage() {
  const toast = useToastHelpers();
  const [payments, setPayments] = useState<ManagerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selected, setSelected] = useState<ManagerPayment | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listManagerPayments();
        setPayments(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load payments';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
    timer = setInterval(load, 5000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [toast]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (new Date(p.createdAt) < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (new Date(p.createdAt) > to) return false;
      }
      return true;
    });
  }, [payments, statusFilter, fromDate, toDate]);

  const statusLabel = (status: PaymentStatus) => {
    if (status === 'paid') return 'Paid';
    if (status === 'pending') return 'Pending';
    if (status === 'expired') return 'Expired';
    return 'Failed';
  };

  const statusVariant = (status: PaymentStatus): 'success' | 'warning' | 'error' | 'info' => {
    if (status === 'paid') return 'success';
    if (status === 'pending') return 'info';
    if (status === 'expired') return 'warning';
    return 'error';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payments</h1>
          <p className="text-slate-500 mt-1">Monitor VNPay payments in real-time</p>
        </div>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'paid', label: 'Paid' },
              { value: 'failed', label: 'Failed' },
              { value: 'expired', label: 'Expired' },
            ]}
          />
          <Input
            label="From date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            label="To date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </section>

      {loading ? (
        <LoadingSkeleton className="h-48" />
      ) : error ? (
        <ErrorState title="Failed to load payments" message={error} onRetry={() => window.location.reload()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="payments" title="No payments" message="No payments match current filters." />
      ) : (
        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="max-h-[540px] overflow-y-auto">
            <Table>
              <TableHead>
                <TableHeader>Time</TableHeader>
                <TableHeader>Contract</TableHeader>
                <TableHeader>Customer</TableHeader>
                <TableHeader>Warehouse</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>VNPay TxnRef</TableHeader>
              </TableHead>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id} onClick={() => setSelected(p)} className="cursor-pointer hover:bg-slate-50">
                    <TableCell className="text-slate-600">{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell className="text-slate-800 font-bold">{p.contractCode || p.contractId}</TableCell>
                    <TableCell className="text-slate-700">{p.customerName || '—'}</TableCell>
                    <TableCell className="text-slate-700">{p.warehouseName || '—'}</TableCell>
                    <TableCell className="text-slate-900 font-bold">
                      {p.amount.toLocaleString('vi-VN')} đ
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-700 break-all">
                      {p.vnpTxnRef}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {selected && (
        <Modal open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title="Payment detail" size="md">
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-slate-500">Contract</dt>
                <dd className="font-bold text-slate-900">
                  {selected.contractCode || selected.contractId}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Customer</dt>
                <dd className="font-bold text-slate-900">{selected.customerName || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Warehouse</dt>
                <dd className="font-bold text-slate-900">{selected.warehouseName || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Amount</dt>
                <dd className="font-black text-slate-900">
                  {selected.amount.toLocaleString('vi-VN')} đ
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="font-bold text-slate-900">
                  <Badge variant={statusVariant(selected.status)}>{statusLabel(selected.status)}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Created at</dt>
                <dd className="font-medium text-slate-800">{formatDateTime(selected.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Updated at</dt>
                <dd className="font-medium text-slate-800">{formatDateTime(selected.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Paid at</dt>
                <dd className="font-medium text-slate-800">{formatDateTime(selected.paidAt)}</dd>
              </div>
            </dl>
            <div>
              <dt className="text-slate-500 mb-1 block">VNPay TxnRef</dt>
              <dd className="font-mono text-xs break-all bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                {selected.vnpTxnRef}
              </dd>
            </div>
            {selected.vnpResponseCode && (
              <div>
                <dt className="text-slate-500 mb-1 block">VNPay Response code</dt>
                <dd className="font-mono text-xs break-all bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  {selected.vnpResponseCode}
                </dd>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

