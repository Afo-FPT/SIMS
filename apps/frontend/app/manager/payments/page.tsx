'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { listManagerPayments, type ManagerContractPayment, type ManagerServicePayment } from '../../../lib/payment.api';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payments</h1>
          <p className="mt-1 text-slate-500">Monitor contract and service-credit transactions</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="inline-flex items-center gap-1"
          onClick={() => load(true)}
          isLoading={refreshing}
          disabled={loading}
        >
          <span className="material-symbols-outlined text-lg leading-none">refresh</span>
          Refresh
        </Button>
      </div>

      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
            tab === 'contract' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
          onClick={() => setTab('contract')}
        >
          Contract ({contractPayments.length})
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
            tab === 'service' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
          onClick={() => setTab('service')}
        >
          Service ({servicePayments.length})
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-36" />
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
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="max-h-[560px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left font-bold text-slate-600">Time</th>
                  <th className="px-4 py-2 text-left font-bold text-slate-600">Contract</th>
                  <th className="px-4 py-2 text-left font-bold text-slate-600">Customer</th>
                  {tab === 'service' && <th className="px-4 py-2 text-left font-bold text-slate-600">Credits</th>}
                  <th className="px-4 py-2 text-left font-bold text-slate-600">Amount</th>
                  <th className="px-4 py-2 text-left font-bold text-slate-600">Status</th>
                  <th className="px-4 py-2 text-left font-bold text-slate-600">VNPay code</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2 text-slate-600">
                      {new Date(p.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      <div className="font-bold">{p.contractCode || p.contractId}</div>
                      {p.warehouseName && <div className="text-xs text-slate-500">{p.warehouseName}</div>}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{p.customerName || '—'}</td>
                    {tab === 'service' && (
                      <td className="px-4 py-2 font-semibold text-slate-700">
                        {(p as ManagerServicePayment).creditsGranted} credit
                      </td>
                    )}
                    <td className="px-4 py-2 text-slate-900 font-bold">{p.amount.toLocaleString('vi-VN')} đ</td>
                    <td className="px-4 py-2">
                      <Badge variant={statusVariant(p.status)}>{formatStatus(p.status)}</Badge>
                      {p.paidAt && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          at{' '}
                          {new Date(p.paidAt).toLocaleString('vi-VN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      <div className="font-mono text-xs break-all">{p.vnpTxnRef}</div>
                      {p.vnpResponseCode && <div className="text-[11px] text-slate-500 mt-0.5">Resp: {p.vnpResponseCode}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
