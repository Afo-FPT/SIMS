'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Chart as ChartJSComponent } from 'react-chartjs-2';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJSCore,
  Legend as ChartLegend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
} from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import { Input } from '../../../components/ui/Input';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];
ChartJSCore.register(
  ArcElement,
  BarElement,
  CategoryScale,
  ChartLegend,
  LineElement,
  LinearScale,
  PointElement,
  ChartTooltip,
);
type ReportTab = 'performance' | 'history' | 'discrepancy' | 'cycle' | 'workload';

function dayKey(ts: string): string {
  return new Date(ts).toLocaleDateString('en-GB', { weekday: 'short' });
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function StaffReportsPage() {
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return toIsoDate(d);
  });
  const [endDate, setEndDate] = useState(() => toIsoDate(new Date()));
  const [activeQuickRange, setActiveQuickRange] = useState<'30' | '90'>('90');
  const [tab, setTab] = useState<ReportTab>('performance');
  const [requests, setRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function run() {
      try {
        if (!hasLoaded) setLoading(true);
        setError(null);
        const [req, cc] = await Promise.all([listStorageRequests(), getCycleCounts()]);
        if (cancelled) return;
        setRequests(req);
        setCycleCounts(cc);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load reports');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHasLoaded(true);
        }
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void run();
      }
    };

    void run();
    pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void run();
      }
    }, 30000);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [hasLoaded]);

  const filteredRequests = useMemo(() => {
    const from = new Date(startDate).getTime();
    const to = new Date(endDate).getTime() + 86399999;
    return requests.filter((r) => {
      const t = new Date(r.updated_at || r.created_at).getTime();
      return t >= from && t <= to;
    });
  }, [requests, startDate, endDate]);

  const filteredCycleCounts = useMemo(() => {
    const from = new Date(startDate).getTime();
    const to = new Date(endDate).getTime() + 86399999;
    return cycleCounts.filter((c) => {
      const t = new Date(c.updated_at || c.created_at).getTime();
      return t >= from && t <= to;
    });
  }, [cycleCounts, startDate, endDate]);

  const completion = useMemo(() => {
    const total = filteredRequests.length + filteredCycleCounts.length;
    const completed = filteredRequests.filter((r) => r.status === 'COMPLETED').length + filteredCycleCounts.filter((c) => c.status === 'CONFIRMED').length;
    const inProgress = filteredRequests.filter((r) => r.status === 'APPROVED' || r.status === 'DONE_BY_STAFF').length + filteredCycleCounts.filter((c) => c.status === 'STAFF_SUBMITTED').length;
    const pending = Math.max(0, total - completed - inProgress);
    const ratio = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, inProgress, pending, ratio };
  }, [filteredRequests, filteredCycleCounts]);

  const inOutPerDay = useMemo(() => {
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const base = weekdays.map((d) => ({ day: d, inbound: 0, outbound: 0, cycle: 0 }));
    const byDay = new Map(base.map((d) => [d.day, d]));
    filteredRequests.forEach((r) => {
      const day = dayKey(r.updated_at || r.created_at);
      const row = byDay.get(day);
      if (!row) return;
      const qty = r.items.reduce((sum: number, i: any) => sum + (i.quantity_actual ?? i.quantity_requested ?? 0), 0);
      if (r.request_type === 'IN') row.inbound += qty;
      else row.outbound += qty;
    });
    filteredCycleCounts.forEach((c) => {
      const day = dayKey(c.updated_at || c.created_at);
      const row = byDay.get(day);
      if (!row) return;
      row.cycle += (c.items || c.target_items || []).length;
    });
    return base;
  }, [filteredRequests, filteredCycleCounts]);

  const operationHistory = useMemo(() => {
    return inOutPerDay.map((d, index) => ({
      ...d,
      seq: index + 1,
      totalOps: d.inbound + d.outbound + d.cycle,
    }));
  }, [inOutPerDay]);

  const discrepancySummary = useMemo(() => {
    const damaged = filteredRequests.reduce((sum, r) => sum + r.items.reduce((s: number, i: any) => s + (i.damage_quantity || 0), 0), 0);
    const mismatch = filteredCycleCounts.reduce((sum, c) => sum + (c.items || []).reduce((s: number, i: any) => s + Math.abs(i.discrepancy || 0), 0), 0);
    const location = filteredRequests.filter((r) => r.status === 'REJECTED').length;
    return [
      { name: 'Damaged', value: damaged },
      { name: 'Quantity mismatch', value: mismatch },
      { name: 'Location/flow issue', value: location },
    ];
  }, [filteredRequests, filteredCycleCounts]);

  const cycleAccuracy = useMemo(() => {
    return filteredCycleCounts.map((c) => {
      const system = (c.items || []).reduce((s: number, i: any) => s + (i.system_quantity || 0), 0);
      const actual = (c.items || []).reduce((s: number, i: any) => s + (i.counted_quantity || 0), 0);
      const accuracy = system === 0 ? 100 : Math.max(0, Math.round(100 - (Math.abs(system - actual) / system) * 100));
      return {
        id: c.cycle_count_id.slice(-6).toUpperCase(),
        system,
        actual,
        accuracy,
      };
    });
  }, [filteredCycleCounts]);

  const taskTypeDistribution = useMemo(() => {
    const inbound = filteredRequests.filter((r) => r.request_type === 'IN').length;
    const outbound = filteredRequests.filter((r) => r.request_type === 'OUT').length;
    const cycleCount = filteredCycleCounts.length;
    return [
      { name: 'Inbound tasks', value: inbound },
      { name: 'Outbound tasks', value: outbound },
      { name: 'Cycle count tasks', value: cycleCount },
    ];
  }, [filteredRequests, filteredCycleCounts]);

  const workloadByStatus = useMemo(() => {
    const requestPending = filteredRequests.filter((r) => r.status === 'PENDING').length;
    const requestInProgress = filteredRequests.filter((r) => r.status === 'APPROVED' || r.status === 'DONE_BY_STAFF').length;
    const requestCompleted = filteredRequests.filter((r) => r.status === 'COMPLETED').length;

    const cyclePending = filteredCycleCounts.filter((c) => c.status === 'PENDING').length;
    const cycleInProgress = filteredCycleCounts.filter((c) => c.status === 'APPROVED' || c.status === 'STAFF_SUBMITTED').length;
    const cycleCompleted = filteredCycleCounts.filter((c) => c.status === 'CONFIRMED').length;

    return [
      { status: 'Pending', requests: requestPending, cycleCounts: cyclePending },
      { status: 'In progress', requests: requestInProgress, cycleCounts: cycleInProgress },
      { status: 'Completed', requests: requestCompleted, cycleCounts: cycleCompleted },
    ];
  }, [filteredRequests, filteredCycleCounts]);

  const quickRangeClass = (key: '30' | '90') =>
    `px-4 py-2.5 text-sm font-bold transition-colors ${
      activeQuickRange === key ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'
    }`;

  const applyQuickRange = (days: 30 | 90) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(toIsoDate(start));
    setEndDate(toIsoDate(end));
    setActiveQuickRange(days === 30 ? '30' : '90');
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Reports</h1>
          <p className="text-slate-500 mt-1">Personal performance, operations history, discrepancies, and cycle-count quality</p>
        </div>
        <LoadingSkeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (error) return <ErrorState title="Failed to load staff reports" message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Reports</h1>
        <p className="text-slate-500 mt-1">Personal performance, operations history, discrepancies, and cycle-count quality</p>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Report Filters</h2>
            <p className="text-sm text-slate-500 mt-1">Adjust time range for all staff report modules</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">From date</p>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-auto bg-white" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">To date</p>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-auto bg-white" />
            </div>
            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button type="button" onClick={() => applyQuickRange(30)} className={quickRangeClass('30')}>
                Last 30 days
              </button>
              <button type="button" onClick={() => applyQuickRange(90)} className={quickRangeClass('90')}>
                Last 90 days
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          ['performance', 'Performance'],
          ['history', 'Operation History'],
          ['discrepancy', 'Discrepancy'],
          ['cycle', 'Cycle Count'],
          ['workload', 'Task Workload Overview'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id as ReportTab)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
              tab === id ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'performance' && (
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">Personal Daily Performance Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <KpiCard title="Completed today" value={completion.completed} />
          <KpiCard title="In progress" value={completion.inProgress} />
          <KpiCard title="Pending" value={completion.pending} />
          <KpiCard title="Completion rate" value={`${completion.ratio}%`} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72">
            <Bar
              data={{
                labels: inOutPerDay.map((d) => d.day),
                datasets: [
                  {
                    label: 'Inbound',
                    data: inOutPerDay.map((d) => d.inbound),
                    backgroundColor: '#0ea5e9',
                  },
                  {
                    label: 'Outbound',
                    data: inOutPerDay.map((d) => d.outbound),
                    backgroundColor: '#6366f1',
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { x: { ticks: { autoSkip: false } }, y: { beginAtZero: true } },
              }}
            />
          </div>
          <div className="flex items-center justify-center">
            <div className="w-56">
              <div className="relative h-4 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${completion.ratio}%` }} />
              </div>
              <p className="text-center mt-3 text-2xl font-black text-slate-900">{completion.ratio}%</p>
              <p className="text-center text-sm text-slate-500">Gauge: completion rate</p>
            </div>
          </div>
        </div>
      </section>
      )}

      {tab === 'history' && (
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">Personal Operation History Report</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72">
            <Line
              data={{
                labels: operationHistory.map((d) => d.day),
                datasets: [
                  {
                    label: 'Total operations',
                    data: operationHistory.map((d) => d.totalOps),
                    borderColor: '#0ea5e9',
                    backgroundColor: '#0ea5e9',
                    tension: 0.3,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
          <div className="h-72">
            <Bar
              data={{
                labels: operationHistory.map((d) => d.day),
                datasets: [
                  {
                    label: 'Inbound',
                    data: operationHistory.map((d) => d.inbound),
                    backgroundColor: '#0ea5e9',
                    stack: 'ops',
                  },
                  {
                    label: 'Outbound',
                    data: operationHistory.map((d) => d.outbound),
                    backgroundColor: '#6366f1',
                    stack: 'ops',
                  },
                  {
                    label: 'Cycle count',
                    data: operationHistory.map((d) => d.cycle),
                    backgroundColor: '#22c55e',
                    stack: 'ops',
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                  x: { stacked: true, ticks: { autoSkip: false } },
                  y: { stacked: true, beginAtZero: true },
                },
              }}
            />
          </div>
        </div>
      </section>
      )}

      {tab === 'discrepancy' && (
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">Discrepancy & Issue Summary Report</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72">
            <Pie
              data={{
                labels: discrepancySummary.map((d) => d.name),
                datasets: [
                  {
                    data: discrepancySummary.map((d) => d.value),
                    backgroundColor: discrepancySummary.map((_, i) => COLORS[i % COLORS.length]),
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
              }}
            />
          </div>
          <div className="h-72">
            <Bar
              data={{
                labels: discrepancySummary.map((d) => d.name),
                datasets: [
                  {
                    label: 'Count',
                    data: discrepancySummary.map((d) => d.value),
                    backgroundColor: '#f59e0b',
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
        </div>
      </section>
      )}

      {tab === 'cycle' && (
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">Cycle Count Execution Report</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72">
            <Bar
              data={{
                labels: cycleAccuracy.map((d) => d.id),
                datasets: [
                  {
                    label: 'System',
                    data: cycleAccuracy.map((d) => d.system),
                    backgroundColor: '#0ea5e9',
                  },
                  {
                    label: 'Actual',
                    data: cycleAccuracy.map((d) => d.actual),
                    backgroundColor: '#22c55e',
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
          <div className="space-y-3">
            {cycleAccuracy.slice(0, 6).map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-slate-900">Cycle {row.id}</p>
                  <p className="text-sm font-bold text-slate-700">{row.accuracy}%</p>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`${row.accuracy >= 95 ? 'bg-emerald-500' : row.accuracy >= 80 ? 'bg-amber-500' : 'bg-red-500'} h-full`} style={{ width: `${row.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {tab === 'workload' && (
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">Task Workload Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72">
            <Pie
              data={{
                labels: taskTypeDistribution.map((d) => d.name),
                datasets: [
                  {
                    data: taskTypeDistribution.map((d) => d.value),
                    backgroundColor: taskTypeDistribution.map((_, i) => COLORS[i % COLORS.length]),
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
              }}
            />
          </div>
          <div className="h-72">
            <Bar
              data={{
                labels: workloadByStatus.map((d) => d.status),
                datasets: [
                  {
                    label: 'Storage requests',
                    data: workloadByStatus.map((d) => d.requests),
                    backgroundColor: '#0ea5e9',
                  },
                  {
                    label: 'Cycle counts',
                    data: workloadByStatus.map((d) => d.cycleCounts),
                    backgroundColor: '#22c55e',
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
        </div>
      </section>
      )}
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs uppercase font-black tracking-wider text-slate-500">{title}</p>
      <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
    </div>
  );
}
