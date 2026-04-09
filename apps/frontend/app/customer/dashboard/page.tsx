'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToastHelpers } from '../../../lib/toast';
import { getCustomerContracts } from '../../../lib/customer.api';
import { listMyStoredItems } from '../../../lib/stored-items.api';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import type { Contract } from '../../../lib/customer-types';
import type { StoredItemOption } from '../../../lib/stored-items.api';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { Pagination } from '../../../components/ui/Pagination';
import { TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function CustomerDashboard() {
  const ITEMS_PER_PAGE = 5;
  const toast = useToastHelpers();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [storedItems, setStoredItems] = useState<StoredItemOption[]>([]);
  const [storageRequests, setStorageRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [requestPage, setRequestPage] = useState(1);
  const [contractPage, setContractPage] = useState(1);

  useEffect(() => {
    void loadData(true);
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') void loadData(false);
    }, 15000);
    return () => clearInterval(poll);
  }, []);

  const loadData = async (isInitial: boolean) => {
    try {
      if (isInitial) {
        setLoading(true);
        setError(null);
      }
      const [c, items, sr, cc] = await Promise.all([
        getCustomerContracts(),
        listMyStoredItems(),
        listStorageRequests(),
        getCycleCounts(),
      ]);
      setContracts(c);
      setStoredItems(items);
      setStorageRequests(sr);
      setCycleCounts(cc);
      setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load dashboard data';
      if (isInitial) {
        setError(msg);
        toast.error(msg);
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const reloadData = () => {
    void loadData(true);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Dashboard</h1>
        </div>
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Dashboard</h1>
        </div>
        <ErrorState title="Failed to load dashboard" message={error} onRetry={reloadData} />
      </div>
    );
  }

  const activeContracts = contracts.filter((c) => c.status === 'active').length;
  const totalSKUs = new Set(storedItems.map((i) => i.item_name)).size;
  const totalQty = storedItems.reduce((s, i) => s + i.quantity, 0);
  const lowStockCount = storedItems.filter((i) => i.quantity < 50).length;
  const requestPending = storageRequests.filter((r) => r.status === 'PENDING').length;
  const requestInProgress = storageRequests.filter((r) => r.status === 'APPROVED' || r.status === 'DONE_BY_STAFF').length;
  const requestCompleted = storageRequests.filter((r) => r.status === 'COMPLETED').length;
  const pendingConfirmations = cycleCounts.filter((c) => c.status === 'STAFF_SUBMITTED').length;

  const recentRequestsAll = [...storageRequests]
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 50);
  const recentContractsAll = [...contracts]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 50);

  const requestTotalPages = Math.max(1, Math.ceil(recentRequestsAll.length / ITEMS_PER_PAGE));
  const contractTotalPages = Math.max(1, Math.ceil(recentContractsAll.length / ITEMS_PER_PAGE));
  const recentRequests = recentRequestsAll.slice((requestPage - 1) * ITEMS_PER_PAGE, requestPage * ITEMS_PER_PAGE);
  const recentContracts = recentContractsAll.slice((contractPage - 1) * ITEMS_PER_PAGE, contractPage * ITEMS_PER_PAGE);

  const contractStatusVariant = (status: string) => {
    if (status === 'active') return 'success' as const;
    if (status === 'draft' || status === 'pending_payment') return 'warning' as const;
    if (status === 'terminated') return 'error' as const;
    return 'neutral' as const;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Dashboard</h1>
          <p className="text-slate-500 mt-1">Visibility center for contracts, inventory, and service request progress</p>
          <p className="mt-1 text-xs text-slate-500">Last updated: {lastUpdated ?? '--:--:--'}</p>
        </div>
        <button
          type="button"
          onClick={reloadData}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-primary"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          Refresh data
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-primary p-6 text-white shadow-lg md:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/70">Today focus</p>
            <h2 className="text-2xl font-black leading-snug tracking-tight">
              Track active contracts and keep critical requests moving on time
            </h2>
            <p className="text-sm text-white/75">
              Prioritize pending service requests, then monitor low stock and cycle count confirmations.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:col-span-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/75">Active contracts</p>
              <p className="mt-2 text-3xl font-black">{activeContracts}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/75">Inventory qty</p>
              <p className="mt-2 text-3xl font-black">{totalQty}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/75">Pending requests</p>
              <p className="mt-2 text-3xl font-black">{requestPending}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/75">Completed</p>
              <p className="mt-2 text-3xl font-black">{requestCompleted}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">Quick actions</h2>
            <Badge variant={lowStockCount > 0 ? 'warning' : 'success'}>Low stock alerts {lowStockCount}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/customer/rent-requests" className="rounded-2xl border border-slate-200 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rent requests</p>
              <p className="mt-2 text-xl font-black text-slate-900">{contracts.filter((c) => c.status === 'draft').length}</p>
              <p className="mt-1 text-xs text-slate-500">Draft contracts awaiting process</p>
            </Link>
            <Link href="/customer/service-requests" className="rounded-2xl border border-slate-200 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service requests</p>
              <p className="mt-2 text-xl font-black text-slate-900">{requestInProgress}</p>
              <p className="mt-1 text-xs text-slate-500">Open request workload</p>
            </Link>
            <Link href="/customer/inventory" className="rounded-2xl border border-slate-200 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory</p>
              <p className="mt-2 text-xl font-black text-slate-900">{totalSKUs}</p>
              <p className="mt-1 text-xs text-slate-500">SKUs under management</p>
            </Link>
            <Link href="/customer/inventory-checking" className="rounded-2xl border border-slate-200 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cycle counts</p>
              <p className="mt-2 text-xl font-black text-slate-900">{pendingConfirmations}</p>
              <p className="mt-1 text-xs text-slate-500">Waiting confirmation</p>
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-slate-900">Needs attention</h2>
          <div className="space-y-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Pending requests</p>
              <p className="mt-1 text-2xl font-black text-amber-700">{requestPending}</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Low stock items</p>
              <p className="mt-1 text-2xl font-black text-red-700">{lowStockCount}</p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Cycle confirmations</p>
              <p className="mt-1 text-2xl font-black text-blue-700">{pendingConfirmations}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-6">
          <h2 className="text-lg font-black text-slate-900">Recent service requests</h2>
          <Link href="/customer/service-requests" className="text-sm font-bold text-primary hover:underline">
            View all requests
          </Link>
        </div>
        {recentRequestsAll.length === 0 ? (
          <EmptyState icon="history" title="No request activity" message="Your inbound/outbound service requests will appear here." />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableHeader>Reference</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Updated</TableHeader>
              </TableHead>
              <TableBody>
                {recentRequests.map((r) => (
                  <TableRow key={r.request_id}>
                    <TableCell className="font-bold text-slate-900">{r.reference || r.request_id.slice(-8)}</TableCell>
                    <TableCell>
                      <Badge variant="neutral">{r.request_type === 'IN' ? 'Inbound' : 'Outbound'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === 'COMPLETED'
                            ? 'success'
                            : r.status === 'REJECTED'
                              ? 'error'
                              : r.status === 'APPROVED' || r.status === 'DONE_BY_STAFF'
                                ? 'info'
                                : 'warning'
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{new Date(r.updated_at || r.created_at).toLocaleString('en-GB')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {requestTotalPages > 1 && (
              <div className="px-6 pb-4 flex justify-end">
                <Pagination currentPage={requestPage} totalPages={requestTotalPages} onPageChange={setRequestPage} />
              </div>
            )}
          </>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-6">
          <h2 className="text-lg font-black text-slate-900">Recent contracts</h2>
          <Link href="/customer/contracts" className="text-sm font-bold text-primary hover:underline">
            Open contracts
          </Link>
        </div>
        {recentContractsAll.length === 0 ? (
          <EmptyState icon="description" title="No contracts yet" message="Submit a rent request to create your first contract." />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableHeader>Contract</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Warehouse</TableHeader>
                <TableHeader>Updated</TableHeader>
              </TableHead>
              <TableBody>
                {recentContracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-bold text-slate-900">{c.code || c.id.slice(-8).toUpperCase()}</TableCell>
                    <TableCell>
                      <Badge variant={contractStatusVariant(c.status)}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-700">{c.warehouseName || c.warehouseId || '—'}</TableCell>
                    <TableCell className="text-sm text-slate-600">{new Date(c.updatedAt || c.createdAt).toLocaleString('en-GB')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {contractTotalPages > 1 && (
              <div className="px-6 pb-4 flex justify-end">
                <Pagination currentPage={contractPage} totalPages={contractTotalPages} onPageChange={setContractPage} />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
