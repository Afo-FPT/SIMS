'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCycleCountById,
  submitCycleCountResult,
  type CycleCountResponse,
} from '../../../../lib/cycle-count.api';
import { useToastHelpers } from '../../../../lib/toast';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
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

type RowState = {
  stored_item_id: string;
  shelf_id: string;
  shelf_code: string;
  item_name: string;
  unit: string;
  system_quantity: number;
  countedQuantity: number;
  note: string;
};

export default function StaffCycleCountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToastHelpers();
  const id = params.id as string;

  const [data, setData] = useState<CycleCountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<RowState[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCycleCountById(id);
      setData(res);
      if (res.target_items && res.target_items.length > 0) {
        setRows(
          res.target_items.map((t) => ({
            ...t,
            countedQuantity: t.system_quantity,
            note: '',
          }))
        );
      } else {
        setRows([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      toast.error('Failed to load cycle count details');
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (index: number, field: 'countedQuantity' | 'note', value: number | string) => {
    const next = [...rows];
    if (field === 'countedQuantity') {
      next[index] = { ...next[index], countedQuantity: Number(value) || 0 };
    } else {
      next[index] = { ...next[index], note: String(value) };
    }
    setRows(next);
  };

  const handleSubmit = async () => {
    if (!data || rows.length === 0) return;
    const invalid = rows.some(
      (r) => r.countedQuantity < 0 || (r.countedQuantity !== r.system_quantity && !r.note.trim())
    );
    if (invalid) {
      toast.warning(
        'Please enter counted quantity for all rows. If there is a discrepancy, a note is required.'
      );
      return;
    }
    try {
      setSubmitting(true);
      await submitCycleCountResult(id, rows.map((r) => ({
        storedItemId: r.stored_item_id,
        shelfId: r.shelf_id,
        countedQuantity: r.countedQuantity,
        note: r.note.trim() || undefined,
      })));
      toast.success('Cycle count results submitted');
      router.push('/staff/cycle-count');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit results');
    } finally {
      setSubmitting(false);
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

  const canSubmit =
    data.status === 'ASSIGNED_TO_STAFF' && data.target_items && data.target_items.length > 0;
  const hasItems = data.items && data.items.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/staff/cycle-count"
          className="text-slate-500 hover:text-primary font-bold flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back
        </Link>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Cycle count – {data.contract_code}
            </h1>
            <p className="text-slate-500 mt-1">{data.customer_name}</p>
          </div>
          <Badge
            variant={
              data.status === 'ASSIGNED_TO_STAFF'
                ? 'warning'
                : data.status === 'STAFF_SUBMITTED' || data.status === 'CONFIRMED'
                  ? 'success'
                  : 'neutral'
            }
          >
            {data.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500 mb-1">Warehouse</p>
            <p className="font-bold text-slate-900">{data.warehouse_name || '—'}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Deadline</p>
            <p className="font-bold text-slate-900">
              {data.counting_deadline
                ? new Date(data.counting_deadline).toLocaleString('en-US')
                : '—'}
            </p>
          </div>
          {data.note && (
            <div className="md:col-span-2">
              <p className="text-slate-500 mb-1">Request note</p>
              <p className="text-slate-700">{data.note}</p>
            </div>
          )}
        </div>

        {canSubmit && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit results'}
            </Button>
          </div>
        )}
      </section>

      {canSubmit && rows.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">
            Items to count — enter counted quantity and notes (required if discrepancy)
          </h2>
          <Table>
            <TableHead>
              <TableHeader>Shelf</TableHeader>
              <TableHeader>Item</TableHeader>
              <TableHeader>Unit</TableHeader>
              <TableHeader>System qty</TableHeader>
              <TableHeader>Counted qty</TableHeader>
              <TableHeader>Note (required if discrepancy)</TableHeader>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => {
                const hasDiscrepancy = r.countedQuantity !== r.system_quantity;
                return (
                  <TableRow key={r.stored_item_id}>
                    <TableCell className="font-mono text-slate-700">
                      {r.shelf_code}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">
                      {r.item_name}
                    </TableCell>
                    <TableCell className="text-slate-600">{r.unit}</TableCell>
                    <TableCell className="text-slate-600">
                      {r.system_quantity}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={r.countedQuantity}
                        onChange={(e) =>
                          updateRow(i, 'countedQuantity', e.target.value)
                        }
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={r.note}
                        onChange={(e) => updateRow(i, 'note', e.target.value)}
                        placeholder={
                          hasDiscrepancy
                            ? 'Note required when discrepancy exists'
                            : 'Note (optional)'
                        }
                        className={`w-full max-w-xs px-3 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-primary/20 ${
                          hasDiscrepancy && !r.note.trim()
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-slate-200'
                        }`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      )}

      {hasItems && !canSubmit && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">
            Submitted results
          </h2>
          <Table>
            <TableHead>
              <TableHeader>Shelf</TableHeader>
              <TableHeader>Item</TableHeader>
              <TableHeader>System qty</TableHeader>
              <TableHeader>Counted qty</TableHeader>
              <TableHeader>Discrepancy</TableHeader>
              <TableHeader>Note</TableHeader>
            </TableHead>
            <TableBody>
              {data.items!.map((item) => (
                <TableRow key={item.stored_item_id}>
                  <TableCell className="font-mono">{item.shelf_code}</TableCell>
                  <TableCell className="font-bold">{item.item_name}</TableCell>
                  <TableCell>{item.system_quantity}</TableCell>
                  <TableCell>{item.counted_quantity ?? '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        (item.discrepancy ?? 0) !== 0 ? 'warning' : 'success'
                      }
                    >
                      {item.discrepancy ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm max-w-[200px] truncate">
                    {item.note || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {!canSubmit && !hasItems && data.target_items && data.target_items.length === 0 && (
        <p className="text-slate-500">No items to count.</p>
      )}
    </div>
  );
}
