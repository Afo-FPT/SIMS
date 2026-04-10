'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToastHelpers } from '../../../../lib/toast';
import {
  getStorageRequestById,
  listContractShelves,
  staffCompleteStorageRequest,
  type StorageRequestView,
  type ContractShelfOption,
} from '../../../../lib/storage-requests.api';
import { getShelfUtilization, type ShelfUtilization } from '../../../../lib/shelves.api';
import { Button } from '../../../../components/ui/Button';
import { Select } from '../../../../components/ui/Select';
import { Input } from '../../../../components/ui/Input';
import { LoadingSkeleton } from '../../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../../components/ui/ErrorState';

function formatM3(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(3)} m³`;
}

function utilizationBadge(pct: number): { label: string; className: string } | null {
  if (pct >= 95) return { label: 'Nearly full', className: 'bg-red-100 text-red-800' };
  if (pct >= 85) return { label: 'Filling up', className: 'bg-amber-100 text-amber-900' };
  return null;
}

export default function StaffInboundPutawayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToastHelpers();
  const id = params.id as string;
  const from = searchParams.get('from');
  const backHref = from === 'inbound' ? '/staff/inbound-requests' : '/staff/tasks';

  const [req, setReq] = useState<StorageRequestView | null>(null);
  const [shelves, setShelves] = useState<ContractShelfOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [utilByShelfId, setUtilByShelfId] = useState<Record<string, ShelfUtilization>>({});

  // local editable rows
  const [rows, setRows] = useState<Array<{
    requestDetailId: string;
    shelfId: string;
    quantityActual: string;
    damageQuantity: string;
    lossReason: string;
    notes: string;
  }>>([]);

  const shelfOptions = useMemo(
    () => [
      { value: '', label: 'Select shelf' },
      ...shelves.map((s) => ({ value: s.shelf_id, label: `${s.shelf_code}${s.zone_code ? ` (${s.zone_code})` : ''}` })),
    ],
    [shelves]
  );

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStorageRequestById(id);
      setReq(data);
      const shelfList = await listContractShelves(data.contract_id);
      const filteredByRequestedZone = data.requested_zone_id
        ? shelfList.filter((s) => s.zone_id === data.requested_zone_id)
        : shelfList;
      setShelves(filteredByRequestedZone);
      setRows(
        data.items.map((it) => ({
          requestDetailId: it.request_detail_id,
          shelfId: it.shelf_id || '',
          quantityActual: it.quantity_actual?.toString() || '',
          damageQuantity: '',
          lossReason: '',
          notes: '',
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inbound request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (shelves.length === 0) {
        setUtilByShelfId({});
        return;
      }
      const entries = await Promise.all(
        shelves.map(async (s) => {
          try {
            const u = await getShelfUtilization(s.shelf_id);
            return [s.shelf_id, u] as const;
          } catch {
            return [s.shelf_id, null] as const;
          }
        })
      );
      if (cancelled) return;
      const m: Record<string, ShelfUtilization> = {};
      for (const [id, u] of entries) {
        if (u) m[id] = u;
      }
      setUtilByShelfId(m);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [shelves]);

  const shelfVolumeWarnings = useMemo(() => {
    if (!req) return [] as string[];
    const incomingByShelf = new Map<string, number>();
    rows.forEach((r, i) => {
      if (!r.shelfId) return;
      const v = req.items[i]?.volume_per_unit_m3 ?? 0;
      const q = Number(r.quantityActual) || 0;
      if (q <= 0 || v <= 0) return;
      incomingByShelf.set(r.shelfId, (incomingByShelf.get(r.shelfId) ?? 0) + q * v);
    });
    const out: string[] = [];
    for (const [sid, addVol] of incomingByShelf) {
      const u = utilByShelfId[sid];
      if (!u) continue;
      const remaining = Math.max(0, u.max_capacity - u.current_utilization);
      if (addVol > remaining + 1e-9) {
        out.push(
          `Shelf ${u.shelf_code}: adding ${formatM3(addVol)} but only ${formatM3(remaining)} remains (max ${formatM3(u.max_capacity)}, used ${formatM3(u.current_utilization)}).`
        );
      }
    }
    return out;
  }, [req, rows, utilByShelfId]);

  const updateRow = (idx: number, patch: Partial<{
    shelfId: string;
    quantityActual: string;
    damageQuantity: string;
    lossReason: string;
    notes: string;
  }>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const formatDate = (s: string) => {
    try {
    return new Date(s).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return s;
    }
  };

  const handleComplete = async () => {
    if (!req) return;
    // validate
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const item = req.items[i];
      if (!r.shelfId) {
        toast.warning('Please select a shelf for all items');
        return;
      }
      const actual = Number(r.quantityActual);
      if (isNaN(actual) || actual < 0) {
        toast.warning('Actual quantity must be a number >= 0 for all items');
        return;
      }
      const requested = item.quantity_requested;
      const shortage = requested - actual;
      const damage = Number(r.damageQuantity) || 0;
      if (shortage > 0) {
        if (damage !== shortage) {
          toast.warning(
            `"${item.item_name}": Short by ${shortage} ${item.unit}. Damaged quantity must equal ${shortage} ${item.unit}.`
          );
          return;
        }
      } else if (damage > 0 && damage > actual) {
        toast.warning(
          `"${item.item_name}": Damaged quantity cannot exceed actual quantity (${actual} ${item.unit}).`
        );
        return;
      }
    }
    if (shelfVolumeWarnings.length > 0) {
      toast.warning(shelfVolumeWarnings[0]);
      return;
    }
    try {
      setSaving(true);
      await staffCompleteStorageRequest({
        requestId: req.request_id,
        items: rows.map((r) => ({
          requestDetailId: r.requestDetailId,
          shelfId: r.shelfId,
          quantityActual: Number(r.quantityActual),
          damageQuantity: r.damageQuantity ? Number(r.damageQuantity) : undefined,
          lossReason: r.lossReason || undefined,
          lossNotes: r.notes || undefined,
        })),
      });
      toast.success('Putaway completed. Stored quantities updated.');
      router.push(backHref);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to complete putaway');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton className="h-64 w-full" />;
  if (error || !req) {
    return <ErrorState title="Failed to load" message={error || 'Not found'} onRetry={load} />;
  }

  const getDiscrepancy = (idx: number) => {
    const item = req.items[idx];
    const row = rows[idx];
    if (!row || !row.quantityActual) return null;
    const requested = item.quantity_requested;
    const actual = Number(row.quantityActual) || 0;
    return actual - requested;
  };

  return (
    <div className="space-y-6">
      <Link href={backHref} className="text-sm font-bold text-slate-500 hover:text-primary">
        ← Back
      </Link>

      {/* Request Info */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">Putaway {req.reference ?? req.request_id}</h1>
            <div className="space-y-1 text-sm">
              <p><span className="font-bold text-slate-600">Contract code:</span> {req.contract_code ?? req.contract_id}</p>
              <p><span className="font-bold text-slate-600">Requested zone:</span> {req.requested_zone_code ?? req.requested_zone_id ?? '—'}</p>
              <p><span className="font-bold text-slate-600">Customer:</span> {req.customer_name || req.customer_id}</p>
              <p><span className="font-bold text-slate-600">Created at:</span> {formatDate(req.created_at)}</p>
              <p><span className="font-bold text-slate-600">Status:</span> 
                <span className={`ml-2 px-2 py-0.5 rounded-lg text-xs font-bold ${
                  req.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                  req.status === 'DONE_BY_STAFF' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {req.status}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-start justify-end">
            <div className="bg-slate-50 rounded-xl p-4 text-sm">
              <p className="font-bold text-slate-700 mb-2">Total items</p>
              <p className="text-2xl font-black text-slate-900">{req.items.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Item details</h2>
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left font-bold text-slate-700">STT</th>
                <th className="px-4 py-3 text-left font-bold text-slate-700">Item</th>
                <th className="px-4 py-3 text-right font-bold text-slate-700">Requested</th>
                <th className="px-4 py-3 text-right font-bold text-slate-700">m³/unit</th>
                <th className="px-4 py-3 text-left font-bold text-slate-700">Shelf</th>
                <th className="px-4 py-3 text-right font-bold text-slate-700">Actual</th>
                <th className="px-4 py-3 text-right font-bold text-slate-700">Discrepancy</th>
              </tr>
            </thead>
            <tbody>
              {req.items.map((it, idx) => {
                const discrepancy = getDiscrepancy(idx);
                const row = rows[idx];
                const u = row?.shelfId ? utilByShelfId[row.shelfId] : undefined;
                const badge = u ? utilizationBadge(u.utilization_percentage) : null;
                const lineVol =
                  (Number(row?.quantityActual) || 0) * (it.volume_per_unit_m3 ?? 0);
                return (
                  <tr key={it.request_detail_id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-600">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{it.item_name}</p>
                        {it.quantity_per_unit && (
                          <p className="text-xs text-slate-500">{it.quantity_per_unit} {it.unit}/unit</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {it.quantity_requested} {it.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                      {it.volume_per_unit_m3 != null ? it.volume_per_unit_m3 : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={row?.shelfId || ''}
                        onChange={(e) => updateRow(idx, { shelfId: e.target.value })}
                        options={shelfOptions}
                        className="min-w-[140px]"
                      />
                      {u && (
                        <div className="mt-2 space-y-1 text-xs text-slate-600">
                          <p>
                            <span className="font-bold text-slate-700">Shelf:</span> used{' '}
                            <span className="font-mono">{formatM3(u.current_utilization)}</span>
                            {' / max '}
                            <span className="font-mono">{formatM3(u.max_capacity)}</span>
                            {' -> remaining '}
                            <span className="font-mono font-bold text-slate-800">
                              {formatM3(Math.max(0, u.max_capacity - u.current_utilization))}
                            </span>
                          </p>
                          {lineVol > 0 && (
                            <p className="text-slate-500">
                              This row (actual x m³/unit):{' '}
                              <span className="font-mono font-medium text-slate-700">{formatM3(lineVol)}</span>
                            </p>
                          )}
                          {badge && (
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.className}`}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={row?.quantityActual ?? ''}
                        onChange={(e) => {
                          // Chỉ cho phép số nguyên không âm
                          const raw = e.target.value;
                          const intVal =
                            raw === '' ? '' : String(Math.max(0, Math.floor(Number(raw) || 0)));
                          const requested = it.quantity_requested;
                          const actualNum = Number(intVal) || 0;
                          const shortage = requested - actualNum;
                          const patch: { quantityActual: string; damageQuantity?: string } = {
                            quantityActual: intVal,
                          };
                          if (shortage > 0) patch.damageQuantity = String(shortage);
                          else patch.damageQuantity = '';
                          updateRow(idx, patch);
                        }}
                        placeholder="0"
                        className="w-24 text-right"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {discrepancy !== null && (
                        <span className={`font-bold ${
                          discrepancy > 0 ? 'text-emerald-600' :
                          discrepancy < 0 ? 'text-red-600' :
                          'text-slate-500'
                        }`}>
                          {discrepancy > 0 ? '+' : ''}{discrepancy} {it.unit}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Damage/Loss Reporting */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Loss / damage report</h2>
        <p className="text-sm text-slate-600">Record damaged, missing, or failed-quality items</p>
        <div className="space-y-4">
          {req.items.map((it, idx) => {
            const row = rows[idx];
            const requested = it.quantity_requested;
            const actual = Number(row?.quantityActual) || 0;
            const damage = Number(row?.damageQuantity) || 0;
            const hasShortage = actual < requested;
            return (
              <div key={it.request_detail_id} className={`border rounded-xl p-4 ${hasShortage || damage > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900">{it.item_name}</p>
                    <p className="text-xs text-slate-500">Requested: {requested} {it.unit} | Actual: {actual} {it.unit}</p>
                  </div>
                  {hasShortage && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                      Short by {requested - actual} {it.unit}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Damaged quantity {hasShortage && <span className="text-amber-600">(must equal {requested - actual} {it.unit})</span>}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max={hasShortage ? requested - actual : actual}
                      step="0.01"
                      value={row?.damageQuantity ?? ''}
                      onChange={(e) => updateRow(idx, { damageQuantity: e.target.value })}
                      placeholder={hasShortage ? String(requested - actual) : '0'}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Loss reason</label>
                    <Select
                      value={row?.lossReason || ''}
                      onChange={(e) => updateRow(idx, { lossReason: e.target.value })}
                      options={[
                        { value: '', label: '-- Select reason --' },
                        { value: 'damage', label: 'Damaged during transport' },
                        { value: 'damage_storage', label: 'Damaged during storage' },
                        { value: 'shortage', label: 'Shortage on receiving' },
                        { value: 'quality', label: 'Quality issue' },
                        { value: 'expired', label: 'Expired' },
                        { value: 'other', label: 'Other' },
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={row?.notes ?? ''}
                    onChange={(e) => updateRow(idx, { notes: e.target.value })}
                    placeholder="Describe the item condition..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none"
                    rows={2}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-600">Total requested</p>
            <p className="text-xl font-black text-slate-900">
              {req.items.reduce((sum, it) => sum + it.quantity_requested, 0)} {req.items[0]?.unit || ''}
            </p>
          </div>
          <div>
            <p className="text-slate-600">Total actual</p>
            <p className="text-xl font-black text-slate-900">
              {rows.reduce((sum, r, idx) => sum + (Number(r.quantityActual) || 0), 0)} {req.items[0]?.unit || ''}
            </p>
          </div>
          <div>
            <p className="text-slate-600">Total damaged</p>
            <p className="text-xl font-black text-red-600">
              {rows.reduce((sum, r) => sum + (Number(r.damageQuantity) || 0), 0)} {req.items[0]?.unit || ''}
            </p>
          </div>
        </div>
      </div>

      {shelfVolumeWarnings.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-900">
          <p className="font-bold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            Shelf capacity exceeded
          </p>
          <ul className="list-disc pl-5 space-y-1">
            {shelfVolumeWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 items-center">
        <Button variant="ghost" onClick={() => router.push(backHref)}>
          Cancel
        </Button>
        {req.status === 'APPROVED' ? (
          <Button
            onClick={handleComplete}
            isLoading={saving}
            disabled={shelfVolumeWarnings.length > 0}
          >
            Complete putaway
          </Button>
        ) : (
          <p className="text-sm text-slate-500">Read only</p>
        )}
      </div>
    </div>
  );
}

