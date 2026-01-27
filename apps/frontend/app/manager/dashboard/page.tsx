'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { ManagerDashboardStats } from '../../../types/manager';
import {
  getManagerDashboardStats,
  listServiceRequests,
  listTasks,
} from '../../../lib/mockApi/manager.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ManagerDashboard() {
  const toast = useToastHelpers();
  const [stats, setStats] = useState<ManagerDashboardStats | null>(null);
  const [serviceRequests, setServiceRequests] = useState<Awaited<ReturnType<typeof listServiceRequests>>>([]);
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof listTasks>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, sr, t] = await Promise.all([
        getManagerDashboardStats(),
        listServiceRequests(),
        listTasks(),
      ]);
      setStats(s);
      setServiceRequests(sr);
      setTasks(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Operations overview</p>
        </div>
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Operations overview</p>
        </div>
        <ErrorState title="Failed to load dashboard" message={error || 'Unknown error'} onRetry={loadData} />
      </div>
    );
  }

  const recentService = serviceRequests
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const recentTasks = tasks
    .filter((t) => t.status !== 'CANCELLED')
    .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1">Operations overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Contracts active</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.contractsActive}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-2xl">view_agenda</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Shelves occupied</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.shelvesOccupied}</p>
          <p className="text-xs text-slate-500 mt-1">{stats.shelvesAvailable} available</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <span className="material-symbols-outlined text-2xl">pending_actions</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Service requests pending</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.serviceRequestsPending}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined text-2xl">assignment</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Tasks in progress</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.tasksInProgress}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-600">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Discrepancies pending</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.discrepanciesPendingApproval}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-6 pb-0">
            <h2 className="text-lg font-black text-slate-900">Recent service requests</h2>
            <Link href="/manager/service-requests" className="text-sm font-bold text-primary hover:underline">
              View all
            </Link>
          </div>
          {recentService.length === 0 ? (
            <EmptyState icon="local_shipping" title="No service requests" message="No recent requests" />
          ) : (
            <Table>
              <TableHead>
                <TableHeader>Request</TableHeader>
                <TableHeader>Customer</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Preferred</TableHeader>
              </TableHead>
              <TableBody>
                {recentService.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-bold text-slate-900">{r.id}</TableCell>
                    <TableCell className="text-slate-700">{r.customerName || '—'}</TableCell>
                    <TableCell><Badge variant="neutral">{r.type}</Badge></TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === 'Completed' ? 'success' : r.status === 'Processing' ? 'info' : r.status === 'Rejected' ? 'error' : 'warning'
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">{r.preferredDate} {r.preferredTime || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-6 pb-0">
            <h2 className="text-lg font-black text-slate-900">Recent tasks</h2>
            <Link href="/manager/tasks" className="text-sm font-bold text-primary hover:underline">
              View all
            </Link>
          </div>
          {recentTasks.length === 0 ? (
            <EmptyState icon="assignment" title="No tasks" message="No recent tasks" />
          ) : (
            <Table>
              <TableHead>
                <TableHeader>Task</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Assigned</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Due</TableHeader>
              </TableHead>
              <TableBody>
                {recentTasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-bold text-slate-900">{t.taskCode}</TableCell>
                    <TableCell><Badge variant="neutral">{t.type}</Badge></TableCell>
                    <TableCell className="text-slate-700">{t.assignedToStaffName || '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          t.status === 'COMPLETED' ? 'success' : t.status === 'IN_PROGRESS' ? 'info' : 'warning'
                        }
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">{new Date(t.dueDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </div>
  );
}
