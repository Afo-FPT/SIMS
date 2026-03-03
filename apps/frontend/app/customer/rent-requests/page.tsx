'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useToastHelpers } from '../../../lib/toast';
import {
  listWarehousesForRent,
  createDraftContractRequest,
  listContractPackages,
  type WarehouseOption,
  type CreateDraftContractPayload,
  type ContractPackageOption,
  listZonesByWarehouse,
  type ZoneOption,
} from '../../../lib/rent-requests.api';

const today = new Date().toISOString().slice(0, 10);
/** Start date must be at least 1 day from today. */
const minStartDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function addDuration(start: string, pkg: ContractPackageOption | null): string {
  if (!pkg) return start;
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return start;
  if (pkg.unit === 'day') {
    d.setDate(d.getDate() + pkg.duration);
  } else if (pkg.unit === 'month') {
    d.setMonth(d.getMonth() + pkg.duration);
  } else {
    d.setFullYear(d.getFullYear() + pkg.duration);
  }
  return d.toISOString().slice(0, 10);
}

function defaultEndDate(start: string, fallbackMonths = 6): string {
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return start;
  d.setMonth(d.getMonth() + fallbackMonths);
  return d.toISOString().slice(0, 10);
}

export default function RentRequestsPage() {
  const toast = useToastHelpers();
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [startDate, setStartDate] = useState(minStartDate);
  const [endDate, setEndDate] = useState(() => defaultEndDate(minStartDate));
  const [durationMode, setDurationMode] = useState<'package' | 'custom'>('package');
  const [packages, setPackages] = useState<ContractPackageOption[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdContractCode, setCreatedContractCode] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [zonesError, setZonesError] = useState<string | null>(null);
  // Support selecting multiple zones in the warehouse
  const [selectedZoneIds, setSelectedZoneIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    let cancelled = false;
    const loadPackages = async () => {
      try {
        setLoadingPackages(true);
        setPackagesError(null);
        const list = await listContractPackages();
        if (cancelled) return;
        setPackages(list);
        if (list.length > 0) {
          setSelectedPackageId(list[0].id);
        } else {
          setDurationMode('custom');
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load rental packages';
        setPackagesError(msg);
        toast.error(msg);
        setDurationMode('custom');
      } finally {
        if (!cancelled) setLoadingPackages(false);
      }
    };
    loadPackages();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) ?? null,
    [packages, selectedPackageId]
  );

  useEffect(() => {
    if (durationMode !== 'package' || !selectedPackage) return;
    setEndDate(addDuration(startDate, selectedPackage));
  }, [durationMode, selectedPackage, startDate]);

  // Load zones when warehouse changes
  useEffect(() => {
    if (!warehouseId) {
      setZones([]);
      setSelectedZoneIds(new Set());
      return;
    }
    let cancelled = false;
    const loadZones = async () => {
      try {
        setLoadingZones(true);
        setZonesError(null);
        const list = await listZonesByWarehouse(warehouseId);
        if (cancelled) return;
        setZones(list);
        // Reset selected zones when warehouse changes
        setSelectedZoneIds(new Set());
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load zones';
        setZonesError(msg);
        toast.error(msg);
        setZones([]);
        setSelectedZoneIds(new Set());
      } finally {
        if (!cancelled) setLoadingZones(false);
      }
    };
    loadZones();
    return () => {
      cancelled = true;
    };
  }, [warehouseId]);

  const rentalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    if (Number.isNaN(diffMs) || diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [startDate, endDate]);

  const zoneCount = useMemo(
    () => zones.filter((z) => z.status === 'ACTIVE' && selectedZoneIds.has(z.id)).length,
    [zones, selectedZoneIds],
  );

  const estimatedContractPrice = useMemo(() => {
    if (!rentalDays || !zoneCount) return 0;
    // If using a package, treat package price as price per zone for the whole period
    if (selectedPackage) {
      const perZone = typeof selectedPackage.price === 'number' ? selectedPackage.price : 0;
      return perZone * zoneCount;
    }
    // Custom duration: simple model = baseDailyPrice * days * number of zones
    const baseDailyPricePerZone = 100000; // VND per zone per day (fallback)
    return baseDailyPricePerZone * rentalDays * zoneCount;
  }, [rentalDays, zoneCount, selectedPackage]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!warehouseId) e.warehouseId = 'Please select a warehouse';
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    if (isNaN(start.getTime())) e.startDate = 'Invalid start date';
    if (start < new Date(minStartDate)) e.startDate = 'Start date must be at least 1 day from today';
    if (end) {
      if (isNaN(end.getTime())) e.endDate = 'Invalid end date';
      else if (end <= start) e.endDate = 'End date must be after start date';
    } else {
      e.endDate = 'End date is required';
    }
    if (selectedZoneIds.size === 0) {
      e.zoneId = 'Please select at least one zone';
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
      // Send all selected zones so backend can save as rented_zones
      zoneIds: Array.from(selectedZoneIds),
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
          Choose a warehouse, an available zone, and a rental period. Use manager-defined packages or a custom duration.
          A draft contract will be created; the manager will approve it and activate the contract.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8"
      >
        <h2 className="text-xl font-black text-slate-900">Create draft contract request</h2>

        <div className="space-y-6">
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
              aria-label="Select warehouse"
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

          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-2">
              Zones in selected warehouse
            </h3>
            {loadingZones ? (
              <p className="text-xs text-slate-500">Loading zones…</p>
            ) : zones.length === 0 ? (
              <p className="text-xs text-amber-600">
                No zones available for this warehouse. {zonesError || 'Please contact manager.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {zones.map((z) => {
                  const disabled = z.status !== 'ACTIVE';
                  const checked = selectedZoneIds.has(z.id);
                  return (
                    <button
                      key={z.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return;
                        setSelectedZoneIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(z.id)) {
                            next.delete(z.id);
                          } else {
                            next.add(z.id);
                          }
                          return next;
                        });
                      }}
                      className={`text-left rounded-2xl border px-4 py-3 text-sm transition-colors ${
                        checked
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900">
                            {z.zoneCode} — {z.name}
                          </p>
                          {z.description && (
                            <p className="text-xs text-slate-500">
                              {z.description}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            Status:{' '}
                            <span className="font-semibold">
                              {z.status === 'ACTIVE' ? 'Active' : z.status || 'Unknown'}
                            </span>
                          </p>
                        </div>
                        {!disabled && (
                          <span className="inline-flex items-center justify-center size-5 rounded-full border border-primary text-primary text-xs font-bold">
                            {checked ? '✓' : ''}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {errors.zoneId && <p className="text-xs text-red-500 mt-1">{errors.zoneId}</p>}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase">Rental period</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <input
                  type="radio"
                  checked={durationMode === 'package'}
                  onChange={() => setDurationMode('package')}
                  disabled={packages.length === 0}
                />
                <span>Use package</span>
                {loadingPackages && (
                  <span className="text-xs text-slate-400">(Loading packages…)</span>
                )}
                {!loadingPackages && packages.length === 0 && (
                  <span className="text-xs text-slate-400">(No packages defined)</span>
                )}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <input
                  type="radio"
                  checked={durationMode === 'custom'}
                  onChange={() => setDurationMode('custom')}
                />
                <span>Custom</span>
              </label>
            </div>

            {durationMode === 'package' && packages.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`px-4 py-2.5 rounded-2xl border text-sm font-bold transition-colors ${
                        selectedPackageId === pkg.id
                          ? 'bg-primary text-white border-primary'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pkg.duration} {pkg.unit}
                      {pkg.duration > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
                {selectedPackage && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Price</p>
                    <p className="text-lg font-bold text-slate-900">
                      {typeof selectedPackage.price === 'number'
                        ? selectedPackage.price.toLocaleString()
                        : selectedPackage.price ?? '—'}
                    </p>
                  </div>
                )}
              </>
            )}

            {packagesError && (
              <p className="text-xs text-red-500">{packagesError}</p>
            )}

            <p className="text-xs text-slate-500 mb-2">
              At least 1 day from today{durationMode === 'package' ? '. End date is set automatically from the package.' : ''}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rent-start-date" className="block text-sm font-bold text-slate-700 mb-2">
                  Start date <span className="text-red-500">*</span>
                </label>
                <input
                  id="rent-start-date"
                  type="date"
                  min={minStartDate}
                  value={startDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setStartDate(v);
                    if (durationMode === 'custom' && endDate && new Date(v) >= new Date(endDate)) {
                      setEndDate(defaultEndDate(v));
                    }
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
                  disabled={durationMode === 'package'}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:bg-slate-50 disabled:text-slate-400"
                />
                {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-slate-600">
          <p>
            The system will validate the selected zones when the manager approves the draft (no overlap with other
            active contracts). You choose the warehouse, one or more zones, and the rental period; the manager
            will confirm and activate the contract.
          </p>
          <p className="font-bold text-slate-900">
            Selected zones: <span className="text-primary">{zoneCount}</span>
            {rentalDays > 0 && (
              <>
                {' '}| Rental days: <span className="text-primary">{rentalDays}</span>
              </>
            )}
            {estimatedContractPrice > 0 && (
              <>
                {' '}| Estimated contract price:{' '}
                <span className="text-primary">
                  {estimatedContractPrice.toLocaleString('vi-VN')} đ
                </span>
              </>
            )}
          </p>
        </div>

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
            aria-label="Create draft contract"
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
