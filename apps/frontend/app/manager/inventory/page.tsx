'use client';

import React, { useState, useEffect } from 'react';
import type { CustomerInventoryItem, AdjustmentRequest } from '../../../lib/customer-types';
import { listInventory, listPendingAdjustments, approveInventoryAdjustment, rejectInventoryAdjustment, listTasks } from '../../../lib/mockApi/manager.api';
import { mockStaffTasks } from '../../../lib/mock/staff.mock';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ManagerInventoryPage() {
  const toast = useToastHelpers();
  const [inventory, setInventory] = useState<CustomerInventoryItem[]>([]);
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof listTasks>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<AdjustmentRequest[]>([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [inv, t, adj] = await Promise.all([listInventory(), listTasks(), listPendingAdjustments()]);
      setInventory(inv);
      setTasks(t);
      setAdjustments(adj);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const checkingTasks = tasks.filter((t) => t.type === 'Inventory Checking' && t.status === 'COMPLETED');
  const getCheckingResults = () => {
    const out: { taskId: string; taskCode: string; sku: string; productName: string; beforeQty: number; countedQty: number; discrepancyReason?: string }[] = [];
    for (const t of checkingTasks) {
      for (const it of t.items) {
        const before = it.currentQty ?? 0;
        const counted = it.countedQty ?? 0;
        out.push({
          taskId: t.id,
          taskCode: t.taskCode,
          sku: it.sku,
          productName: it.productName || '',
          beforeQty: before,
          countedQty: counted,
          discrepancyReason: it.hasDiscrepancy ? (it.discrepancyReason || '—') : undefined,
        });
      }
    }
    return out;
  };

  const isFullCheckDone = (adj: AdjustmentRequest) => {
    if (!adj.fullCheckTaskId) return false;
    const t = mockStaffTasks.find((x) => x.id === adj.fullCheckTaskId);
    return !!t && t.status === 'COMPLETED';
  };

  const handleApprove = async (id: string) => {
    try {
      setUpdating(true);
      await approveInventoryAdjustment(id);
      toast.success('Adjustment approved');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setUpdating(true);
      await rejectInventoryAdjustment(id);
      toast.success('Adjustment rejected');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setUpdating(false);
    }
  };

  const results = getCheckingResults();

  if (loading) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-3xl font-black text-slate-900">Inventory</h1><p className="text-slate-500 mt-1">Stock and adjustments</p></div>
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-3xl font-black text-slate-900">Inventory</h1><p className="text-slate-500 mt-1">Stock and adjustments</p></div>
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Inventory</h1>
        <p className="text-slate-500 mt-1">Stock, checking results and adjustments</p>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <h2 className="text-lg font-black text-slate-900 p-6 pb-0">Inventory table</h2>
        {inventory.length === 0 ? (
          <EmptyState icon="inventory_2" title="No inventory" message="No items" />
        ) : (
          <Table>
            <TableHead>
              <TableHeader>SKU</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Quantity (unit)</TableHeader>
              <TableHeader>Shelf</TableHeader>
              <TableHeader>Last updated</TableHeader>
            </TableHead>
            <TableBody>
              {inventory.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-bold text-slate-900">{i.sku}</TableCell>
                  <TableCell className="text-slate-700">{i.name}</TableCell>
                  <TableCell className="text-slate-700">{i.quantity} {i.unit}</TableCell>
                  <TableCell className="text-slate-700">{i.shelf}</TableCell>
                  <TableCell className="text-slate-600 text-sm">{new Date(i.lastUpdated).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {results.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <h2 className="text-lg font-black text-slate-900 p-6 pb-0">Inventory checking results</h2>
          <Table>
            <TableHead>
              <TableHeader>Task</TableHeader>
              <TableHeader>SKU</TableHeader>
              <TableHeader>Before qty</TableHeader>
              <TableHeader>Counted qty</TableHeader>
              <TableHeader>Discrepancy</TableHeader>
            </TableHead>
            <TableBody>
              {results.map((r, i) => (
                <TableRow key={`${r.taskId}-${r.sku}-${i}`}>
                  <TableCell className="font-bold text-slate-900">{r.taskCode}</TableCell>
                  <TableCell className="text-slate-700">{r.sku} {r.productName && `— ${r.productName}`}</TableCell>
                  <TableCell className="text-slate-700">{r.beforeQty}</TableCell>
                  <TableCell className="text-slate-700">{r.countedQty}</TableCell>
                  <TableCell className="text-slate-700">{r.discrepancyReason ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <h2 className="text-lg font-black text-slate-900 p-6 pb-0">Pending adjustments</h2>
        {adjustments.length === 0 ? (
          <EmptyState icon="fact_check" title="No pending adjustments" message="No adjustments to approve" />
        ) : (
          <Table>
            <TableHead>
              <TableHeader>ID</TableHeader>
              <TableHeader>SKU</TableHeader>
              <TableHeader>Current → Requested</TableHeader>
              <TableHeader>Reason</TableHeader>
              <TableHeader>Full check</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHead>
            <TableBody>
              {adjustments.map((a) => {
                const checked = isFullCheckDone(a);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-bold text-slate-900">{a.id}</TableCell>
                    <TableCell className="text-slate-700">{a.sku}</TableCell>
                    <TableCell className="text-slate-700">{a.currentQty} → {a.requestedQty}</TableCell>
                    <TableCell className="text-slate-700">{a.reason}</TableCell>
                    <TableCell>
                      <Badge variant={checked ? 'success' : 'error'}>{checked ? 'Checked' : 'Not checked'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(a.id)} disabled={updating || !checked}>
                          Approve
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleReject(a.id)} disabled={updating}>
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
