'use client';

import React, { useState, useMemo } from 'react';
import type { AdjustmentReason } from '../../../lib/customer-types';
import {
  MOCK_INVENTORY,
  getActiveContractsForCustomer,
} from '../../../lib/customer-mock';
import { useToastHelpers } from '../../../lib/toast';

const REASONS: { id: AdjustmentReason; label: string }[] = [
  { id: 'Count correction', label: 'Count correction' },
  { id: 'Damage', label: 'Damage' },
  { id: 'Lost', label: 'Lost' },
  { id: 'Other', label: 'Other' },
];

export default function InventoryCheckingPage() {
  const toast = useToastHelpers();
  const activeContracts = useMemo(() => getActiveContractsForCustomer(), []);
  const hasActive = activeContracts.length > 0;
  const [contractId, setContractId] = useState(activeContracts[0]?.id ?? '');
  const [sku, setSku] = useState(MOCK_INVENTORY[0]?.sku ?? '');
  const [requestedQty, setRequestedQty] = useState(0);
  const [reason, setReason] = useState<AdjustmentReason>('Count correction');
  const [evidenceMock, setEvidenceMock] = useState(false);
  const [fullCheckAgreed, setFullCheckAgreed] = useState(false);
  const [preferredDate, setPreferredDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const selectedItem = useMemo(
    () => MOCK_INVENTORY.find((i) => i.sku === sku),
    [sku]
  );
  const currentQty = selectedItem?.quantity ?? 0;

  if (!hasActive) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-slate-900">Inventory Checking</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center">
          <p className="text-lg font-bold text-amber-800">Need active contract</p>
          <p className="text-sm text-amber-700 mt-2">
            Confirm an active contract first to request inventory adjustments.
          </p>
          <a
            href="/customer/contracts"
            className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600"
          >
            Go to Contracts
            <span className="material-symbols-outlined">arrow_forward</span>
          </a>
        </div>
      </div>
    );
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!contractId) e.contract = 'Select a contract';
    if (!sku) e.sku = 'Select SKU';
    if (requestedQty < 0) e.requestedQty = 'New qty must be >= 0';
    if (!fullCheckAgreed) e.fullCheck = 'Adjustment requires FULL inventory checking';
    if (!preferredDate) e.preferredDate = 'Preferred checking date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.warning('Please fix validation errors before submitting');
      return;
    }
    setSubmitted(true);
    toast.success('Adjustment request submitted. Full inventory checking is required before processing.');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Inventory Checking / Adjustment
        </h1>
        <p className="text-slate-500 mt-1">
          Request inventory adjustment — full check required
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6"
      >
        <h2 className="text-xl font-black text-slate-900">Request Inventory Adjustment</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Contract
            </label>
            <select
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              {activeContracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
              {activeContracts.length === 0 && (
                <option value="">No active contract</option>
              )}
            </select>
            {errors.contract && (
              <p className="text-xs text-red-500 mt-1">{errors.contract}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">SKU</label>
            <select
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              {MOCK_INVENTORY.map((i) => (
                <option key={i.sku} value={i.sku}>
                  {i.sku} — {i.name}
                </option>
              ))}
            </select>
            {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Current qty
            </label>
            <input
              type="text"
              readOnly
              value={currentQty}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Requested new qty
            </label>
            <input
              type="number"
              min={0}
              value={requestedQty}
              onChange={(e) => setRequestedQty(Number(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            {errors.requestedQty && (
              <p className="text-xs text-red-500 mt-1">{errors.requestedQty}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as AdjustmentReason)}
            className="w-full md:max-w-xs px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            {REASONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Evidence upload (mock)
          </label>
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
            <span className="material-symbols-outlined text-slate-400">upload_file</span>
            <span className="text-sm text-slate-500">
              {evidenceMock ? 'Evidence uploaded (mock)' : 'Click to upload evidence'}
            </span>
            <button
              type="button"
              onClick={() => setEvidenceMock(!evidenceMock)}
              className="ml-auto text-sm font-bold text-primary hover:underline"
            >
              {evidenceMock ? 'Remove' : 'Upload mock'}
            </button>
          </div>
        </div>

        {/* Rule: Full check required */}
        <div className="p-6 rounded-2xl border-2 border-amber-200 bg-amber-50/50 space-y-4">
          <h3 className="text-sm font-bold text-amber-800 uppercase tracking-widest">
            Rule — Full inventory check required
          </h3>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={fullCheckAgreed}
              onChange={(e) => setFullCheckAgreed(e.target.checked)}
              className="mt-1 rounded border-amber-400"
            />
            <span className="text-sm text-amber-900 font-medium">
              Adjustment requires FULL inventory checking. I agree to request a full inventory
              check before this adjustment is applied.
            </span>
          </label>
          {errors.fullCheck && (
            <p className="text-xs text-red-600 font-bold">{errors.fullCheck}</p>
          )}
          <div className="flex items-center gap-3 pt-2">
            <span className="text-sm text-amber-800 font-bold">Checking scope:</span>
            <span className="px-3 py-1 rounded-lg bg-amber-200/80 text-amber-900 font-bold">
              Full inventory (locked)
            </span>
          </div>
          <div className="pt-2">
            <label className="block text-sm font-bold text-amber-800 mb-2">
              Preferred checking date
            </label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="w-full md:max-w-xs px-4 py-3 rounded-2xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
            />
            {errors.preferredDate && (
              <p className="text-xs text-red-600 mt-1 font-bold">{errors.preferredDate}</p>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-3 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark"
          >
            Submit adjustment request
          </button>
        </div>
      </form>

      {submitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6">
          <p className="text-emerald-800 font-bold">
            Adjustment request submitted. Full inventory checking is required before processing.
          </p>
        </div>
      )}
    </div>
  );
}
