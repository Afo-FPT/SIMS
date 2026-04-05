'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  confirmStorageRequest,
  getStorageRequestById,
  type StorageRequestView,
} from '../../../../lib/storage-requests.api';
import { useToastHelpers } from '../../../../lib/toast';
import { LoadingSkeleton } from '../../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Button } from '../../../../components/ui/Button';

const statusLabel: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  DONE_BY_STAFF: 'In progress',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return s;
  }
}

function statusPillClass(status: string) {
  return status === 'COMPLETED'
    ? 'bg-emerald-100 text-emerald-700'
    : status === 'DONE_BY_STAFF' || status === 'APPROVED'
      ? 'bg-blue-100 text-blue-700'
      : status === 'REJECTED'
        ? 'bg-red-100 text-red-700'
        : 'bg-slate-100 text-slate-600';
}

export default function CustomerServiceRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToastHelpers();
  const id = params.id;

  const [data, setData] = useState<StorageRequestView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const canConfirm = data?.status === 'DONE_BY_STAFF';

  const totals = useMemo(() => {
    const items = data?.items ?? [];
    const requested = items.reduce((sum, it) => sum + (it.quantity_requested ?? 0), 0);
    const actual = items.reduce((sum, it) => sum + (it.quantity_actual ?? 0), 0);
    return { requested, actual, count: items.length };
  }, [data]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getStorageRequestById(id);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleConfirmCompleted = async () => {
    if (!data) return;
    try {
      setConfirming(true);
      await confirmStorageRequest(data.request_id);
      toast.success('Confirmed completed. Status updated to Completed.');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Confirm failed');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton className="h-64 w-full" />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load"
        message={error || 'Request not found'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Link href="/customer/service-requests" className="hover:underline">
              Service Requests
            </Link>
            <span className="material-symbols-outlined text-base">chevron_right</span>
            <span className="text-slate-700 font-semibold">Details</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-2">
            Request {data.request_id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-slate-500 mt-1">Inbound / Outbound request details and confirmation.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.back()}>
            Back
          </Button>
          {canConfirm && (
            <Button isLoading={confirming} onClick={handleConfirmCompleted}>
              Confirm completed
            </Button>
          )}
        </div>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="text-slate-500">Request ID:</span>
          <span className="font-bold text-slate-900">{data.request_id}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">Type:</span>
          <span className="font-medium text-slate-800">
            {data.request_type === 'IN' ? 'Inbound' : 'Outbound'}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">Contract:</span>
          <span className="font-medium text-slate-800">{data.contract_code || 'Unknown Contract'}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="text-slate-500">Status:</span>
          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${statusPillClass(data.status)}`}>
            {statusLabel[data.status] ?? data.status}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">Created:</span>
          <span>{formatDate(data.created_at)}</span>
          {data.updated_at && (
            <>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500">Updated:</span>
              <span>{formatDate(data.updated_at)}</span>
            </>
          )}
        </div>

        {canConfirm && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
            Staff has completed the operation. Please confirm to finish the request and mark status as{' '}
            <span className="font-black">Completed</span>.
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-black text-slate-900">Items</h2>
          <div className="text-sm text-slate-500">
            {totals.count} items • Requested <span className="font-bold text-slate-700">{totals.requested}</span> • Actual{' '}
            <span className="font-bold text-slate-700">{totals.actual}</span>
          </div>
        </div>

        {data.items.length === 0 ? (
          <p className="text-slate-500 text-sm py-6">No items in this request.</p>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-4 py-3 text-left font-bold text-slate-600">#</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600">Item</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600">Unit</th>
                  {data.request_type === 'IN' && (
                    <th className="px-4 py-3 text-right font-bold text-slate-600">Qty/unit</th>
                  )}
                  <th className="px-4 py-3 text-right font-bold text-slate-600">Requested</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-600">Actual</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600">Shelf</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, idx) => (
                  <tr key={it.request_detail_id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{it.item_name}</td>
                    <td className="px-4 py-3 text-slate-700">{it.unit}</td>
                    {data.request_type === 'IN' && (
                      <td className="px-4 py-3 text-right text-slate-600">
                        {it.quantity_per_unit != null ? it.quantity_per_unit : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-medium">{it.quantity_requested}</td>
                    <td className="px-4 py-3 text-right">
                      {it.quantity_actual != null ? it.quantity_actual : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{it.shelf_code ?? it.shelf_id ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

