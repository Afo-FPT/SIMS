
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getCustomerContractById } from '../../../../lib/mockApi/customer.api';
import { useToastHelpers } from '../../../../lib/toast';
import type { Contract } from '../../../../lib/customer-types';

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN');
}

/**
 * Get status display text
 */
function getStatusDisplay(status: Contract['status']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'draft':
      return 'Pending confirmation';
    case 'expired':
      return 'Expired';
    case 'terminated':
      return 'Terminated';
    default:
      return status;
  }
}

/**
 * Get zones rented display text (or placeholder when draft)
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

export default function ContractDetailPage() {
  const params = useParams();
  const toast = useToastHelpers();
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

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/customer/contracts"
          className="text-slate-500 hover:text-primary font-bold flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{contract.code}</h1>
            <p className="text-slate-500 mt-1">Contract detail</p>
          </div>
          <span
            className={`inline-flex px-3 py-1.6 rounded-xl text-sm font-bold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
          >
            {getStatusDisplay(contract.status)}
          </span>
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between md:block">
            <dt className="text-slate-500">Zones</dt>
            <dd className="font-bold text-slate-900">{getZonesRentedDisplay(contract)}</dd>
          </div>
          <div className="flex justify-between md:block">
            <dt className="text-slate-500">Start date</dt>
            <dd className="font-bold text-slate-900">{getDateRangeDisplay(contract)}</dd>
          </div>
          <div className="flex justify-between md:block">
            <dt className="text-slate-500">End date</dt>
            <dd className="font-bold text-slate-900">{getDateRangeDisplay(contract)}</dd>
          </div>
        </dl>

        {isDraft && (
          <div className="pt-6 border-t border-slate-100">
            <p className="text-sm text-amber-700 font-bold mb-3">
              This contract is pending manager approval. A zone will be assigned automatically when the manager approves it.
            </p>
          </div>
        )}

        {isActive && (
          <div className="pt-6 border-t border-slate-100">
            <p className="text-sm text-emerald-700 font-bold">
              Contract is active. You can now create service requests (Inbound / Outbound / Checking).
            </p>
            <Link
              href="/customer/service-requests"
              className="inline-flex items-center gap-2 mt-3 text-primary font-bold hover:underline"
            >
              Go to Service Requests
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
