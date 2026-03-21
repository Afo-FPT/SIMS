'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getCustomerContractById } from '../../../../lib/mockApi/customer.api';
import type { Contract } from '../../../../lib/customer-types';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

function getStatusBadgeClass(status: Contract['status']): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700';
    case 'draft':
      return 'bg-amber-100 text-amber-700';
    case 'pending_payment':
      return 'bg-amber-100 text-amber-700';
    case 'expired':
    case 'terminated':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function getDateRangeDisplay(contract: Contract): string {
  if (contract.rentedZones?.length) {
    const startDates = contract.rentedZones.map((rz) => new Date(rz.startDate).getTime());
    const endDates = contract.rentedZones.map((rz) => new Date(rz.endDate).getTime());
    const earliestStart = new Date(Math.min(...startDates));
    const latestEnd = new Date(Math.max(...endDates));
    return `${formatDate(earliestStart.toISOString())} → ${formatDate(latestEnd.toISOString())}`;
  }
  if (contract.requestedStartDate && contract.requestedEndDate) {
    return `${formatDate(contract.requestedStartDate)} → ${formatDate(contract.requestedEndDate)}`;
  }
  return '—';
}

function getTotalAmount(contract: Contract): number {
  if (!contract.rentedZones?.length) return 0;
  return contract.rentedZones.reduce((sum, rz) => sum + (rz.price ?? 0), 0);
}

export default function ContractDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContract();
  }, [id]);

  const loadContract = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCustomerContractById(id);
      if (data) {
        setContract(data);
      } else {
        setError('Contract not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contract');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="space-y-6">
        <p className="text-slate-600">{error || 'Contract not found.'}</p>
        <Link href="/customer/contracts" className="text-primary font-bold hover:underline">
          ← Back to contracts
        </Link>
      </div>
    );
  }

  const isDraft = contract.status === 'draft';
  const isActive = contract.status === 'active';
  const isPendingPayment = contract.status === 'pending_payment';
  const total = getTotalAmount(contract);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/customer/contracts"
          className="text-slate-500 hover:text-primary font-bold flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to contracts
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{contract.code}</h1>
            <p className="text-slate-500 mt-1">Contract details</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-slate-400">
              {contract.createdAt && (
                <span>Created {formatDateTime(contract.createdAt)}</span>
              )}
              {contract.updatedAt && contract.updatedAt !== contract.createdAt && (
                <span>Updated {formatDateTime(contract.updatedAt)}</span>
              )}
            </div>
          </div>
          <span
            className={`inline-flex px-3 py-1.6 rounded-xl text-sm font-bold ${getStatusBadgeClass(contract.status)}`}
          >
            {getStatusDisplay(contract.status)}
          </span>
        </div>

        {/* General information */}
        <section>
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">
            General information
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {contract.customerName && (
              <div>
                <dt className="text-slate-500">Customer</dt>
                <dd className="font-bold text-slate-900">{contract.customerName}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500">Warehouse</dt>
              <dd className="font-bold text-slate-900">
                {contract.warehouseName || contract.warehouseId || '—'}
              </dd>
            </div>
          </dl>
        </section>

        {/* Rental period */}
        <section>
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">
            Rental period
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Period</dt>
              <dd className="font-bold text-slate-900">{getDateRangeDisplay(contract)}</dd>
            </div>
            {contract.requestedStartDate && !contract.rentedZones?.length && (
              <>
                <div>
                  <dt className="text-slate-500">Requested start</dt>
                  <dd className="font-bold text-slate-900">{formatDate(contract.requestedStartDate)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Requested end</dt>
                  <dd className="font-bold text-slate-900">
                    {contract.requestedEndDate ? formatDate(contract.requestedEndDate) : '—'}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </section>

        {/* Rented zones */}
        <section>
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">
            Rented zones
          </h2>
          {contract.rentedZones?.length ? (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 font-bold text-slate-600">Zone</th>
                      <th className="px-4 py-3 font-bold text-slate-600">Start date</th>
                      <th className="px-4 py-3 font-bold text-slate-600">End date</th>
                      <th className="px-4 py-3 font-bold text-slate-600 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contract.rentedZones.map((rz, i) => (
                      <tr key={rz.zoneId || i} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {rz.zoneCode || rz.zoneName || rz.zoneId || `Zone ${i + 1}`}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(rz.startDate)}</td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(rz.endDate)}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {typeof rz.price === 'number' ? rz.price.toLocaleString() : rz.price ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <p className="text-sm">
                  <span className="text-slate-500 font-bold">Total: </span>
                  <span className="text-lg font-black text-slate-900">
                    {total.toLocaleString()}
                  </span>
                </p>
              </div>
            </>
          ) : (
            <p className="text-slate-600">
              {isDraft
                ? 'Zone will be assigned when the manager approves this contract.'
                : 'No zones assigned yet.'}
            </p>
          )}
        </section>

        {/* Status-specific messages and actions */}
        {isDraft && (
          <div className="pt-6 border-t border-slate-100 rounded-2xl bg-amber-50 border border-amber-100 p-6">
            <p className="text-sm text-amber-800 font-bold">
              This contract is pending manager approval. A zone will be assigned automatically when the manager approves it.
            </p>
          </div>
        )}

        {isPendingPayment && (
          <div className="pt-6 border-t border-slate-100 rounded-2xl bg-amber-50 border border-amber-100 p-6">
            <p className="text-sm text-amber-800 font-bold mb-4">
              Payment is required to activate this contract.
            </p>
            <Link
              href={`/customer/contracts/${contract.id}/checkout`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors"
            >
              <span className="material-symbols-outlined text-lg">payments</span>
              Go to payment
            </Link>
          </div>
        )}

        {isActive && (
          <div className="pt-6 border-t border-slate-100 rounded-2xl bg-emerald-50 border border-emerald-100 p-6">
            <p className="text-sm text-emerald-800 font-bold mb-3">
              Contract is active. You can create service requests (Inbound, Outbound, Inventory Checking) from Service Requests.
            </p>
            <Link
              href="/customer/service-requests"
              className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
            >
              Go to Service Requests
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>
        )}

        {(contract.status === 'expired' || contract.status === 'terminated') && (
          <div className="pt-6 border-t border-slate-100 rounded-2xl bg-slate-50 border border-slate-200 p-6">
            <p className="text-sm text-slate-700 font-bold">
              This contract is {contract.status}. No further actions available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
