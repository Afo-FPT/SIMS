'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCycleCountById,
  confirmCycleCount,
  requestInventoryAdjustment,
  type CycleCountResponse,
} from '../../../../lib/cycle-count.api';
import { useToastHelpers } from '../../../../lib/toast';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '../../../../components/ui/Table';
import { LoadingSkeleton } from '../../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Modal } from '../../../../components/ui/Modal';

const STATUS_LABEL: Record<string, string> = {
  PENDING_MANAGER_APPROVAL: 'Pending manager approval',
  ASSIGNED_TO_STAFF: 'Waiting for staff count',
  STAFF_SUBMITTED: 'Staff submitted results',
  ADJUSTMENT_REQUESTED: 'Adjustment requested',
  CONFIRMED: 'Confirmed',
  RECOUNT_REQUIRED: 'Recount required',
  REJECTED: 'Rejected',
};

export default function CustomerCycleCountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToastHelpers();
  const id = params.id as string;

  const [data, setData] = useState<CycleCountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCycleCountById(id);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      toast.error('Failed to load cycle count details');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!data) return;
    try {
      setConfirming(true);
      await confirmCycleCount(id);
      toast.success('Cycle count confirmed (no inventory adjustment)');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Confirm failed');
    } finally {
      setConfirming(false);
    }
  };

  const handleRequestAdjustment = async () => {
    if (!data) return;
    try {
      setAdjusting(true);
      await requestInventoryAdjustment(id, adjustReason);
      toast.success('Inventory adjustment request submitted');
      setAdjustModalOpen(false);
      setAdjustReason('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit adjustment request');
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-8">
        <ErrorState
          title="Failed to load cycle count"
          message={error || 'Not found'}
          onRetry={load}
        />
      </div>
    );
  }

  const hasItems = data.items && data.items.length > 0;
  const canCustomerAct = data.status === 'STAFF_SUBMITTED';
  const hasDiscrepancy =
    !!data.items && data.items.some((i) => (i.discrepancy ?? 0) !== 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/customer/service-requests?tab=tracking"
          className="text-slate-500 hover:text-primary font-bold flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Service Requests
        </Link>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Cycle Count – {data.contract_code}
            </h1>
            <p className="text-slate-500 mt-1">
              Warehouse: <span className="font-bold">{data.warehouse_name || '—'}</span>
            </p>
          </div>
          <Badge
            variant={
              data.status === 'PENDING_MANAGER_APPROVAL'
                ? 'warning'
                : data.status === 'ASSIGNED_TO_STAFF'
                  ? 'info'
                  : data.status === 'STAFF_SUBMITTED'
                    ? 'warning'
                    : data.status === 'ADJUSTMENT_REQUESTED'
                      ? 'info'
                      : data.status === 'CONFIRMED'
                        ? 'success'
                        : data.status === 'REJECTED'
                          ? 'error'
                          : 'neutral'
            }
          >
            {STATUS_LABEL[data.status] || data.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500 mb-1">Requested at</p>
            <p className="font-bold text-slate-900">
              {new Date(data.requested_at).toLocaleString('vi-VN', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Counting deadline</p>
            <p className="font-bold text-slate-900">
              {data.counting_deadline
                ? new Date(data.counting_deadline).toLocaleString('vi-VN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : '—'}
            </p>
          </div>
          {data.preferred_date && (
            <div>
            <p className="text-slate-500 mb-1">Preferred time</p>
            <p className="font-bold text-slate-900">
                {new Date(data.preferred_date).toLocaleString('vi-VN', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          )}
          {data.confirmed_at && (
            <div>
            <p className="text-slate-500 mb-1">Confirmed at</p>
            <p className="font-bold text-slate-900">
                {new Date(data.confirmed_at).toLocaleString('vi-VN', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          )}
          {data.note && (
            <div className="md:col-span-2">
              <p className="text-slate-500 mb-1">Request note</p>
              <p className="text-slate-700">{data.note}</p>
            </div>
          )}
        </div>

        {canCustomerAct && (
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap gap-3">
            <Button onClick={handleConfirm} disabled={confirming}>
              {confirming ? 'Confirming...' : 'Confirm result (no inventory adjustment)'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setAdjustModalOpen(true)}
              disabled={adjusting || !hasDiscrepancy}
            >
              Request inventory adjustment
            </Button>
            {!hasDiscrepancy && (
              <p className="text-xs text-slate-500">
                No discrepancy; adjustment request not available.
              </p>
            )}
          </div>
        )}

        {data.status === 'ADJUSTMENT_REQUESTED' && (
          <div className="mt-6 pt-4 border-t border-slate-100 text-sm text-slate-600">
            Adjustment request sent. Waiting for manager to apply.
          </div>
        )}
        {data.status === 'CONFIRMED' && (
          <div className="mt-6 pt-4 border-t border-slate-100 text-sm text-slate-600">
            Cycle count has been confirmed.
            {data.inventory_adjusted
              ? ' Inventory has been updated per count results.'
              : ' No inventory adjustment was applied.'}
          </div>
        )}
      </section>

      {hasItems && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">
            Count results
          </h2>
          <Table>
            <TableHead>
              <TableHeader>Shelf</TableHeader>
              <TableHeader>Item</TableHeader>
              <TableHeader>Unit</TableHeader>
              <TableHeader>System qty</TableHeader>
              <TableHeader>Counted qty</TableHeader>
              <TableHeader>Discrepancy</TableHeader>
              <TableHeader>Note</TableHeader>
            </TableHead>
            <TableBody>
              {data.items!.map((item) => {
                const discrepancy = item.discrepancy ?? 0;
                return (
                  <TableRow key={item.stored_item_id}>
                    <TableCell className="font-mono">{item.shelf_code}</TableCell>
                    <TableCell className="font-bold">{item.item_name}</TableCell>
                    <TableCell className="text-slate-600">{item.unit}</TableCell>
                    <TableCell>{item.system_quantity}</TableCell>
                    <TableCell>{item.counted_quantity ?? '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={discrepancy !== 0 ? 'warning' : 'success'}
                      >
                        {discrepancy}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm max-w-[240px]">
                      {item.note || '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      )}

      {hasItems &&
        data.items!.some((i) => (i.discrepancy ?? 0) !== 0) && (
          <section className="border border-amber-200 rounded-3xl bg-amber-50/50 p-6 shadow-sm">
            <h2 className="text-lg font-black text-amber-900 mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">inventory_2</span>
              Shortage / variance reasons (inventory check)
            </h2>
            <p className="text-sm text-amber-900/80 mb-4">
              Lines where counted quantity differs from system quantity. Staff may leave a note explaining damage,
              shrinkage, or counting notes.
            </p>
            <ul className="space-y-4">
              {data.items!
                .filter((i) => (i.discrepancy ?? 0) !== 0)
                .map((item) => {
                  const disc = item.discrepancy ?? 0;
                  return (
                    <li
                      key={`${item.stored_item_id}-${item.shelf_id}`}
                      className="text-sm border-b border-amber-100 pb-4 last:border-0 last:pb-0"
                    >
                      <p className="font-bold text-slate-900">
                        {item.item_name}{' '}
                        <span className="font-mono text-slate-500">({item.shelf_code})</span>
                      </p>
                      <div className="mt-2 space-y-1 text-slate-700">
                        <p>
                          <span className="text-slate-600 font-semibold">System qty:</span> {item.system_quantity}{' '}
                          {item.unit} · <span className="text-slate-600 font-semibold">Counted:</span>{' '}
                          {item.counted_quantity ?? '—'} ·{' '}
                          <span className="text-amber-800 font-semibold">Variance:</span> {disc > 0 ? '+' : ''}
                          {disc}
                        </p>
                        {item.note && item.note.trim() ? (
                          <p>
                            <span className="text-slate-600 font-semibold">Reason / note:</span> {item.note}
                          </p>
                        ) : (
                          <p className="text-slate-500 italic">No staff note on this line.</p>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}

      {!hasItems && (
        <p className="text-slate-500 text-sm">
          No count results yet (staff has not submitted or session was rejected).
        </p>
      )}

      <Modal
        open={adjustModalOpen}
        onOpenChange={setAdjustModalOpen}
        title="Request inventory adjustment"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Request to update inventory per the discrepancy found. Optionally describe the reason.
          </p>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Reason (optional)
            </label>
            <textarea
              rows={4}
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              placeholder="e.g. Adjust per January count, variance due to data entry..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestAdjustment} disabled={adjusting}>
              {adjusting ? 'Sending...' : 'Submit request'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

