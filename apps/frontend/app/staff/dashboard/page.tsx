'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToastHelpers } from '../../../lib/toast';
import {
  listStorageRequests,
  type StorageRequestView,
} from '../../../lib/storage-requests.api';
import { getCycleCounts, type CycleCountResponse } from '../../../lib/cycle-count.api';
import { Badge } from '../../../components/ui/Badge';
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '../../../components/ui/Table';
import { Pagination } from '../../../components/ui/Pagination';
import { TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function StaffDashboard() {
  const ITEMS_PER_PAGE = 5;
  const toast = useToastHelpers();
  const [requests, setRequests] = useState<StorageRequestView[]>([]);
  const [cycleCounts, setCycleCounts] = useState<CycleCountResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [requestPage, setRequestPage] = useState(1);
  const [cyclePage, setCyclePage] = useState(1);

  useEffect(() => {
    void loadData(true);
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') void loadData(false);
    }, 15000);
    return () => clearInterval(poll);
  }, []);

  const loadData = async (isInitial: boolean) => {
    try {
      if (isInitial) {
        setLoading(true);
        setError(null);
      }
      const [reqs, cycles] = await Promise.all([
        listStorageRequests(),
        getCycleCounts(),
      ]);
      setRequests(reqs);
      setCycleCounts(cycles);
      setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard data';
      if (isInitial) {
        setError(msg);
        toast.error(msg);
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const reloadData = () => {
    void loadData(true);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Your work status and recent warehouse tasks</p>
        </div>
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Your work status and recent warehouse tasks</p>
        </div>
        <ErrorState title="Failed to load dashboard" message={error} onRetry={reloadData} />
      </div>
    );
  }

  const today = new Date().toDateString();
  const totalTasks = requests.length;
  const inProgressTasks = requests.filter(
    (r) => r.status === 'APPROVED' || r.status === 'DONE_BY_STAFF',
  ).length;
  const pendingTasks = requests.filter((r) => r.status === 'PENDING').length;
  const completedToday = requests.filter(
    (r) =>
      (r.status === 'DONE_BY_STAFF' || r.status === 'COMPLETED') &&
      new Date(r.updated_at).toDateString() === today,
  ).length;
  const discrepancyTasks = cycleCounts.filter(
    (c) =>
      (c.status === 'COMPLETED' || c.status === 'STAFF_SUBMITTED') &&
      (c.items || c.target_items || []).some(
        (it: any) => typeof it.discrepancy === 'number' && it.discrepancy !== 0,
      ),
  ).length;
  const assignedCycleCounts = cycleCounts.filter((c) => c.status !== 'CONFIRMED').length;

  const recentTasksAll = [...requests]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 50);
  const recentCycleAll = [...cycleCounts]
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 50);

  const requestTotalPages = Math.max(1, Math.ceil(recentTasksAll.length / ITEMS_PER_PAGE));
  const cycleTotalPages = Math.max(1, Math.ceil(recentCycleAll.length / ITEMS_PER_PAGE));
  const recentTasks = recentTasksAll.slice((requestPage - 1) * ITEMS_PER_PAGE, requestPage * ITEMS_PER_PAGE);
  const recentCycles = recentCycleAll.slice((cyclePage - 1) * ITEMS_PER_PAGE, cyclePage * ITEMS_PER_PAGE);

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString('en-GB', {
      dateStyle: 'short',
      timeStyle: 'short',
      });
    } catch {
      return s;
    }
  };

  const statusVariant = (status: StorageRequestView['status']) => {
    switch (status) {
      case 'APPROVED':
        return 'info' as const;
      case 'DONE_BY_STAFF':
      case 'COMPLETED':
        return 'success' as const;
      case 'REJECTED':
        return 'error' as const;
      default:
        return 'warning' as const;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Dashboard</h1>
        </div>
        <button
          type="button"
          onClick={reloadData}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-primary"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          Refresh data
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-primary p-6 text-white shadow-lg md:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/70">Today focus</p>
            <h2 className="text-2xl font-black leading-snug tracking-tight">
              Finish assigned operations and close discrepancy risks before shift end
            </h2>
            <p className="text-sm text-white/75">
              Prioritize pending requests first, then resolve in-progress tasks and cycle count mismatches.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:col-span-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/75">Assigned tasks</p>
              <p className="mt-2 text-3xl font-black">{totalTasks}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/75">Pending</p>
              <p className="mt-2 text-3xl font-black">{pendingTasks}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/75">In progress</p>
              <p className="mt-2 text-3xl font-black">{inProgressTasks}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/75">Done today</p>
              <p className="mt-2 text-3xl font-black">{completedToday}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">Quick actions</h2>
            <Badge variant={discrepancyTasks > 0 ? 'warning' : 'success'}>
              Discrepancies {discrepancyTasks}
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/staff/inbound-requests" className="rounded-2xl border border-slate-200 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inbound tasks</p>
              <p className="mt-2 text-xl font-black text-slate-900">{requests.filter((r) => r.request_type === 'IN').length}</p>
              <p className="mt-1 text-xs text-slate-500">Putaway queue</p>
            </Link>
            <Link href="/staff/outbound-requests" className="rounded-2xl border border-slate-200 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Outbound tasks</p>
              <p className="mt-2 text-xl font-black text-slate-900">{requests.filter((r) => r.request_type === 'OUT').length}</p>
              <p className="mt-1 text-xs text-slate-500">Picking queue</p>
            </Link>
            <Link href="/staff/cycle-count" className="rounded-2xl border border-slate-200 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cycle counts</p>
              <p className="mt-2 text-xl font-black text-slate-900">{assignedCycleCounts}</p>
              <p className="mt-1 text-xs text-slate-500">Pending confirmations</p>
            </Link>
            <Link href="/staff/tasks" className="rounded-2xl border border-slate-200 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Task center</p>
              <p className="mt-2 text-xl font-black text-slate-900">{inProgressTasks}</p>
              <p className="mt-1 text-xs text-slate-500">Continue running tasks</p>
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-slate-900">Needs attention</h2>
          <div className="space-y-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Pending tasks</p>
              <p className="mt-1 text-2xl font-black text-amber-700">{pendingTasks}</p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">In progress</p>
              <p className="mt-1 text-2xl font-black text-blue-700">{inProgressTasks}</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Discrepancy tasks</p>
              <p className="mt-1 text-2xl font-black text-red-700">{discrepancyTasks}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-6">
          <h2 className="text-lg font-black text-slate-900">Recent storage tasks</h2>
          <Link href="/staff/tasks" className="text-sm font-bold text-primary hover:underline">
            View all tasks
          </Link>
        </div>
        {recentTasksAll.length === 0 ? (
          <EmptyState
            icon="assignment"
            title="No tasks yet"
            message="You don't have any inbound or outbound requests assigned"
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableHeader>Reference</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Updated at</TableHeader>
                <TableHeader>Action</TableHeader>
              </TableHead>
              <TableBody>
                {recentTasks.map((req) => {
                  const isInbound = req.request_type === 'IN';
                  const href = isInbound
                    ? `/staff/inbound-requests/${req.request_id}`
                    : `/staff/outbound-requests/${req.request_id}`;
                  return (
                    <TableRow key={req.request_id}>
                      <TableCell className="font-bold text-slate-900">
                        {req.reference || req.request_id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">
                          {isInbound ? 'Inbound putaway' : 'Outbound picking'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(req.status)}>{req.status}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {formatDate(req.updated_at || req.created_at)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={href}
                          className="text-sm font-bold text-primary hover:underline"
                        >
                          Open
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {requestTotalPages > 1 && (
              <div className="px-6 pb-4 flex justify-end">
                <Pagination
                  currentPage={requestPage}
                  totalPages={requestTotalPages}
                  onPageChange={setRequestPage}
                />
              </div>
            )}
          </>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-6">
          <h2 className="text-lg font-black text-slate-900">Recent cycle count tasks</h2>
          <Link href="/staff/cycle-count" className="text-sm font-bold text-primary hover:underline">
            Open cycle count
          </Link>
        </div>
        {recentCycleAll.length === 0 ? (
          <EmptyState
            icon="fact_check"
            title="No cycle count tasks"
            message="You do not have cycle count work items right now."
          />
        ) : (
          <div className="space-y-3">
            <Table>
              <TableHead>
                <TableHeader>Task</TableHeader>
                <TableHeader>Contract</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Updated</TableHeader>
              </TableHead>
              <TableBody>
                {recentCycles.map((t) => (
                  <TableRow key={t.cycle_count_id}>
                    <TableCell className="font-bold text-slate-900">{t.cycle_count_id.slice(-8).toUpperCase()}</TableCell>
                    <TableCell><Badge variant="neutral">{t.contract_code || '—'}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'ADJUSTMENT_REQUESTED' ? 'error' : t.status === 'CONFIRMED' ? 'success' : 'info'}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {formatDate(t.updated_at || t.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {cycleTotalPages > 1 && (
              <div className="px-6 pb-4 flex justify-end">
                <Pagination
                  currentPage={cyclePage}
                  totalPages={cycleTotalPages}
                  onPageChange={setCyclePage}
                />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
