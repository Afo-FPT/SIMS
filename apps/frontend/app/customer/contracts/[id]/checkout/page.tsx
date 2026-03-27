'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getCustomerContractById } from '../../../../../lib/customer.api';
import type { Contract } from '../../../../../lib/customer-types';
import { startContractVNPayPayment } from '../../../../../lib/payment.api';
import { useToastHelpers } from '../../../../../lib/toast';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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
  const searchParams = useSearchParams();
  const id = params.id as string;
  const toast = useToastHelpers();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingPayment, setStartingPayment] = useState(false);
  const [expireAt, setExpireAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);

  // Load contract only when we are not handling a VNPay return result
  useEffect(() => {
    const hasResult = searchParams.get('result');
    if (hasResult) {
      // We will redirect based on result, no need to load contract here
      return;
    }
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
  }, [id, router, searchParams]);

  useEffect(() => {
    const result = searchParams.get('result');
    const message = searchParams.get('message');
    if (!result) return;
    if (typeof window !== 'undefined') {
      // Global guard to avoid duplicate handling in React StrictMode/dev
      (window as any).__swsPaymentHandled = (window as any).__swsPaymentHandled || {};
      const key = `contract_payment_${id}_${result}`;
      if ((window as any).__swsPaymentHandled[key]) {
        return;
      }
      (window as any).__swsPaymentHandled[key] = true;
    }
    if (result === 'success') {
      toast.success(message || 'Payment completed successfully.');
      router.replace(`/customer/contracts/${id}`);
    } else if (result === 'failed') {
      toast.error(message || 'Payment failed. Please try again or contact support.');
    }
  }, [searchParams, toast, router, id]);

  useEffect(() => {
    if (!expireAt) {
      setCountdown(null);
      return;
    }
    const parseVnpDate = (v: string) => {
      const year = Number(v.slice(0, 4));
      const month = Number(v.slice(4, 6)) - 1;
      const day = Number(v.slice(6, 8));
      const hour = Number(v.slice(8, 10));
      const min = Number(v.slice(10, 12));
      const sec = Number(v.slice(12, 14));
      return new Date(year, month, day, hour, min, sec);
    };
    const expireDate = parseVnpDate(expireAt);

    const updateCountdown = () => {
      const now = new Date();
      const diff = expireDate.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown('Expired');
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setCountdown(`${minutes} min ${seconds.toString().padStart(2, '0')} s`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [expireAt]);

  const handleStartPayment = async () => {
    if (!id) return;
    try {
      setStartingPayment(true);
      const result = await startContractVNPayPayment(id);
      setExpireAt(result.expireAt);
      if (typeof window !== 'undefined') {
        window.location.href = result.paymentUrl;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not initialize VNPay payment.';
      toast.error(message);
    } finally {
      setStartingPayment(false);
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

          <h1 className="text-2xl font-black text-slate-900">Contract payment</h1>

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

        {/* VNPay payment */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
            Payment
          </h2>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              You will be redirected to the <span className="font-bold">VNPay</span> payment gateway to pay for this
              contract. Once the payment is successful, the contract will be activated automatically.
            </p>
            {countdown && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-base">schedule</span>
                <span>Payment session time left: <span className="font-bold">{countdown}</span></span>
              </div>
            )}
            <button
              type="button"
              onClick={handleStartPayment}
              disabled={startingPayment}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-lg">payments</span>
              {startingPayment ? 'Creating payment session...' : 'Pay with VNPay'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
