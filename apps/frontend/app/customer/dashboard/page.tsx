
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
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function CustomerDashboard() {
  const toast = useToastHelpers();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [storedItems, setStoredItems] = useState<StoredItemOption[]>([]);
  const [storageRequests, setStorageRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load dashboard data';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Dashboard</h1>
          <p className="text-slate-500 mt-1">My inventory, service requests, contracts, and warehouse notifications</p>
        </div>
        <LoadingSkeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Dashboard</h1>
          <p className="text-slate-500 mt-1">My inventory, service requests, contracts, and warehouse notifications</p>
        </div>
        <ErrorState title="Failed to load dashboard" message={error} onRetry={loadData} />
      </div>
    );
  }

  const activeContracts = contracts.filter((c) => c.status === 'active');

  const uniqueSkuNames = new Set(storedItems.map((i) => i.item_name));
  const totalSKUs = uniqueSkuNames.size;
  const totalQty = storedItems.reduce((s, i) => s + i.quantity, 0);
  const lowStockCount = storedItems.filter((i) => i.quantity < 50).length;
  const requestInProgress = storageRequests.filter((r) => r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'DONE_BY_STAFF').length;
  const requestCompleted = storageRequests.filter((r) => r.status === 'COMPLETED').length;
  const pendingConfirmations = cycleCounts.filter((c) => c.status === 'STAFF_SUBMITTED').length;

  const recentContracts = [...contracts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Dashboard</h1>
        <p className="text-slate-500 mt-1">My inventory, service requests, contracts, and warehouse notifications</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">inventory_2</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Inventory quantity
            </h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{totalQty}</p>
          <p className="text-xs text-slate-500 mt-1">Across all active contracts</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <span className="material-symbols-outlined text-2xl">inventory_2</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Total SKUs
            </h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{totalSKUs}</p>
          <p className="text-xs text-slate-500 mt-1">{lowStockCount} low-stock alerts</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-2xl">numbers</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Active contracts
            </h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{activeContracts.length}</p>
          <p className="text-xs text-slate-500 mt-1">Signed and currently running</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined text-2xl">pending_actions</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Request status
            </h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{requestInProgress}</p>
          <p className="text-xs text-slate-500 mt-1">{requestCompleted} completed · {pendingConfirmations} waiting confirmation</p>
        </div>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">Contract status</h2>
        {contracts.length === 0 ? (
          <EmptyState
            icon="description"
            title="No contracts yet"
            message="You don't have any active contracts. Submit a rent request to start."
          />
        ) : (
          <div className="flex flex-wrap gap-4">
            {recentContracts.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100"
              >
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                    c.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : c.status === 'draft'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {c.status}
                </span>
                <span className="text-sm font-bold text-slate-900">{c.code}</span>
                <span className="text-xs text-slate-500">
                  {c.rentedZones?.[0]?.startDate} → {c.rentedZones?.[0]?.endDate}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900">Recent inbound/outbound activity</h2>
          <div className="flex gap-4">
            <Link
              href="/customer/service-requests"
              className="text-sm font-bold text-primary hover:text-primary-dark"
            >
              Service requests
            </Link>
            <Link
              href="/customer/inventory-checking"
              className="text-sm font-bold text-primary hover:text-primary-dark"
            >
              Inventory checking
            </Link>
          </div>
        </div>
        {storageRequests.length === 0 && cycleCounts.length === 0 ? (
          <EmptyState
            icon="history"
            title="No recent activity"
            message="Your storage requests and cycle-count updates will appear here."
          />
        ) : (
          <ul className="space-y-0">
            {storageRequests.slice(0, 4).map((r) => (
              <li
                key={r.request_id}
                className="flex gap-4 py-3 border-b border-slate-100 last:border-0"
              >
                <div className="flex flex-col items-center">
                  <div className="size-8 rounded-full flex items-center justify-center bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-lg">{r.request_type === 'IN' ? 'inbox' : 'outbox'}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <p className="text-sm font-bold text-slate-900">
                    {r.request_type === 'IN' ? 'Inbound' : 'Outbound'} · {r.reference || r.request_id.slice(-8)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Status: {r.status} · Updated at {new Date(r.updated_at || r.created_at).toLocaleString('en-GB')}
                  </p>
                </div>
              </li>
            ))}
            {cycleCounts.slice(0, 2).map((c) => (
              <li
                key={c.cycle_count_id}
                className="flex gap-4 py-3 border-b border-slate-100 last:border-0"
              >
                <div className="flex flex-col items-center">
                  <div className="size-8 rounded-full flex items-center justify-center bg-amber-500/10 text-amber-600">
                    <span className="material-symbols-outlined text-lg">fact_check</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <p className="text-sm font-bold text-slate-900">
                    Cycle count · {c.contract_code}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Status: {c.status} · Updated at {new Date(c.updated_at || c.created_at).toLocaleString('en-GB')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
