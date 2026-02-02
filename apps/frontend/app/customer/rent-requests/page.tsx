'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToastHelpers } from '../../../lib/toast';
import {
  listWarehousesForRent,
  createDraftContractRequest,
  type WarehouseOption,
  type CreateDraftContractPayload,
} from '../../../lib/rent-requests.api';

const today = new Date().toISOString().slice(0, 10);

function defaultEndDate(start: string): string {
  const d = new Date(start);
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 10);
}

export default function RentRequestsPage() {
  const toast = useToastHelpers();
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(() => defaultEndDate(today));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdContractCode, setCreatedContractCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingWarehouses(true);
        setWarehouseError(null);
        const list = await listWarehousesForRent();
        if (cancelled) return;
        setWarehouses(list);
        if (list.length > 0) {
          setWarehouseId(list[0].id);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load warehouses';
        setWarehouseError(msg);
        toast.error(msg);
      } finally {
        if (!cancelled) setLoadingWarehouses(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!warehouseId) e.warehouseId = 'Please select a warehouse';
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    if (isNaN(start.getTime())) e.startDate = 'Invalid start date';
    if (start < new Date(today)) e.startDate = 'Start date must be today or later';
    if (end) {
      if (isNaN(end.getTime())) e.endDate = 'Invalid end date';
      else if (end <= start) e.endDate = 'End date must be after start date';
    } else {
      e.endDate = 'End date is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) {
      toast.warning('Please fix the errors below');
      return;
    }
    const payload: CreateDraftContractPayload = {
      warehouseId,
      startDate,
      endDate: endDate!,
    };
    try {
      setLoading(true);
      setCreatedContractCode(null);
      const contract = await createDraftContractRequest(payload);
      setCreatedContractCode(contract.code);
      toast.success(`Draft contract ${contract.code} created. Manager will approve to assign a zone automatically.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create draft contract';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Request rental
        </h1>
        <p className="text-slate-500 mt-1">
          Choose a warehouse and period. A draft contract will be created; the manager will approve and a zone will be assigned automatically.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8"
      >
        <h2 className="text-xl font-black text-slate-900">Create draft contract request</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="rent-warehouse" className="block text-sm font-bold text-slate-700 mb-2">
              Warehouse <span className="text-red-500">*</span>
            </label>
            <select
              id="rent-warehouse"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              disabled={loadingWarehouses}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-60 cursor-pointer"
              aria-label="Chọn kho"
            >
              <option value="">— Select warehouse —</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — {w.address}
                </option>
              ))}
            </select>
            {loadingWarehouses && <p className="text-xs text-slate-500 mt-1">Loading warehouses…</p>}
            {!loadingWarehouses && warehouses.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No warehouses available. {warehouseError || 'Please contact admin.'}</p>
            )}
            {errors.warehouseId && <p className="text-xs text-red-500 mt-1">{errors.warehouseId}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rent-start-date" className="block text-sm font-bold text-slate-700 mb-2">
                Start date <span className="text-red-500">*</span>
              </label>
              <input
                id="rent-start-date"
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => {
                  const v = e.target.value;
                  setStartDate(v);
                  if (endDate && new Date(v) >= new Date(endDate)) setEndDate(defaultEndDate(v));
                }}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label htmlFor="rent-end-date" className="block text-sm font-bold text-slate-700 mb-2">
                End date <span className="text-red-500">*</span>
              </label>
              <input
                id="rent-end-date"
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-600">
          Zone will be assigned automatically when the manager approves the draft (no overlap with other contracts). You only choose warehouse and period.
        </p>

        {submitError && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 pt-8 mt-8 border-t border-slate-200">
          <button
            type="submit"
            disabled={loading || loadingWarehouses}
            className="px-6 py-3 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
            aria-label="Tạo hợp đồng draft"
          >
            {loading ? 'Creating…' : 'Create draft contract'}
          </button>
          {loadingWarehouses && (
            <span className="text-sm text-slate-500">Loading…</span>
          )}
        </div>
      </form>

      {createdContractCode && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
          <p className="text-emerald-800 font-bold mb-2">Draft contract {createdContractCode} has been created.</p>
          <p className="text-emerald-700 text-sm mb-4">The manager will approve it and a zone will be assigned automatically. You can view it in Contracts.</p>
          <Link href="/customer/contracts" className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
            View my contracts <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
        </div>
      )}

      <section className="bg-white rounded-3xl border border-slate-200 p-6">
        <h2 className="text-lg font-black text-slate-900 mb-2">Your contracts</h2>
        <p className="text-slate-600 text-sm mb-4">View draft and active contracts. Drafts are pending manager activation.</p>
        <Link href="/customer/contracts" className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
          Go to Contracts <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>
      </section>
    </div>
  );
}
