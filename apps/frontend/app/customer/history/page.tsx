'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';

type HistoryType = 'ALL' | 'INBOUND' | 'OUTBOUND' | 'CYCLE_COUNT';

type HistoryRow = {
  id: string;
  type: Exclude<HistoryType, 'ALL'>;
  reference: string;
  status: string;
  quantity: number;
  updatedAt: string;
};

export default function CustomerHistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<HistoryType>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const [requests, cycles] = await Promise.all([listStorageRequests(), getCycleCounts()]);
        if (cancelled) return;

        const requestRows: HistoryRow[] = requests.map((r) => ({
          id: r.request_id,
          type: r.request_type === 'IN' ? 'INBOUND' : 'OUTBOUND',
          reference: r.reference || r.request_id.slice(-8),
          status: r.status,
          quantity: r.items.reduce((sum, i) => sum + (i.quantity_actual ?? i.quantity_requested ?? 0), 0),
          updatedAt: r.updated_at || r.created_at,
        }));

        const cycleRows: HistoryRow[] = cycles.map((c) => ({
          id: c.cycle_count_id,
          type: 'CYCLE_COUNT',
          reference: c.contract_code,
          status: c.status,
          quantity: c.items?.length || c.target_items?.length || 0,
          updatedAt: c.updated_at || c.created_at,
        }));

        setRows([...requestRows, ...cycleRows].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
      if (fromDate && new Date(r.updatedAt) < new Date(fromDate)) return false;
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(r.updatedAt) > end) return false;
      }
      return true;
    });
  }, [rows, typeFilter, fromDate, toDate]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">History</h1>
          <p className="text-slate-500 mt-1">My inbound, outbound, and cycle-count transaction timeline</p>
        </div>
        <LoadingSkeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Failed to load history" message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">History</h1>
        <p className="text-slate-500 mt-1">My inbound, outbound, and cycle-count transaction timeline</p>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as HistoryType)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm">
            <option value="ALL">All types</option>
            <option value="INBOUND">Inbound</option>
            <option value="OUTBOUND">Outbound</option>
            <option value="CYCLE_COUNT">Cycle Count</option>
          </select>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <div className="h-11 rounded-xl border border-slate-200 bg-slate-50 flex items-center px-3 text-sm text-slate-600">
            {filteredRows.length} records
          </div>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {filteredRows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon="history" title="No transactions found" message="Try adjusting your date/type filters." />
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableHeader>Type</TableHeader>
              <TableHeader>Reference</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Quantity</TableHeader>
              <TableHeader>Updated at</TableHeader>
            </TableHead>
            <TableBody>
              {filteredRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant="neutral">{r.type}</Badge>
                  </TableCell>
                  <TableCell className="font-bold text-slate-900">{r.reference}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
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
