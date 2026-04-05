'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';

export default function StaffInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const rows = await listStorageRequests();
        if (cancelled) return;
        setRequests(rows);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load inventory movement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const mapped = requests.flatMap((r) =>
      r.items.map((i: any) => ({
        key: `${r.request_id}-${i.request_detail_id}`,
        itemName: i.item_name,
        shelfCode: i.shelf_code || '-',
        qty: i.quantity_actual ?? i.quantity_requested ?? 0,
        unit: i.unit,
        movementType: r.request_type === 'IN' ? 'Inbound' : 'Outbound',
        status: r.status,
        updatedAt: r.updated_at || r.created_at,
      })),
    );
    if (!query.trim()) return mapped;
    const q = query.trim().toLowerCase();
    return mapped.filter((r) => r.itemName.toLowerCase().includes(q) || r.shelfCode.toLowerCase().includes(q));
  }, [requests, query]);

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventory Update & Movement</h1>
        <LoadingSkeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (error) return <ErrorState title="Failed to load inventory page" message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventory Update & Movement</h1>
        <p className="text-slate-500 mt-1">Search items, review shelf movement, and submit manual adjustment notes</p>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Search by item name or shelf code..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button variant="secondary">Move Between Shelves</Button>
          <Button variant="secondary">Manual Adjustment Note</Button>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon="inventory_2" title="No item records found" message="No inbound/outbound item movement data available." />
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableHeader>Item</TableHeader>
              <TableHeader>Shelf</TableHeader>
              <TableHeader>Qty</TableHeader>
              <TableHeader>Movement</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Updated</TableHeader>
            </TableHead>
            <TableBody>
              {rows.slice(0, 120).map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="font-bold text-slate-900">{r.itemName}</TableCell>
                  <TableCell>{r.shelfCode}</TableCell>
                  <TableCell>{r.qty} {r.unit}</TableCell>
                  <TableCell><Badge variant="neutral">{r.movementType}</Badge></TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell className="text-sm text-slate-500">{new Date(r.updatedAt).toLocaleString('en-GB')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
