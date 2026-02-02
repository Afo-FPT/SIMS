'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToastHelpers } from '../../../../lib/toast';
import {
  getStorageRequestById,
  staffCompleteStorageRequest,
  type StorageRequestView,
} from '../../../../lib/storage-requests.api';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { LoadingSkeleton } from '../../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../../components/ui/ErrorState';

export default function StaffOutboundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToastHelpers();
  const id = params.id as string;

  const [req, setReq] = useState<StorageRequestView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [rows, setRows] = useState<Array<{ requestDetailId: string; quantityActual: string }>>([]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStorageRequestById(id);
      setReq(data);
      setRows(
        data.items.map((it) => ({
          requestDetailId: it.request_detail_id,
          quantityActual: '',
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

  const updateRow = (idx: number, patch: Partial<{ quantityActual: string }>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleComplete = async () => {
    if (!req) return;
    for (const r of rows) {
      const q = Number(r.quantityActual);
      if (isNaN(q) || q < 0) {
        toast.warning('Quantity actual must be a number >= 0 for all items');
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
        })),
      });
      toast.success('Outbound picking completed. Stock decreased.');
      router.push('/staff/outbound-requests');
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

  return (
    <div className="space-y-6">
      <Link href="/staff/outbound-requests" className="text-sm font-bold text-slate-500 hover:text-primary">
        ← Back
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Pick & dispatch {req.request_id}</h1>
          <p className="text-slate-500 text-sm">Contract: {req.contract_id}</p>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-2 text-left">Item</th>
                <th className="px-4 py-2 text-left">Shelf</th>
                <th className="px-4 py-2 text-left">Requested</th>
                <th className="px-4 py-2 text-left">Actual picked</th>
              </tr>
            </thead>
            <tbody>
              {req.items.map((it, idx) => (
                <tr key={it.request_detail_id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{it.item_name}</td>
                  <td className="px-4 py-2">{it.shelf_code || it.shelf_id}</td>
                  <td className="px-4 py-2">
                    {it.quantity_requested} {it.unit}
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      min="0"
                      value={rows[idx]?.quantityActual ?? ''}
                      onChange={(e) => updateRow(idx, { quantityActual: e.target.value })}
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => router.push('/staff/outbound-requests')}>
            Cancel
          </Button>
          <Button onClick={handleComplete} isLoading={saving}>
            Complete outbound
          </Button>
        </div>
      </div>
    </div>
  );
}

