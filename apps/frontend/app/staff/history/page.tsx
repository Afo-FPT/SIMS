'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { StaffTask, TaskType } from '../../../types/staff';
import { listStaffTasks } from '../../../lib/mockApi/staff.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Pagination } from '../../../components/ui/Pagination';

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

function formatDdMmYy(dateText?: string): string {
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
  const startWeekday = (startOfMonth.getDay() + 6) % 7;

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
                    onChange(toIsoLocalDate(picked));
                    setOpen(false);
                  }}
                  className={`h-8 rounded-lg text-sm transition-colors ${
                    isSelected ? 'bg-primary text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
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

export default function StaffHistoryPage() {
  const toast = useToastHelpers();
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TaskType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    loadHistory();
  }, [typeFilter]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const allResult = await listStaffTasks({
        status: 'COMPLETED',
        type: typeFilter || undefined,
        limit: 1000,
      });
      setTasks(allResult.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    const from = parseIsoLocalDate(startDate);
    const to = parseIsoLocalDate(endDate);
    return tasks.filter((t) => {
      if (!t.completedAt) return false;
      const completedAt = new Date(t.completedAt);
      if (from && completedAt < from) return false;
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (completedAt > end) return false;
      }
      return true;
    });
  }, [tasks, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / rowsPerPage));

  const paginatedTasks = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredTasks.slice(start, start + rowsPerPage);
  }, [filteredTasks, page, rowsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, startDate, endDate, rowsPerPage]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">History</h1>
        <p className="text-slate-500 mt-1">My completed task timeline</p>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TaskType | '')}
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="">All types</option>
            <option value="Inbound">Inbound</option>
            <option value="Outbound">Outbound</option>
            <option value="Inventory Checking">Inventory Checking</option>
          </select>
          <DatePickerField label="From date" value={startDate} onChange={setStartDate} />
          <DatePickerField label="To date" value={endDate} onChange={setEndDate} />
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
            {filteredTasks.length} records
          </div>
        </div>
      </section>

      {loading ? (
        <LoadingSkeleton className="h-64 rounded-3xl" />
      ) : error ? (
        <ErrorState title="Failed to load history" message={error} onRetry={loadHistory} />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon="history"
          title="No completed tasks"
          message="Try adjusting your date/type filters."
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableHeader>Task code</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Customer</TableHeader>
              <TableHeader>Completed at</TableHeader>
              <TableHeader>Due date</TableHeader>
              <TableHeader>Action</TableHeader>
            </TableHead>
            <TableBody>
              {paginatedTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-bold text-slate-900">{task.taskCode}</TableCell>
                  <TableCell>
                    <Badge variant="neutral">{task.type}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-700">{task.customerName}</TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {task.completedAt
                      ? `${formatDdMmYy(task.completedAt)} ${new Date(task.completedAt).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {new Date(task.dueDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/staff/tasks/${task.id}`}
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredTasks.length > 0 && totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
