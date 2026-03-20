'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { listUsers } from '../../../lib/mockApi/admin.api';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [storageRequests, setStorageRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersRes, requests, cycles] = await Promise.all([
        listUsers({ page: 1, limit: 2000 }),
        listStorageRequests(),
        getCycleCounts(),
      ]);
      setUsers(usersRes.items || []);
      setStorageRequests(requests);
      setCycleCounts(cycles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const activeUsers = users.filter((u) => !u.locked && (u.status === 'ACTIVE' || u.status === 'active')).length;
    const lockedUsers = users.filter((u) => u.locked || u.status === 'LOCKED').length;
    const apiEvents24h = storageRequests.length + cycleCounts.length;
    const errors24h = storageRequests.filter((r) => r.status === 'REJECTED').length + cycleCounts.filter((c) => c.status === 'ADJUSTMENT_REQUESTED').length;
    return {
      totalUsers: users.length,
      activeUsers,
      lockedUsers,
      apiEvents24h,
      errors24h,
      failedLogins: 0,
    };
  }, [users, storageRequests, cycleCounts]);

  const recentLogs = [...storageRequests.slice(0, 3).map((r) => ({
    id: r.request_id,
    level: r.status === 'REJECTED' ? 'ERROR' : r.status === 'PENDING' ? 'WARN' : 'INFO',
    action: `Storage request ${r.reference || r.request_id.slice(-8)} (${r.request_type})`,
    actor: r.contract_code || r.contract_id,
    time: new Date(r.updated_at || r.created_at).toLocaleString('en-GB'),
  })),
  ...cycleCounts.slice(0, 2).map((c) => ({
    id: c.cycle_count_id,
    level: c.status === 'ADJUSTMENT_REQUESTED' ? 'WARN' : 'INFO',
    action: `Cycle count ${c.cycle_count_id.slice(-8).toUpperCase()} (${c.status})`,
    actor: c.contract_code,
    time: new Date(c.updated_at || c.created_at).toLocaleString('en-GB'),
  }))];

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">System overview, health checks, usage analytics, logs, and governance modules</p>
        </div>
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">System overview, health checks, usage analytics, logs, and governance modules</p>
        </div>
        <ErrorState title="Failed to load dashboard" message={error} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">System overview, health checks, usage analytics, logs, and governance modules</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">people</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total users</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.totalUsers}</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Active users</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.activeUsers}</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-600">
              <span className="material-symbols-outlined text-2xl">lock</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Locked users</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.lockedUsers}</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">API events (24h)</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.apiEvents24h}</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <span className="material-symbols-outlined text-2xl">error</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Errors (24h)</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.errors24h}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-600">
              <span className="material-symbols-outlined text-2xl">shield_locked</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Failed logins</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.failedLogins}</p>
        </div>
      </div>

      {/* Recent Logs */}
      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Recent Activity</h2>
        </div>
        <Table>
          <TableHead>
            <TableHeader>Level</TableHeader>
            <TableHeader>Action</TableHeader>
            <TableHeader>Actor</TableHeader>
            <TableHeader>Time</TableHeader>
          </TableHead>
          <TableBody>
            {recentLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge
                    variant={
                      log.level === 'ERROR'
                        ? 'error'
                        : log.level === 'WARN'
                          ? 'warning'
                          : 'info'
                    }
                  >
                    {log.level}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-slate-900">{log.action}</TableCell>
                <TableCell className="text-slate-600">{log.actor}</TableCell>
                <TableCell className="text-slate-500 text-sm">{log.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
