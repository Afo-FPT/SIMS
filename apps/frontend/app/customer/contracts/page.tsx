
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCustomerContracts } from '../../../lib/mockApi/customer.api';
import type { Contract } from '../../../lib/customer-types';

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

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCustomerContracts();
      setContracts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

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
                {contracts.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-900">{c.code}</td>
                    <td className="px-6 py-4 text-slate-700">{getZonesRentedDisplay(c)}</td>
                    <td className="px-6 py-4 text-slate-700">
                      {c.warehouseName || c.warehouseAddress ? (
                        <>
                          <span className="font-semibold">{c.warehouseName || '—'}</span>
                          {c.warehouseAddress && (
                            <span className="text-slate-500 text-xs"> — {c.warehouseAddress}</span>
                          )}
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
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
