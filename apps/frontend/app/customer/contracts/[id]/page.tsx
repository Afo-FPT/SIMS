
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getContractById } from '../../../../lib/customer-mock';
import { useToastHelpers } from '../../../../lib/toast';

const STORAGE_KEY = 'sws_confirmed_contract_ids';

function getConfirmedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

function setConfirmedIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function getContract(id: string) {
  const c = getContractById(id);
  if (!c) return null;
  const confirmed = getConfirmedIds().includes(c.id);
  if (c.status === 'Pending confirmation' && confirmed) {
    return { ...c, status: 'Active' as const };
  }
  return c;
}

export default function ContractDetailPage() {
  const params = useParams();
  const toast = useToastHelpers();
  const id = params.id as string;
  const [agreed, setAgreed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [contract, setContract] = useState<ReturnType<typeof getContract>>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const c = getContract(id);
    setContract(c);
    setConfirmed(getConfirmedIds().includes(id));
    setReady(true);
  }, [id]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (contract === null) {
    return (
      <div className="space-y-6">
        <p className="text-slate-600">Contract not found.</p>
        <Link href="/customer/contracts" className="text-primary font-bold hover:underline">
          ← Back to contracts
        </Link>
      </div>
    );
  }

  const handleConfirm = () => {
    if (!agreed) {
      toast.warning('Please agree to the terms and conditions');
      return;
    }
    const ids = getConfirmedIds();
    if (!ids.includes(id)) setConfirmedIds([...ids, id]);
    setConfirmed(true);
    setContract((c) => (c ? { ...c, status: 'Active' as const } : c));
    toast.success(`Contract ${contract?.code} confirmed successfully!`);
  };

  const isPending = contract.status === 'Pending confirmation';
  const isActive = contract.status === 'Active' || confirmed;

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
            className={`inline-flex px-3 py-1.5 rounded-xl text-sm font-bold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
          >
            {isActive ? 'Active' : contract.status}
          </span>
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between md:block">
            <dt className="text-slate-500">Shelves rented</dt>
            <dd className="font-bold text-slate-900">{contract.shelvesRented}</dd>
          </div>
          <div className="flex justify-between md:block">
            <dt className="text-slate-500">Start date</dt>
            <dd className="font-bold text-slate-900">{contract.startDate}</dd>
          </div>
          <div className="flex justify-between md:block">
            <dt className="text-slate-500">End date</dt>
            <dd className="font-bold text-slate-900">{contract.endDate}</dd>
          </div>
          <div className="flex justify-between md:block">
            <dt className="text-slate-500">Counting unit</dt>
            <dd className="font-bold text-slate-900">{contract.countingUnit}</dd>
          </div>
        </dl>

        {/* Confirm contract */}
        {isPending && !confirmed && (
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Confirm contract</h3>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">
                I agree to the terms and conditions of this shelf rental contract.
              </span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!agreed}
                className="px-6 py-3 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm / Sign
              </button>
            </div>
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
