
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getCustomerContracts } from '../../../lib/customer.api';
import type { Contract } from '../../../lib/customer-types';
import { Pagination } from '../../../components/ui/Pagination';

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Get status display text
 */
function getStatusDisplay(status: Contract['status']): string {
  switch (status) {
    case 'active':
      return 'Rented';
    case 'draft':
      return 'Pending confirmation';
    case 'pending_payment':
      return 'Pending payment';
    case 'expired':
      return 'Expired';
    case 'terminated':
      return 'Terminated';
    default:
      return status;
  }
}

/**
 * Get status badge class
 */
function getStatusBadgeClass(status: Contract['status']): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700';
    case 'draft':
      return 'bg-amber-100 text-amber-700';
    case 'pending_payment':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

/**
 * Get zones rented display text (or placeholder when draft, zone assigned on approval)
 */
function getZonesRentedDisplay(contract: Contract): string {
  const count = contract.rentedZones?.length ?? 0;
  if (count > 0) {
    const names = contract.rentedZones.map(rz => rz.zoneCode || rz.zoneName || rz.zoneId).filter(Boolean);
    return names.length ? names.join(', ') : `${count} zone${count !== 1 ? 's' : ''}`;
  }
  if (contract.status === 'draft') {
    return 'Zone will be assigned on approval';
  }
  return '—';
}

/**
 * Get date range display (from rented zones or requested period)
 */
function getDateRangeDisplay(contract: Contract): string {
  if (contract.rentedZones?.length) {
    const startDates = contract.rentedZones.map(rz => new Date(rz.startDate).getTime());
    const endDates = contract.rentedZones.map(rz => new Date(rz.endDate).getTime());
    const earliestStart = new Date(Math.min(...startDates));
    const latestEnd = new Date(Math.max(...endDates));
    return `${formatDate(earliestStart.toISOString())} → ${formatDate(latestEnd.toISOString())}`;
  }
  if (contract.requestedStartDate && contract.requestedEndDate) {
    return `${formatDate(contract.requestedStartDate)} → ${formatDate(contract.requestedEndDate)}`;
  }
  return '—';
}

function getContractEndDate(contract: Contract): string | undefined {
  if (contract.rentedZones?.length) {
    const endDates = contract.rentedZones
      .map((rz) => rz.endDate)
      .filter((d): d is string => Boolean(d));
    if (endDates.length > 0) {
      return new Date(Math.max(...endDates.map((d) => new Date(d).getTime()))).toISOString();
    }
  }
  return contract.requestedEndDate;
}

export default function ContractsPage() {
  const PAGE_SIZE = 10;
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Contract['status']>('all');
  const [sortBy, setSortBy] = useState<'updated_desc' | 'updated_asc' | 'expiry_asc' | 'expiry_desc'>('updated_desc');

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCustomerContracts();
      setContracts(data);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const warehouseOptions = useMemo(() => {
    const map = new Map<string, string>();
    contracts.forEach((c) => {
      const key = c.warehouseId || c.warehouseName;
      if (!key) return;
      map.set(key, c.warehouseName || c.warehouseId || key);
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    let list = [...contracts];
    const q = search.trim().toLowerCase();

    if (q) {
      list = list.filter((c) => {
        const zones = (c.rentedZones ?? []).map((z) => z.zoneCode || z.zoneName || z.zoneId).join(' ');
        const haystack = [
          c.code,
          c.warehouseName,
          c.warehouseAddress,
          c.status,
          zones,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (warehouseFilter !== 'all') {
      list = list.filter((c) => (c.warehouseId || c.warehouseName) === warehouseFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter);
    }

    list.sort((a, b) => {
      if (sortBy === 'updated_desc') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'updated_asc') {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      const aEnd = getContractEndDate(a);
      const bEnd = getContractEndDate(b);
      const aTs = aEnd ? new Date(aEnd).getTime() : Number.POSITIVE_INFINITY;
      const bTs = bEnd ? new Date(bEnd).getTime() : Number.POSITIVE_INFINITY;
      if (sortBy === 'expiry_asc') return aTs - bTs;
      return bTs - aTs;
    });

    return list;
  }, [contracts, search, warehouseFilter, statusFilter, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [search, warehouseFilter, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filteredContracts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Contracts</h1>
        <p className="text-slate-500 mt-1">
          Zone rental contracts — zones are assigned when the manager approves.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-600">Failed to load contracts: {error}</p>
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-slate-500">No contracts yet</p>
        </div>
      ) : (
        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 items-end">
              <div className="space-y-1 xl:col-span-2">
                <p className="text-xs font-bold text-slate-500">Search</p>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    search
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search contract code, zone, warehouse..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500">Warehouse</p>
                <select
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">All warehouses</option>
                  {warehouseOptions.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500">Status</p>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Rented</option>
                  <option value="draft">Pending confirmation</option>
                  <option value="pending_payment">Pending payment</option>
                  <option value="expired">Expired</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500">Sort</p>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="updated_desc">Newest updated</option>
                  <option value="updated_asc">Oldest updated</option>
                  <option value="expiry_asc">Expiry date: nearest first</option>
                  <option value="expiry_desc">Expiry date: farthest first</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                    Contract code
                  </th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                    Zones
                  </th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                    Warehouse
                  </th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                    Start / End
                  </th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-900">{c.code}</td>
                    <td className="px-6 py-4 text-slate-700">{getZonesRentedDisplay(c)}</td>
                    <td className="px-6 py-4 text-slate-700">
                      {c.warehouseName || c.warehouseAddress ? (
                        <>
                          <span className="font-semibold">{c.warehouseName || '—'}</span>
                        </>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {getDateRangeDisplay(c)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusBadgeClass(c.status)}`}
                      >
                        {getStatusDisplay(c.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {c.status === 'pending_payment' ? (
                        <Link
                          href={`/customer/contracts/${c.id}/checkout`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">payments</span>
                          Pay
                        </Link>
                      ) : (
                        <Link
                          href={`/customer/contracts/${c.id}`}
                          className="text-sm font-bold text-primary hover:underline"
                        >
                          View detail
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      No contracts match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && !error && contracts.length > 0 && filteredContracts.length > 0 && (
        <div className="flex items-center justify-center flex-wrap gap-3 pb-4">
          <p className="text-sm text-slate-500 whitespace-nowrap">
            Showing{' '}
            <span className="font-bold text-slate-700">
              {Math.min((safePage - 1) * PAGE_SIZE + 1, filteredContracts.length)}
            </span>
            {' '}to{' '}
            <span className="font-bold text-slate-700">
              {Math.min(safePage * PAGE_SIZE, filteredContracts.length)}
            </span>
            {' '}of{' '}
            <span className="font-bold text-slate-700">{filteredContracts.length}</span>
          </p>
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
