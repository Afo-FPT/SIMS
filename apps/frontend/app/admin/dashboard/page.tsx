'use client';

import React, { useState, useEffect } from 'react';
import type { AdminStats } from '../../../types/admin';
import { getAdminStats } from '../../../lib/mockApi/admin.api';
import { useToast } from '../../../lib/toast';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';

export default function AdminDashboard() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
      showToast('error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 mt-1">System monitoring & statistics</p>
        </div>
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 mt-1">System monitoring & statistics</p>
        </div>
        <ErrorState title="Failed to load dashboard" message={error} onRetry={loadStats} />
      </div>
    );
  }

  if (!stats) return null;

  const recentLogs = [
    { id: '1', level: 'INFO', action: 'User login', actor: 'admin@swsms.ai', time: '2 min ago' },
    { id: '2', level: 'WARN', action: 'API rate limit', actor: 'system', time: '15 min ago' },
    { id: '3', level: 'INFO', action: 'User created', actor: 'admin@swsms.ai', time: '1 hour ago' },
    { id: '4', level: 'ERROR', action: 'Database connection', actor: 'system', time: '2 hours ago' },
    { id: '5', level: 'INFO', action: 'Config updated', actor: 'admin@swsms.ai', time: '3 hours ago' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h1>
        <p className="text-slate-500 mt-1">System monitoring & statistics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Logs today</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.todayLogs}</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <span className="material-symbols-outlined text-2xl">error</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Errors today</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.todayErrors}</p>
        </div>
      </div>

      {/* Health Status */}
      {stats.health && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Health status</h2>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-700">API:</span>
              <Badge variant={stats.health.api === 'OK' ? 'success' : 'error'}>
                {stats.health.api}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-700">DB:</span>
              <Badge variant={stats.health.db === 'OK' ? 'success' : 'error'}>
                {stats.health.db}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-700">Queue:</span>
              <Badge variant={stats.health.queue === 'OK' ? 'success' : 'error'}>
                {stats.health.queue}
              </Badge>
            </div>
          </div>
        </section>
      )}

      {/* Recent Logs */}
      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <h2 className="text-lg font-black text-slate-900 p-6 pb-0">Recent activity</h2>
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
