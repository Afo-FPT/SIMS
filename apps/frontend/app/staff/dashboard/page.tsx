'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { StaffTask } from '../../../types/staff';
import { listStaffTasks } from '../../../lib/mockApi/staff.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function StaffDashboard() {
  const toast = useToastHelpers();
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await listStaffTasks({ limit: 100 });
      setTasks(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
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
          <p className="text-slate-500 mt-1">Your work status and recent tasks</p>
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
          <p className="text-slate-500 mt-1">Your work status and recent tasks</p>
        </div>
        <ErrorState title="Failed to load dashboard" message={error} onRetry={loadData} />
      </div>
    );
  }

  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completedToday = tasks.filter(
    (t) =>
      t.status === 'COMPLETED' &&
      t.completedAt &&
      new Date(t.completedAt).toDateString() === new Date().toDateString()
  ).length;
  const discrepancies = 1; // Mock count

  const recentTasks = tasks
    .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1">Your work status and recent tasks</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">assignment</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Total tasks
            </h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{totalTasks}</p>
          <p className="text-xs text-slate-500 mt-1">Tasks assigned to you</p>
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
          <p className="text-xs text-slate-500 mt-1">Tasks you're working on</p>
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
          <p className="text-xs text-slate-500 mt-1">Tasks finished today</p>
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
          <p className="text-xs text-slate-500 mt-1">Issues reported</p>
        </div>
      </div>

      {/* Recent Tasks */}
      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-lg font-black text-slate-900">Recent tasks</h2>
          <Link
            href="/staff/tasks"
            className="text-sm font-bold text-primary hover:text-primary-dark"
          >
            View all
          </Link>
        </div>
        {recentTasks.length === 0 ? (
          <EmptyState
            icon="assignment"
            title="No tasks yet"
            message="You don't have any tasks assigned"
          />
        ) : (
          <Table>
            <TableHead>
              <TableHeader>Task code</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Due date</TableHeader>
              <TableHeader>Action</TableHeader>
            </TableHead>
            <TableBody>
              {recentTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-bold text-slate-900">{task.taskCode}</TableCell>
                  <TableCell>
                    <Badge variant="neutral">{task.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        task.status === 'COMPLETED'
                          ? 'success'
                          : task.status === 'IN_PROGRESS'
                            ? 'info'
                            : 'warning'
                      }
                    >
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/staff/tasks/${task.id}`}
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
