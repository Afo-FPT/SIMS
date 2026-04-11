'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { listManagerPayments, type ManagerContractPayment, type ManagerServicePayment } from '../../../lib/payment.api';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { PageHeader } from '../../../components/ui/PageHeader';

type PaymentTab = 'contract' | 'service';

function formatStatus(status: string): string {
  if (status === 'paid') return 'Paid';
  if (status === 'pending') return 'Pending';
  if (status === 'expired') return 'Expired';
  return 'Failed';
}

function statusVariant(status: string): 'success' | 'info' | 'error' {
  if (status === 'paid') return 'success';
  if (status === 'pending') return 'info';
  return 'error';
}

export default function ManagerPaymentsPage() {
  const [tab, setTab] = useState<PaymentTab>('contract');
  const [contractPayments, setContractPayments] = useState<ManagerContractPayment[]>([]);
  const [servicePayments, setServicePayments] = useState<ManagerServicePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await listManagerPayments();
      setContractPayments(data.contractPayments);
      setServicePayments(data.servicePayments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const activeRows = useMemo(
    () => (tab === 'contract' ? contractPayments : servicePayments),
    [tab, contractPayments, servicePayments],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Monitor contract and service-credit transactions."
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => load(true)}
            isLoading={refreshing}
            disabled={loading}
            leftIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>}
          >
            Refresh
          </Button>
        }
      />

      {/* Tab switcher */}
      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
            tab === 'contract' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setTab('contract')}
        >
          Contract ({contractPayments.length})
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
            tab === 'service' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setTab('service')}
        >
          Service ({servicePayments.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton className="h-36 rounded-2xl" />
      ) : error ? (
        <ErrorState title="Failed to load payments" message={error} onRetry={() => load(false)} />
      ) : contractPayments.length === 0 && servicePayments.length === 0 ? (
        <EmptyState icon="payments" title="No payments" message="No payments found yet." />
      ) : activeRows.length === 0 ? (
        <EmptyState
          icon="payments"
          title={tab === 'contract' ? 'No contract payments' : 'No service payments'}
          message={tab === 'contract' ? 'No contract payments found yet.' : 'No service-credit payments found yet.'}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
          <Table>
            <TableHead>
              <TableHeader>Time</TableHeader>
              <TableHeader>Contract</TableHeader>
              <TableHeader>Customer</TableHeader>
              {tab === 'service' && <TableHeader>Credits</TableHeader>}
              <TableHeader>Amount</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>VNPay Code</TableHeader>
            </TableHead>
            <TableBody>
              {activeRows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-slate-500 text-xs">
                    {new Date(p.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-800">{p.contractCode || p.contractId}</div>
                    {p.warehouseName && <div className="text-xs text-slate-500 mt-0.5">{p.warehouseName}</div>}
                  </TableCell>
                  <TableCell className="text-slate-700">{p.customerName || '—'}</TableCell>
                  {tab === 'service' && (
                    <TableCell className="font-semibold text-slate-700">
                      {(p as ManagerServicePayment).creditsGranted} credit
                    </TableCell>
                  )}
                  <TableCell className="font-bold text-slate-900">
                    {p.amount.toLocaleString('vi-VN')} đ
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(p.status)}>{formatStatus(p.status)}</Badge>
                    {p.paidAt && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        at {new Date(p.paidAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-xs text-slate-600 break-all">{p.vnpTxnRef}</div>
                    {p.vnpResponseCode && (
                      <div className="text-[11px] text-slate-500 mt-0.5">Resp: {p.vnpResponseCode}</div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
