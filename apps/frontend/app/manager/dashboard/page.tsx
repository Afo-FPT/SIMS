'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import { getStockInHistory, getStockOutHistory } from '../../../lib/stock-history.api';
import { getCustomerContracts } from '../../../lib/customer.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ManagerDashboard() {
  const ITEMS_PER_PAGE = 4;
  const toast = useToastHelpers();
  const [contracts, setContracts] = useState<any[]>([]);
  const [storageRequests, setStorageRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);
  const [inboundVolume, setInboundVolume] = useState(0);
  const [outboundVolume, setOutboundVolume] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalInPage, setApprovalInPage] = useState(1);
  const [approvalOutPage, setApprovalOutPage] = useState(1);
  const [approvalCyclePage, setApprovalCyclePage] = useState(1);
  const [rentReviewPage, setRentReviewPage] = useState(1);
  const [cycleReviewPage, setCycleReviewPage] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [contractRows, requestRows, cycleRows, stockIn, stockOut] = await Promise.all([
        getCustomerContracts(),
        listStorageRequests(),
        getCycleCounts(),
        getStockInHistory({ limit: 300 }),
        getStockOutHistory({ limit: 300 }),
      ]);

      setContracts(contractRows);
      setStorageRequests(requestRows);
      setCycleCounts(cycleRows);
      setInboundVolume(
        stockIn.history.reduce(
          (sum, h) => sum + h.items.reduce((s, i) => s + (i.quantity_actual ?? i.quantity_requested ?? 0), 0),
          0,
        ),
      );
      setOutboundVolume(
        stockOut.history.reduce(
          (sum, h) => sum + h.items.reduce((s, i) => s + (i.quantity_actual ?? i.quantity_requested ?? 0), 0),
          0,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const contractsActive = contracts.filter((c) => c.status === 'active').length;
    const pendingApprovals = storageRequests.filter((r) => r.status === 'PENDING').length;
    const assignedToStaff = storageRequests.filter((r) => r.status === 'APPROVED').length;
    const discrepancyFlags =
      cycleCounts.filter((c) => c.status === 'ADJUSTMENT_REQUESTED').length +
      storageRequests.filter((r) => r.status === 'REJECTED').length;

    const zonesRented = contracts.reduce((sum, c) => sum + (c.rentedZones?.length || 0), 0);
    const estimatedZoneCapacity = Math.max(zonesRented * 10000, 10000);
    const utilizationRate = Math.min(
      100,
      Math.round(((inboundVolume - outboundVolume > 0 ? inboundVolume - outboundVolume : inboundVolume) / estimatedZoneCapacity) * 100),
    );

    return {
      contractsActive,
      pendingApprovals,
      assignedToStaff,
      discrepancyFlags,
      utilizationRate,
    };
  }, [contracts, storageRequests, cycleCounts, inboundVolume, outboundVolume]);

  const pendingServiceAll = useMemo(
    () =>
      [...storageRequests]
        .filter((r) => r.status === 'PENDING')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [storageRequests],
  );

  const pendingInboundAll = useMemo(
    () => pendingServiceAll.filter((r) => r.request_type === 'IN'),
    [pendingServiceAll],
  );

  const pendingOutboundAll = useMemo(
    () => pendingServiceAll.filter((r) => r.request_type === 'OUT'),
    [pendingServiceAll],
  );

  const pendingCycleAll = useMemo(
    () =>
      [...cycleCounts]
        .filter((c) => c.status === 'STAFF_SUBMITTED' || c.status === 'ADJUSTMENT_REQUESTED')
        .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()),
    [cycleCounts],
  );

  const approvalInTotalPages = Math.max(1, Math.ceil(pendingInboundAll.length / ITEMS_PER_PAGE));
  const approvalOutTotalPages = Math.max(1, Math.ceil(pendingOutboundAll.length / ITEMS_PER_PAGE));
  const approvalCycleTotalPages = Math.max(1, Math.ceil(pendingCycleAll.length / ITEMS_PER_PAGE));
  const rentReviewTotalPages = Math.max(1, Math.ceil(contracts.filter((c) => c.status === 'draft').length / ITEMS_PER_PAGE));
  const cycleReviewTotalPages = Math.max(1, Math.ceil(pendingCycleAll.length / ITEMS_PER_PAGE));

  const approvalInboundItems = useMemo(
    () => pendingInboundAll.slice((approvalInPage - 1) * ITEMS_PER_PAGE, approvalInPage * ITEMS_PER_PAGE),
    [pendingInboundAll, approvalInPage],
  );
  const approvalOutboundItems = useMemo(
    () => pendingOutboundAll.slice((approvalOutPage - 1) * ITEMS_PER_PAGE, approvalOutPage * ITEMS_PER_PAGE),
    [pendingOutboundAll, approvalOutPage],
  );
  const approvalCycleItems = useMemo(
    () => pendingCycleAll.slice((approvalCyclePage - 1) * ITEMS_PER_PAGE, approvalCyclePage * ITEMS_PER_PAGE),
    [pendingCycleAll, approvalCyclePage],
  );
  const rentReviewItems = useMemo(
    () =>
      [...contracts]
        .filter((c) => c.status === 'draft')
        .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
        .slice((rentReviewPage - 1) * ITEMS_PER_PAGE, rentReviewPage * ITEMS_PER_PAGE),
    [contracts, rentReviewPage],
  );
  const cycleReviewItems = useMemo(
    () => pendingCycleAll.slice((cycleReviewPage - 1) * ITEMS_PER_PAGE, cycleReviewPage * ITEMS_PER_PAGE),
    [pendingCycleAll, cycleReviewPage],
  );

  useEffect(() => {
    setApprovalInPage(1);
    setApprovalOutPage(1);
    setApprovalCyclePage(1);
    setRentReviewPage(1);
    setCycleReviewPage(1);
  }, [pendingInboundAll.length, pendingOutboundAll.length, pendingCycleAll.length, contracts.length]);

  const utilizationTone = stats.utilizationRate >= 85 ? 'error' : stats.utilizationRate >= 70 ? 'warning' : 'success';

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manager Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Operations overview, approvals, capacity risk, and team execution</p>
        </div>
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manager Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Operations overview, approvals, capacity risk, and team execution</p>
        </div>
        <ErrorState title="Failed to load dashboard" message={error || 'Unknown error'} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manager Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Operations overview — approvals, contracts, inventory risk, and team workload.</p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-card"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
          Refresh
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: 'description', label: 'Active Contracts', value: stats.contractsActive, color: 'bg-primary-light', iconColor: 'text-primary' },
          { icon: 'pending_actions', label: 'Pending Approvals', value: stats.pendingApprovals, color: 'bg-amber-50', iconColor: 'text-amber-600' },
          { icon: 'groups', label: 'Staff Assigned', value: stats.assignedToStaff, color: 'bg-blue-50', iconColor: 'text-blue-600' },
          { icon: 'warning', label: 'Alerts', value: stats.discrepancyFlags, color: 'bg-red-50', iconColor: 'text-red-500' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card flex items-start gap-4">
            <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
              <span className={`material-symbols-outlined ${card.iconColor}`} style={{ fontSize: 20 }}>{card.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 leading-none">{card.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1.5 leading-none">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="text-lg font-black text-slate-900">Quick actions</h2>
            <Badge variant={utilizationTone as 'success' | 'warning' | 'error'}>
              Utilization {stats.utilizationRate}%
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link href="/manager/rent-requests" className="rounded-2xl border border-slate-200 p-4 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rent approvals</p>
              <p className="text-xl font-black text-slate-900 mt-2">{stats.pendingApprovals}</p>
              <p className="text-xs text-slate-500 mt-1">Process draft contracts</p>
            </Link>
            <Link href="/manager/inbound-requests" className="rounded-2xl border border-slate-200 p-4 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inbound queue</p>
              <p className="text-xl font-black text-slate-900 mt-2">{storageRequests.filter((r) => r.request_type === 'IN').length}</p>
              <p className="text-xs text-slate-500 mt-1">Verify inbound operations</p>
            </Link>
            <Link href="/manager/outbound-requests" className="rounded-2xl border border-slate-200 p-4 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Outbound queue</p>
              <p className="text-xl font-black text-slate-900 mt-2">{storageRequests.filter((r) => r.request_type === 'OUT').length}</p>
              <p className="text-xs text-slate-500 mt-1">Fulfillment in progress</p>
            </Link>
            <Link href="/manager/cycle-count" className="rounded-2xl border border-slate-200 p-4 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cycle count</p>
              <p className="text-xl font-black text-slate-900 mt-2">{cycleCounts.length}</p>
              <p className="text-xs text-slate-500 mt-1">Check inventory discrepancies</p>
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-base font-bold text-slate-900 mb-4">Needs Attention</h2>
          <div className="space-y-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Pending approvals</p>
              <p className="text-2xl font-black text-amber-700 mt-1">{stats.pendingApprovals}</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Discrepancy alerts</p>
              <p className="text-2xl font-black text-red-700 mt-1">{stats.discrepancyFlags}</p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Capacity utilization</p>
              <p className="text-2xl font-black text-blue-700 mt-1">{stats.utilizationRate}%</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Action priority</p>
            <p className="text-sm text-slate-600">
              {stats.pendingApprovals > 0
                ? 'Process rent approvals first, then review cycle count adjustments.'
                : 'No urgent approvals now. Continue monitoring tasks and capacity.'}
            </p>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
          <div className="flex items-center justify-between p-6">
            <h2 className="text-lg font-black text-slate-900">Approval queue</h2>
            <Link href="/manager/rent-requests" className="text-sm font-bold text-primary hover:underline">
              Open rent requests
            </Link>
          </div>
          {pendingServiceAll.length === 0 && pendingCycleAll.length === 0 ? (
            <EmptyState icon="done_all" title="No pending approvals" message="All approval queues are currently clear." />
          ) : (
            <div className="px-6 pb-6">
              <div
                className={`grid grid-cols-1 gap-5 ${
                  pendingCycleAll.length > 0 ? 'xl:grid-cols-2' : ''
                }`}
              >
              {(pendingInboundAll.length > 0 || pendingOutboundAll.length > 0) && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Storage requests</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Inbound</p>
                        <p className="text-xs text-slate-400">Page {approvalInPage}/{approvalInTotalPages}</p>
                      </div>
                      {approvalInboundItems.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">No pending inbound requests.</p>
                      ) : (
                        approvalInboundItems.map((r) => (
                          <div key={r.request_id} className="rounded-xl border border-slate-200 p-2.5 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{r.reference || r.request_id.slice(-8)}</p>
                              <p className="text-xs text-slate-500">{r.contract_code || r.contract_id?.slice(-6)}</p>
                            </div>
                            <Badge variant="warning">PENDING</Badge>
                          </div>
                        ))
                      )}
                      {approvalInTotalPages > 1 && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            disabled={approvalInPage <= 1}
                            onClick={() => setApprovalInPage((p) => Math.max(1, p - 1))}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40"
                          >
                            Prev
                          </button>
                          <button
                            type="button"
                            disabled={approvalInPage >= approvalInTotalPages}
                            onClick={() => setApprovalInPage((p) => Math.min(approvalInTotalPages, p + 1))}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Outbound</p>
                        <p className="text-xs text-slate-400">Page {approvalOutPage}/{approvalOutTotalPages}</p>
                      </div>
                      {approvalOutboundItems.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">No pending outbound requests.</p>
                      ) : (
                        approvalOutboundItems.map((r) => (
                          <div key={r.request_id} className="rounded-xl border border-slate-200 p-2.5 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{r.reference || r.request_id.slice(-8)}</p>
                              <p className="text-xs text-slate-500">{r.contract_code || r.contract_id?.slice(-6)}</p>
                            </div>
                            <Badge variant="warning">PENDING</Badge>
                          </div>
                        ))
                      )}
                      {approvalOutTotalPages > 1 && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            disabled={approvalOutPage <= 1}
                            onClick={() => setApprovalOutPage((p) => Math.max(1, p - 1))}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40"
                          >
                            Prev
                          </button>
                          <button
                            type="button"
                            disabled={approvalOutPage >= approvalOutTotalPages}
                            onClick={() => setApprovalOutPage((p) => Math.min(approvalOutTotalPages, p + 1))}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {pendingCycleAll.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cycle counts</p>
                    <p className="text-xs text-slate-400">
                      Page {approvalCyclePage}/{approvalCycleTotalPages}
                    </p>
                  </div>
                  {approvalCycleItems.map((c) => (
                    <div key={c.cycle_count_id} className="rounded-2xl border border-slate-200 p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{c.cycle_count_id.slice(-8).toUpperCase()}</p>
                        <p className="text-xs text-slate-500">{c.contract_code || 'No contract code'}</p>
                      </div>
                      <Badge variant={c.status === 'ADJUSTMENT_REQUESTED' ? 'error' : 'info'}>{c.status}</Badge>
                    </div>
                  ))}
                  {approvalCycleTotalPages > 1 && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        disabled={approvalCyclePage <= 1}
                        onClick={() => setApprovalCyclePage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={approvalCyclePage >= approvalCycleTotalPages}
                        onClick={() => setApprovalCyclePage((p) => Math.min(approvalCycleTotalPages, p + 1))}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
          <div className="flex items-center justify-between p-6">
            <h2 className="text-lg font-black text-slate-900">Quick Rent Requests Review</h2>
            <Link href="/manager/rent-requests" className="text-sm font-bold text-primary hover:underline">
              Open rent requests
            </Link>
          </div>
          {contracts.filter((c) => c.status === 'draft').length === 0 ? (
            <EmptyState icon="description" title="No pending rent requests" message="There are no draft contracts waiting for manager review." />
          ) : (
            <div className="space-y-4">
              <div className="hidden lg:block">
                <Table>
                  <TableHead>
                    <TableHeader>Contract</TableHeader>
                    <TableHeader>Customer</TableHeader>
                    <TableHeader>Warehouse</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Created</TableHeader>
                  </TableHead>
                  <TableBody>
                    {rentReviewItems.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-bold text-slate-900">{c.code || c.id.slice(-8).toUpperCase()}</TableCell>
                        <TableCell className="text-slate-700">{c.customerName || '—'}</TableCell>
                        <TableCell className="text-slate-700">{c.warehouseName || c.warehouseId || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="warning">DRAFT</Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">{new Date(c.createdAt).toLocaleString('en-GB')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rentReviewTotalPages > 1 && (
                  <div className="px-6 pt-3 pb-1 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={rentReviewPage <= 1}
                      onClick={() => setRentReviewPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-slate-400">{rentReviewPage}/{rentReviewTotalPages}</span>
                    <button
                      type="button"
                      disabled={rentReviewPage >= rentReviewTotalPages}
                      onClick={() => setRentReviewPage((p) => Math.min(rentReviewTotalPages, p + 1))}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <div className="lg:hidden px-6 pb-6 space-y-3">
                {rentReviewItems.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-slate-200 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-black text-slate-900">{c.code || c.id.slice(-8).toUpperCase()}</p>
                      <Badge variant="warning">DRAFT</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Customer: {c.customerName || '—'}
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="neutral">{c.warehouseName || c.warehouseId || '—'}</Badge>
                      <p className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString('en-GB')}</p>
                    </div>
                  </div>
                ))}
                {rentReviewTotalPages > 1 && (
                  <div className="pt-1 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={rentReviewPage <= 1}
                      onClick={() => setRentReviewPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-slate-400">{rentReviewPage}/{rentReviewTotalPages}</span>
                    <button
                      type="button"
                      disabled={rentReviewPage >= rentReviewTotalPages}
                      onClick={() => setRentReviewPage((p) => Math.min(rentReviewTotalPages, p + 1))}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
        <div className="flex items-center justify-between p-6">
          <h2 className="text-lg font-black text-slate-900">Pending Cycle Count Reviews</h2>
          <Link href="/manager/tasks" className="text-sm font-bold text-primary hover:underline">
            View all tasks
          </Link>
        </div>
        {pendingCycleAll.length === 0 ? (
          <EmptyState icon="assignment" title="No pending cycle counts" message="No cycle count items are waiting for manager review." />
        ) : (
          <div className="space-y-3">
            <Table>
              <TableHead>
                <TableHeader>Task</TableHeader>
                <TableHeader>Contract</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Updated</TableHeader>
              </TableHead>
              <TableBody>
                {cycleReviewItems.map((t) => (
                  <TableRow key={t.cycle_count_id}>
                    <TableCell className="font-bold text-slate-900">{t.cycle_count_id.slice(-8).toUpperCase()}</TableCell>
                    <TableCell><Badge variant="neutral">{t.contract_code}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'ADJUSTMENT_REQUESTED' ? 'error' : 'info'}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {new Date(t.updated_at || t.created_at).toLocaleString('en-GB')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {cycleReviewTotalPages > 1 && (
              <div className="px-6 pb-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={cycleReviewPage <= 1}
                  onClick={() => setCycleReviewPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-xs text-slate-400">{cycleReviewPage}/{cycleReviewTotalPages}</span>
                <button
                  type="button"
                  disabled={cycleReviewPage >= cycleReviewTotalPages}
                  onClick={() => setCycleReviewPage((p) => Math.min(cycleReviewTotalPages, p + 1))}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
