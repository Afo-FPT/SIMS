'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ensureChartSetup } from '../../../components/charts/chart-setup';
import { listUsers } from '../../../lib/admin.api';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { formatTime, formatDateTime } from '../../../lib/date-format';

ensureChartSetup();

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [storageRequests, setStorageRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function run(isInitialLoad: boolean) {
      try {
        if (isInitialLoad) {
          setLoading(true);
          setError(null);
        }
        const [usersRes, reqs, cycles] = await Promise.all([
          listUsers({ page: 1, limit: 50000 }),
          listStorageRequests(),
          getCycleCounts(),
        ]);
        if (cancelled) return;
        setUsers(usersRes.items || []);
        setStorageRequests(reqs || []);
        setCycleCounts(cycles || []);
        setLastUpdated(formatTime(new Date()));
      } catch (e) {
        if (!cancelled && isInitialLoad) {
          setError(e instanceof Error ? e.message : 'Failed to load admin overview');
        }
      } finally {
        if (!cancelled && isInitialLoad) {
          setLoading(false);
        }
      }
    }

    void run(true);
    pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void run(false);
      }
    }, 15000);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  const headlineStats = useMemo(() => {
    const totalBusinessUsers = users.filter((u) => ['MANAGER', 'STAFF', 'CUSTOMER'].includes(u.role)).length;
    const managers = users.filter((u) => u.role === 'MANAGER').length;
    const staff = users.filter((u) => u.role === 'STAFF').length;
    const customers = users.filter((u) => u.role === 'CUSTOMER').length;
    return {
      totalBusinessUsers,
      managers,
      staff,
      customers,
    };
  }, [users]);

  const recentLogs = useMemo(() => {
    type Row = {
      id: string;
      level: 'ERROR' | 'WARN' | 'INFO';
      action: string;
      actor: string;
      time: string;
      ts: number;
    };
    const rows: Row[] = [];
    for (const r of storageRequests) {
      const ts = new Date(r.updated_at || r.created_at).getTime();
      rows.push({
        id: r.request_id,
        level: r.status === 'REJECTED' ? 'ERROR' : r.status === 'PENDING' ? 'WARN' : 'INFO',
        action: `Storage ${r.reference || r.request_id.slice(-8)} (${r.request_type}) — ${r.status}`,
        actor: String(r.contract_code || r.contract_id || '—'),
        time: formatDateTime(r.updated_at || r.created_at),
        ts,
      });
    }
    for (const c of cycleCounts) {
      const ts = new Date(c.updated_at || c.created_at).getTime();
      const st = String(c.status);
      rows.push({
        id: c.cycle_count_id,
        level: st === 'REJECTED' || st === 'ADJUSTMENT_REQUESTED' ? 'WARN' : 'INFO',
        action: `Cycle count ${c.cycle_count_id.slice(-8).toUpperCase()} — ${st}`,
        actor: String(c.contract_code || '—'),
        time: formatDateTime(c.updated_at || c.created_at),
        ts,
      });
    }
    return rows.sort((a, b) => b.ts - a.ts).slice(0, 10);
  }, [storageRequests, cycleCounts]);

  if (loading) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h1>
        </div>
        <LoadingSkeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h1>
        </div>
        <ErrorState title="Failed to load data" message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h1>
        <p className="mt-1 text-xs text-slate-500">Last updated: {lastUpdated ?? '--:--:--'}</p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-2xl">people</span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Total users</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">{headlineStats.totalBusinessUsers}</p>
            <p className="mt-2 text-xs text-slate-500">Manager + Staff + Customer</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                <span className="material-symbols-outlined text-2xl">pending_actions</span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Managers</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">{headlineStats.managers}</p>
            <p className="mt-2 text-xs text-slate-500">Total manager accounts</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <span className="material-symbols-outlined text-2xl">contract</span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Staff</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">{headlineStats.staff}</p>
            <p className="mt-2 text-xs text-slate-500">Total staff accounts</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
                <span className="material-symbols-outlined text-2xl">bug_report</span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Customers</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">{headlineStats.customers}</p>
            <p className="mt-2 text-xs text-slate-500">Total customer accounts</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">
            <h2 className="text-xl font-black tracking-tight text-slate-900">Recent activity</h2>
          </div>
          <Table>
            <TableHead>
              <TableHeader>Level</TableHeader>
              <TableHeader>Action</TableHeader>
              <TableHeader>Context</TableHeader>
              <TableHeader>Time</TableHeader>
            </TableHead>
            <TableBody>
              {recentLogs.length === 0 ? (
                <TableRow>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                    No activity yet.
                  </td>
                </TableRow>
              ) : (
                recentLogs.map((log, idx) => (
                  <TableRow key={`${log.id}-${idx}`}>
                    <TableCell>
                      <Badge variant={log.level === 'ERROR' ? 'error' : log.level === 'WARN' ? 'warning' : 'info'}>
                        {log.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md font-medium text-slate-900">
                      <span title={log.action}>{log.action}</span>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      <span title={log.actor}>{log.actor}</span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{log.time}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </div>
  );
}
