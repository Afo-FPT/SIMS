'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import { Pagination } from '../../../components/ui/Pagination';

type HistoryType = 'ALL' | 'INBOUND' | 'OUTBOUND';

type HistoryRow = {
  id: string;
  type: Exclude<HistoryType, 'ALL'>;
  reference: string;
  status: string;
  quantity: number;
  updatedAt: string;
};

function parseIsoLocalDate(value: string): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

function toIsoLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDdMmYy(dateText: string): string {
  if (!dateText) return '--/--/--';
  const d = new Date(dateText);
  if (Number.isNaN(d.getTime())) return '--/--/--';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function formatDdMmYyyy(dateText: string): string {
  if (!dateText) return '';
  const d = parseIsoLocalDate(dateText) ?? new Date(dateText);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => (value ? (parseIsoLocalDate(value) ?? new Date()) : new Date()));

  useEffect(() => {
    if (value) {
      setViewDate(parseIsoLocalDate(value) ?? new Date());
    }
  }, [value]);

  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const startWeekday = (startOfMonth.getDay() + 6) % 7; // Monday = 0

  const cells: Array<{ day?: number }> = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push({});
  for (let d = 1; d <= daysInMonth; d += 1) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push({});

  const selected = value ? parseIsoLocalDate(value) : null;
  const selectedY = selected?.getFullYear();
  const selectedM = selected?.getMonth();
  const selectedD = selected?.getDate();

  return (
    <div className="space-y-1 relative">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-left bg-white hover:border-primary/40 transition-colors"
      >
        {value ? formatDdMmYyyy(value) : 'dd/mm/yyyy'}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-72 rounded-2xl border border-slate-200 bg-white shadow-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="size-8 inline-flex items-center justify-center rounded-lg hover:bg-slate-100"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <p className="text-sm font-bold text-slate-900">
              {viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </p>
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              className="size-8 inline-flex items-center justify-center rounded-lg hover:bg-slate-100"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <div key={d} className="text-center text-[11px] font-bold text-slate-400 py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              if (!cell.day) return <div key={`empty-${idx}`} className="h-8" />;
              const isSelected =
                selectedY === viewDate.getFullYear() &&
                selectedM === viewDate.getMonth() &&
                selectedD === cell.day;
              return (
                <button
                  key={`day-${cell.day}`}
                  type="button"
                  onClick={() => {
                    const picked = new Date(viewDate.getFullYear(), viewDate.getMonth(), cell.day!);
                    const iso = toIsoLocalDate(picked);
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary text-white font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between mt-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-bold text-primary hover:text-primary-dark"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerHistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<HistoryType>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const requests = await listStorageRequests();
        if (cancelled) return;

        const requestRows: HistoryRow[] = requests.map((r) => ({
          id: r.request_id,
          type: r.request_type === 'IN' ? 'INBOUND' : 'OUTBOUND',
          reference: r.reference || r.request_id.slice(-8),
          status: r.status,
          quantity: r.items.reduce((sum, i) => sum + (i.quantity_actual ?? i.quantity_requested ?? 0), 0),
          updatedAt: r.updated_at || r.created_at,
        }));

        setRows([...requestRows].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
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
    const from = parseIsoLocalDate(fromDate);
    const to = parseIsoLocalDate(toDate);
    return rows.filter((r) => {
      if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
      if (from && new Date(r.updatedAt) < from) return false;
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (new Date(r.updatedAt) > end) return false;
      }
      return true;
    });
  }, [rows, typeFilter, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, fromDate, toDate, rowsPerPage]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">History</h1>
          <p className="text-slate-500 mt-1">My inbound and outbound transaction timeline</p>
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
        <p className="text-slate-500 mt-1">My inbound and outbound transaction timeline</p>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as HistoryType)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm">
            <option value="ALL">All types</option>
            <option value="INBOUND">Inbound</option>
            <option value="OUTBOUND">Outbound</option>
          </select>
          <DatePickerField label="From date" value={fromDate} onChange={setFromDate} />
          <DatePickerField label="To date" value={toDate} onChange={setToDate} />
          <select
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value={10}>Rows per page: 10</option>
            <option value={20}>Rows per page: 20</option>
            <option value={50}>Rows per page: 50</option>
          </select>
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
              {paginatedRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant="neutral">{r.type}</Badge>
                  </TableCell>
                  <TableCell className="font-bold text-slate-900">{r.reference}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {formatDdMmYy(r.updatedAt)}{' '}
                    {new Date(r.updatedAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
      {filteredRows.length > 0 && totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
