'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCustomerContractById } from '../../../../../lib/mockApi/customer.api';
import type { Contract } from '../../../../../lib/customer-types';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { dateStyle: 'medium' });
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

function getZonesDisplay(contract: Contract): string {
  const count = contract.rentedZones?.length ?? 0;
  if (count > 0) {
    const names = contract.rentedZones
      .map((rz) => rz.zoneCode || rz.zoneName || rz.zoneId)
      .filter(Boolean);
    return names.length ? names.join(', ') : `${count} zone${count !== 1 ? 's' : ''}`;
  }
  return '—';
}

function getTotalAmount(contract: Contract): number {
  if (!contract.rentedZones?.length) return 0;
  return contract.rentedZones.reduce((sum, rz) => sum + (rz.price ?? 0), 0);
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCustomerContractById(id);
        if (cancelled) return;
        if (!data) {
          setError('Contract not found');
          return;
        }
        if (data.status !== 'pending_payment') {
          router.replace(`/customer/contracts/${id}`);
          return;
        }
        setContract(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load contract');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, router]);

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

      <h1 className="text-2xl font-black text-slate-900">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contract detail */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
            Contract detail
          </h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Contract code</dt>
              <dd className="font-bold text-slate-900">{contract.code}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Rental period</dt>
              <dd className="font-bold text-slate-900">{getDateRangeDisplay(contract)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Zones</dt>
              <dd className="font-bold text-slate-900">{getZonesDisplay(contract)}</dd>
            </div>
            {contract.rentedZones?.length ? (
              <div>
                <dt className="text-slate-500 mb-2">Zone breakdown</dt>
                <dd>
                  <ul className="space-y-2">
                    {contract.rentedZones.map((rz, i) => (
                      <li key={rz.zoneId || i} className="flex justify-between text-slate-700">
                        <span>{rz.zoneCode || rz.zoneName || rz.zoneId || `Zone ${i + 1}`}</span>
                        <span className="font-bold">
                          {typeof rz.price === 'number' ? rz.price.toLocaleString() : rz.price ?? '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
            <div className="pt-4 border-t border-slate-200">
              <dt className="text-slate-500">Total amount</dt>
              <dd className="text-xl font-black text-slate-900">
                {total > 0 ? total.toLocaleString() : '—'}
              </dd>
            </div>
          </dl>
        </section>

        {/* QR payment placeholder */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
            Payment
          </h2>
          <div className="flex flex-col items-center justify-center min-h-[280px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">qr_code_2</span>
            <p className="text-slate-500 font-medium text-center px-4">
              QR payment will be displayed here
            </p>
            <p className="text-slate-400 text-sm mt-1">Coming soon</p>
          </div>
        </section>
      </div>
    </div>
  );
}
