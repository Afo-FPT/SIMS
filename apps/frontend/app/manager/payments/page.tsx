'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { listManagerPayments, type ManagerContractPayment, type ManagerServicePayment } from '../../../lib/payment.api';
import { formatDateTime } from '../../../lib/date-format';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { PageHeader } from '../../../components/ui/PageHeader';

type PaymentTab = 'contract' | 'service';
type StatusFilter = '' | 'paid' | 'pending' | 'expired' | 'failed';

function parseIsoLocalDate(value: string): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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

  const filteredRows = useMemo(() => {
    return activeRows.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      const created = new Date(p.createdAt);
      if (!Number.isNaN(created.getTime())) {
        const from = parseIsoLocalDate(fromDate);
        const to = parseIsoLocalDate(toDate);
        if (from && created < from) return false;
        if (to) {
          const end = new Date(to);
          end.setHours(23, 59, 59, 999);
          if (created > end) return false;
        }
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const contract = (p.contractCode || p.contractId || '').toLowerCase();
        const customer = (p.customerName || '').toLowerCase();
        if (!contract.includes(q) && !customer.includes(q)) return false;
      }
      return true;
    });
  }, [activeRows, search, statusFilter, fromDate, toDate]);

  const hasActiveFilter = search.trim() !== '' || statusFilter !== '' || fromDate !== '' || toDate !== '';

  // Reset filters when switching tabs
  const handleTabChange = (newTab: PaymentTab) => {
    setTab(newTab);
    setSearch('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
  };

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
          onClick={() => handleTabChange('contract')}
        >
          Contract ({contractPayments.length})
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
            tab === 'service' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => handleTabChange('service')}
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
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Input
                placeholder="Search by contract code or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                options={[
                  { value: '', label: 'All statuses' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'expired', label: 'Expired' },
                  { value: 'failed', label: 'Failed' },
                ]}
              />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500">From date</p>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500">To date</p>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            {hasActiveFilter && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {filteredRows.length}/{activeRows.length} result{filteredRows.length !== 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => { setSearch(''); setStatusFilter(''); setFromDate(''); setToDate(''); }}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {activeRows.length === 0 ? (
            <EmptyState
              icon="payments"
              title={tab === 'contract' ? 'No contract payments' : 'No service payments'}
              message={tab === 'contract' ? 'No contract payments found yet.' : 'No service-credit payments found yet.'}
            />
          ) : filteredRows.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="No results found"
              message="No payments match your current filters. Try adjusting or clearing them."
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
                  {filteredRows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-slate-500 text-xs">
                        {formatDateTime(p.createdAt)}
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
                            at {formatDateTime(p.paidAt)}
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
        </>
      )}
    </div>
  );
}
