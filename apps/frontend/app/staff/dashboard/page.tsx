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
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function StaffDashboard() {
  const toast = useToastHelpers();
  const [requests, setRequests] = useState<StorageRequestView[]>([]);
  const [cycleCounts, setCycleCounts] = useState<CycleCountResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reqs, cycles] = await Promise.all([
        listStorageRequests(),
        getCycleCounts(),
      ]);
      setRequests(reqs);
      setCycleCounts(cycles);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
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
        <ErrorState title="Failed to load dashboard" message={error} onRetry={loadData} />
      </div>
    );
  }

  const today = new Date().toDateString();
  const totalTasks = requests.length;
  const inProgressTasks = requests.filter(
    (r) => r.status === 'APPROVED' || r.status === 'DONE_BY_STAFF',
  ).length;
  const completedToday = requests.filter(
    (r) =>
      (r.status === 'DONE_BY_STAFF' || r.status === 'COMPLETED') &&
      new Date(r.updated_at).toDateString() === today,
  ).length;
  const discrepancies = cycleCounts.filter(
    (c) =>
      c.status === 'COMPLETED' &&
      (c.items || c.target_items || []).some(
        (it: any) => typeof it.discrepancy === 'number' && it.discrepancy !== 0,
      ),
  ).length;

  const recentTasks = [...requests]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const moduleCards = [
    { title: 'Assigned Tasks', href: '/staff/tasks', icon: 'assignment' },
    { title: 'Inbound Execution', href: '/staff/inbound-requests', icon: 'inbox' },
    { title: 'Outbound Execution', href: '/staff/outbound-requests', icon: 'outbox' },
    { title: 'Inventory Update', href: '/staff/inventory', icon: 'inventory_2' },
    { title: 'Issue Reporting', href: '/staff/report-issue', icon: 'report_problem' },
    { title: 'Cycle Count', href: '/staff/cycle-count', icon: 'fact_check' },
    { title: 'Personal History', href: '/staff/history', icon: 'history' },
    { title: 'Notifications', href: '/staff/notifications', icon: 'notifications' },
    { title: 'AI Layout Suggestion', href: '/staff/inventory', icon: 'auto_awesome' },
    { title: 'Profile & Settings', href: '/staff/settings', icon: 'settings' },
  ];

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
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Dashboard</h1>
        <p className="text-slate-500 mt-1">Daily KPIs, assigned operations, and warehouse execution modules</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">assignment</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Storage tasks
            </h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{totalTasks}</p>
          <p className="text-xs text-slate-500 mt-1">
            Inbound &amp; outbound requests assigned to you
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined text-2xl">pending_actions</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              In progress
            </h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{inProgressTasks}</p>
          <p className="text-xs text-slate-500 mt-1">APPROVED or DONE_BY_STAFF</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Completed today
            </h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{completedToday}</p>
          <p className="text-xs text-slate-500 mt-1">Requests you finished today</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Discrepancies
            </h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{discrepancies}</p>
          <p className="text-xs text-slate-500 mt-1">Cycle count tasks with stock differences</p>
        </div>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">Staff Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {moduleCards.map((m) => (
            <Link key={m.title} href={m.href} className="rounded-2xl border border-slate-200 p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <span className="material-symbols-outlined">{m.icon}</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{m.title}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Tasks */}
      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-lg font-black text-slate-900">Recent storage tasks</h2>
          <div className="flex gap-3">
            <Link
              href="/staff/inbound-requests"
              className="text-sm font-bold text-primary hover:text-primary-dark"
            >
              Inbound
            </Link>
            <Link
              href="/staff/outbound-requests"
              className="text-sm font-bold text-primary hover:text-primary-dark"
            >
              Outbound
            </Link>
          </div>
        </div>
        {recentTasks.length === 0 ? (
          <EmptyState
            icon="assignment"
            title="No tasks yet"
            message="You don't have any inbound or outbound requests assigned"
          />
        ) : (
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
        )}
      </section>
    </div>
  );
}
