'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToastHelpers } from '../../../../lib/toast';
import {
  getStorageRequestById,
  staffCompleteStorageRequest,
  type StorageRequestView,
} from '../../../../lib/storage-requests.api';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { LoadingSkeleton } from '../../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../../components/ui/ErrorState';

export default function StaffOutboundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToastHelpers();
  const id = params.id as string;
  const from = searchParams.get('from');
  const backHref = from === 'outbound' ? '/staff/outbound-requests' : '/staff/tasks';

  const [req, setReq] = useState<StorageRequestView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [rows, setRows] = useState<Array<{
    requestDetailId: string;
    quantityActual: string;
    damageQuantity: string;
    lossReason: string;
    notes: string;
  }>>([]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStorageRequestById(id);
      setReq(data);
      setRows(
        data.items.map((it) => ({
          requestDetailId: it.request_detail_id,
          quantityActual: it.quantity_actual?.toString() || '',
          damageQuantity: '',
          lossReason: '',
          notes: '',
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load outbound request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const updateRow = (idx: number, patch: Partial<{
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
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const item = req.items[i];
      const actual = Number(r.quantityActual);
      if (isNaN(actual) || actual < 0) {
        toast.warning('Picked quantity must be a number >= 0 for all items');
        return;
      }
      const requested = item.quantity_requested;
      const shortage = requested - actual;
      const damage = Number(r.damageQuantity) || 0;
      if (shortage > 0) {
        if (damage !== shortage) {
          toast.warning(
            `"${item.item_name}": Short by ${shortage} ${item.unit}. Damaged/unpicked quantity must equal ${shortage} ${item.unit}.`
          );
          return;
        }
      } else if (damage > 0 && damage > actual) {
        toast.warning(
          `"${item.item_name}": Damaged quantity cannot exceed picked quantity (${actual} ${item.unit}).`
        );
        return;
      }
    }
    try {
      setSaving(true);
      await staffCompleteStorageRequest({
        requestId: req.request_id,
        items: rows.map((r) => ({
          requestDetailId: r.requestDetailId,
          quantityActual: Number(r.quantityActual || 0),
          damageQuantity: r.damageQuantity ? Number(r.damageQuantity) : undefined,
          lossReason: r.lossReason || undefined,
          lossNotes: r.notes || undefined,
        })),
      });
      toast.success('Outbound picking completed. Stock decreased.');
      router.push(backHref);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to complete outbound request');
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
            <h1 className="text-2xl font-black text-slate-900 mb-2">Pick & Dispatch {req.reference ?? req.request_id}</h1>
            <div className="space-y-1 text-sm">
              <p><span className="font-bold text-slate-600">Contract code:</span> {req.contract_code ?? req.contract_id}</p>
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
                <th className="px-4 py-3 text-left font-bold text-slate-700">Shelf</th>
                <th className="px-4 py-3 text-left font-bold text-slate-700">Zone</th>
                <th className="px-4 py-3 text-right font-bold text-slate-700">Requested</th>
                <th className="px-4 py-3 text-right font-bold text-slate-700">Picked</th>
                <th className="px-4 py-3 text-right font-bold text-slate-700">Discrepancy</th>
              </tr>
            </thead>
            <tbody>
              {req.items.map((it, idx) => {
                const discrepancy = getDiscrepancy(idx);
                const row = rows[idx];
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
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-700">{it.shelf_code || it.shelf_id || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-600">{it.zone_code || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {it.quantity_requested} {it.unit}
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        max={it.quantity_requested}
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
        <p className="text-sm text-slate-600">Record damaged, missing, or unpicked quantities</p>
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
                    <p className="text-xs text-slate-500">
                      Requested: {requested} {it.unit} | Picked: {actual} {it.unit}
                      {it.shelf_code && ` | Shelf: ${it.shelf_code}`}
                    </p>
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
                      Damaged / unpicked quantity {hasShortage && <span className="text-amber-600">(must equal {requested - actual} {it.unit})</span>}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max={hasShortage ? requested - actual : requested}
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
                        { value: 'damage', label: 'Damaged in warehouse' },
                        { value: 'damage_picking', label: 'Damaged during picking' },
                        { value: 'shortage', label: 'Warehouse shortage' },
                        { value: 'expired', label: 'Expired' },
                        { value: 'location_error', label: 'Location not found' },
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
                    placeholder="Describe item condition and why it could not be picked..."
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
            <p className="text-slate-600">Total picked</p>
            <p className="text-xl font-black text-slate-900">
              {rows.reduce((sum, r) => sum + (Number(r.quantityActual) || 0), 0)} {req.items[0]?.unit || ''}
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

      {/* Actions */}
      <div className="flex justify-end gap-2 items-center">
        <Button
          variant="ghost"
          onClick={() => router.push(backHref)}
        >
          Cancel
        </Button>
        {req.status === 'APPROVED' ? (
          <Button onClick={handleComplete} isLoading={saving}>
            Complete picking
          </Button>
        ) : (
          <p className="text-sm text-slate-500">Read only</p>
        )}
      </div>
    </div>
  );
}

