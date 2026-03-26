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
import { listUsers } from '../../../lib/mockApi/admin.api';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import { requestReportInsight } from '../../../lib/ai-insights.api';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Button } from '../../../components/ui/Button';
import { ChatMarkdown } from '../../../components/ChatMarkdown';

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

function toIsoLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayKey(ts: string): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
}

function weekKey(ts: string): string {
  const d = new Date(ts);
  const day = d.getDay() || 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day + 1);
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}`;
}

function monthKey(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function inDateRange(ts: string, start: string, end: string): boolean {
  const t = new Date(ts).getTime();
  const s = start ? new Date(`${start}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const e = end ? new Date(`${end}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
  return t >= s && t <= e;
}

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [storageRequests, setStorageRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);
  const [granularity, setGranularity] = useState<'day' | 'week'>('day');
  const [startDate, setStartDate] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 90);
    return toIsoLocalDate(start);
  });
  const [endDate, setEndDate] = useState(() => toIsoLocalDate(new Date()));
  const [insightsByKey, setInsightsByKey] = useState<Record<string, string>>({});
  const [insightLoadingKey, setInsightLoadingKey] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    setInsightsByKey({});
    setInsightLoadingKey(null);
    setInsightError(null);
  }, [startDate, endDate, granularity]);

  async function handleInsightRequest(chartKey: string, data: unknown) {
    try {
      setInsightError(null);
      setInsightLoadingKey(chartKey);
      const res = await requestReportInsight({ chartKey, startDate, endDate, data });
      setInsightsByKey((prev) => ({ ...prev, [chartKey]: res.insight }));
    } catch (e) {
      setInsightError(e instanceof Error ? e.message : 'Failed to generate insight');
    } finally {
      setInsightLoadingKey(null);
    }
  }

  function clearInsight(chartKey: string) {
    setInsightsByKey((prev) => {
      if (!prev[chartKey]) return prev;
      const next = { ...prev };
      delete next[chartKey];
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function run() {
      try {
        if (!hasLoaded) setLoading(true);
        setError(null);
        const [usersRes, reqs, cycles] = await Promise.all([
          listUsers({ page: 1, limit: 5000 }),
          listStorageRequests(),
          getCycleCounts(),
        ]);
        if (cancelled) return;
        setUsers(usersRes.items || []);
        setStorageRequests(reqs || []);
        setCycleCounts(cycles || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load admin reports');
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

  const filteredStorageRequests = useMemo(
    () => storageRequests.filter((r) => inDateRange(r.updated_at || r.created_at, startDate, endDate)),
    [storageRequests, startDate, endDate],
  );

  const filteredCycleCounts = useMemo(
    () => cycleCounts.filter((c) => inDateRange(c.updated_at || c.created_at, startDate, endDate)),
    [cycleCounts, startDate, endDate],
  );

  const roleDistribution = useMemo(() => {
    const roleMap = new Map<string, number>();
    users.forEach((u) => {
      roleMap.set(u.role, (roleMap.get(u.role) || 0) + 1);
    });
    return Array.from(roleMap.entries()).map(([role, value]) => ({ role, value }));
  }, [users]);

  const userGrowthByMonth = useMemo(() => {
    const map = new Map<string, { month: string; total: number; active: number; locked: number }>();
    users.forEach((u) => {
      const key = monthKey(u.createdAt || new Date().toISOString());
      if (!map.has(key)) {
        map.set(key, { month: key, total: 0, active: 0, locked: 0 });
      }
      const row = map.get(key)!;
      row.total += 1;
      if (u.status === 'ACTIVE') row.active += 1;
      else row.locked += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  }, [users]);

  const operationsTimeline = useMemo(() => {
    const keyFn = granularity === 'day' ? dayKey : weekKey;
    const map = new Map<string, { period: string; inbound: number; outbound: number; cycleCount: number; total: number }>();

    filteredStorageRequests.forEach((r) => {
      const key = keyFn(r.updated_at || r.created_at);
      if (!map.has(key)) map.set(key, { period: key, inbound: 0, outbound: 0, cycleCount: 0, total: 0 });
      const row = map.get(key)!;
      if (r.request_type === 'IN') row.inbound += 1;
      else row.outbound += 1;
      row.total += 1;
    });

    filteredCycleCounts.forEach((c) => {
      const key = keyFn(c.updated_at || c.created_at);
      if (!map.has(key)) map.set(key, { period: key, inbound: 0, outbound: 0, cycleCount: 0, total: 0 });
      const row = map.get(key)!;
      row.cycleCount += 1;
      row.total += 1;
    });

    return Array.from(map.values()).slice(-16);
  }, [filteredStorageRequests, filteredCycleCounts, granularity]);

  const completionOverview = useMemo(() => {
    const pending = filteredStorageRequests.filter((r) => r.status === 'PENDING').length + filteredCycleCounts.filter((c) => c.status === 'PENDING').length;
    const inProgress =
      filteredStorageRequests.filter((r) => r.status === 'APPROVED' || r.status === 'DONE_BY_STAFF').length +
      filteredCycleCounts.filter((c) => ['APPROVED', 'ASSIGNED', 'STAFF_SUBMITTED', 'COUNTING_IN_PROGRESS'].includes(String(c.status))).length;
    const completed = filteredStorageRequests.filter((r) => r.status === 'COMPLETED').length + filteredCycleCounts.filter((c) => c.status === 'CONFIRMED').length;
    const rejected = filteredStorageRequests.filter((r) => r.status === 'REJECTED').length + filteredCycleCounts.filter((c) => c.status === 'REJECTED').length;
    return [
      { name: 'Completed', value: completed },
      { name: 'In Progress', value: inProgress },
      { name: 'Pending', value: pending },
      { name: 'Rejected', value: rejected },
    ];
  }, [filteredStorageRequests, filteredCycleCounts]);

  const completionRateByPeriod = useMemo(() => {
    const keyFn = granularity === 'day' ? dayKey : weekKey;
    const map = new Map<string, { period: string; total: number; completed: number; pending: number; rejected: number; completionRate: number }>();

    const addRecord = (period: string, status: string) => {
      if (!map.has(period)) {
        map.set(period, { period, total: 0, completed: 0, pending: 0, rejected: 0, completionRate: 0 });
      }
      const row = map.get(period)!;
      row.total += 1;
      const normalized = String(status || '').toUpperCase();
      if (normalized === 'COMPLETED' || normalized === 'CONFIRMED') row.completed += 1;
      else if (normalized === 'REJECTED') row.rejected += 1;
      else row.pending += 1;
    };

    filteredStorageRequests.forEach((r) => addRecord(keyFn(r.updated_at || r.created_at), r.status));
    filteredCycleCounts.forEach((c) => addRecord(keyFn(c.updated_at || c.created_at), c.status));

    return Array.from(map.values())
      .map((row) => ({ ...row, completionRate: row.total > 0 ? Number(((row.completed / row.total) * 100).toFixed(1)) : 0 }))
      .slice(-16);
  }, [filteredStorageRequests, filteredCycleCounts, granularity]);

  if (loading) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reports</h1>
          <p className="text-slate-500 mt-1">User, operations, completion, and governance analytics</p>
        </div>
        <LoadingSkeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (error) return <ErrorState title="Failed to load admin reports" message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reports</h1>
          <p className="text-slate-500 mt-1">User, operations, completion, and governance analytics</p>
        </div>
        <div className="flex items-end gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">From date</p>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">To date</p>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Granularity</p>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as 'day' | 'week')}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
            </select>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-7 md:p-8 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-6">User & Role Overview</h2>
        {insightError && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">
            {insightError}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-10 right-0 z-10"
              isLoading={insightLoadingKey === 'admin_role_distribution'}
              disabled={insightLoadingKey !== null && insightLoadingKey !== 'admin_role_distribution'}
              onClick={() => handleInsightRequest('admin_role_distribution', { roleDistribution })}
            >
              Insight
            </Button>
            <Pie
              data={{
                labels: roleDistribution.map((d) => d.role),
                datasets: [
                  {
                    data: roleDistribution.map((d) => d.value),
                    backgroundColor: roleDistribution.map((_, i) => COLORS[i % COLORS.length]),
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                },
              }}
            />
          </div>
          <div className="h-80 relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-10 right-0 z-10"
              isLoading={insightLoadingKey === 'admin_user_growth'}
              disabled={insightLoadingKey !== null && insightLoadingKey !== 'admin_user_growth'}
              onClick={() => handleInsightRequest('admin_user_growth', { userGrowthByMonth })}
            >
              Insight
            </Button>
            <Line
              data={{
                labels: userGrowthByMonth.map((d) => d.month),
                datasets: [
                  {
                    label: 'New users',
                    data: userGrowthByMonth.map((d) => d.total),
                    borderColor: '#0ea5e9',
                    backgroundColor: '#0ea5e9',
                    tension: 0.3,
                  },
                  {
                    label: 'Active users',
                    data: userGrowthByMonth.map((d) => d.active),
                    borderColor: '#22c55e',
                    backgroundColor: '#22c55e',
                    tension: 0.3,
                  },
                  {
                    label: 'Locked users',
                    data: userGrowthByMonth.map((d) => d.locked),
                    borderColor: '#ef4444',
                    backgroundColor: '#ef4444',
                    tension: 0.3,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                },
                scales: { x: { ticks: { maxTicksLimit: 8 } } },
              }}
            />

          </div>
        </div>
        {(insightsByKey.admin_role_distribution || insightsByKey.admin_user_growth) && (
          <div className="mt-6 space-y-3">
            {insightsByKey.admin_role_distribution && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                  <Button variant="ghost" size="sm" onClick={() => clearInsight('admin_role_distribution')}>
                    Clear
                  </Button>
                </div>
                <ChatMarkdown role="model" content={insightsByKey.admin_role_distribution} />
              </div>
            )}
            {insightsByKey.admin_user_growth && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                  <Button variant="ghost" size="sm" onClick={() => clearInsight('admin_user_growth')}>
                    Clear
                  </Button>
                </div>
                <ChatMarkdown role="model" content={insightsByKey.admin_user_growth} />
              </div>
            )}
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-7 md:p-8 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-6">System Operations Volume</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-10 right-0 z-10"
              isLoading={insightLoadingKey === 'admin_operations_bar'}
              disabled={insightLoadingKey !== null && insightLoadingKey !== 'admin_operations_bar'}
              onClick={() => handleInsightRequest('admin_operations_bar', { operationsTimeline, granularity })}
            >
              Insight
            </Button>
            <Bar
              data={{
                labels: operationsTimeline.map((d) => d.period),
                datasets: [
                  {
                    label: 'Inbound',
                    data: operationsTimeline.map((d) => d.inbound),
                    backgroundColor: '#0ea5e9',
                    stack: 'ops',
                  },
                  {
                    label: 'Outbound',
                    data: operationsTimeline.map((d) => d.outbound),
                    backgroundColor: '#6366f1',
                    stack: 'ops',
                  },
                  {
                    label: 'Cycle count',
                    data: operationsTimeline.map((d) => d.cycleCount),
                    backgroundColor: '#22c55e',
                    stack: 'ops',
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                  x: { stacked: true, ticks: { maxTicksLimit: 10 } },
                  y: { stacked: true, beginAtZero: true },
                },
              }}
            />
          </div>
          <div className="h-80 relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-10 right-0 z-10"
              isLoading={insightLoadingKey === 'admin_operations_line'}
              disabled={insightLoadingKey !== null && insightLoadingKey !== 'admin_operations_line'}
              onClick={() => handleInsightRequest('admin_operations_line', { operationsTimeline, granularity })}
            >
              Insight
            </Button>
            <Line
              data={{
                labels: operationsTimeline.map((d) => d.period),
                datasets: [
                  {
                    label: 'Total operations',
                    data: operationsTimeline.map((d) => d.total),
                    borderColor: '#f59e0b',
                    backgroundColor: '#f59e0b',
                    tension: 0.3,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { x: { ticks: { maxTicksLimit: 10 } }, y: { beginAtZero: true } },
              }}
            />

          </div>
        </div>
        {(insightsByKey.admin_operations_bar || insightsByKey.admin_operations_line) && (
          <div className="mt-6 space-y-3">
            {insightsByKey.admin_operations_bar && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                  <Button variant="ghost" size="sm" onClick={() => clearInsight('admin_operations_bar')}>
                    Clear
                  </Button>
                </div>
                <ChatMarkdown role="model" content={insightsByKey.admin_operations_bar} />
              </div>
            )}
            {insightsByKey.admin_operations_line && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                  <Button variant="ghost" size="sm" onClick={() => clearInsight('admin_operations_line')}>
                    Clear
                  </Button>
                </div>
                <ChatMarkdown role="model" content={insightsByKey.admin_operations_line} />
              </div>
            )}
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-7 md:p-8 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-6">Task/Request Completion & Pending</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-10 right-0 z-10"
              isLoading={insightLoadingKey === 'admin_completion_pie'}
              disabled={insightLoadingKey !== null && insightLoadingKey !== 'admin_completion_pie'}
              onClick={() => handleInsightRequest('admin_completion_pie', { completionOverview })}
            >
              Insight
            </Button>
            <Pie
              data={{
                labels: completionOverview.map((d) => d.name),
                datasets: [
                  {
                    data: completionOverview.map((d) => d.value),
                    backgroundColor: completionOverview.map((_, i) => COLORS[i % COLORS.length]),
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
              }}
            />
          </div>
          <div className="h-80 relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-10 right-0 z-10"
              isLoading={insightLoadingKey === 'admin_completion_rate'}
              disabled={insightLoadingKey !== null && insightLoadingKey !== 'admin_completion_rate'}
              onClick={() => handleInsightRequest('admin_completion_rate', { completionRateByPeriod, granularity })}
            >
              Insight
            </Button>
            <ChartJSComponent
              type="bar"
              data={{
                labels: completionRateByPeriod.map((d) => d.period),
                datasets: [
                  {
                    type: 'bar',
                    label: 'Completed',
                    data: completionRateByPeriod.map((d) => d.completed),
                    backgroundColor: '#22c55e',
                    yAxisID: 'y',
                  },
                  {
                    type: 'bar',
                    label: 'Pending',
                    data: completionRateByPeriod.map((d) => d.pending),
                    backgroundColor: '#f59e0b',
                    yAxisID: 'y',
                  },
                  {
                    type: 'bar',
                    label: 'Rejected',
                    data: completionRateByPeriod.map((d) => d.rejected),
                    backgroundColor: '#ef4444',
                    yAxisID: 'y',
                  },
                  {
                    type: 'line',
                    label: 'Completion rate %',
                    data: completionRateByPeriod.map((d) => d.completionRate),
                    borderColor: '#0ea5e9',
                    backgroundColor: '#0ea5e9',
                    yAxisID: 'y1',
                    tension: 0.3,
                    fill: false,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                  x: { ticks: { maxTicksLimit: 10 } },
                  y: { beginAtZero: true, position: 'left' },
                  y1: {
                    beginAtZero: true,
                    position: 'right',
                    min: 0,
                    max: 100,
                    grid: { drawOnChartArea: false },
                  },
                },
              }}
            />

          </div>
        </div>
        {(insightsByKey.admin_completion_pie || insightsByKey.admin_completion_rate) && (
          <div className="mt-6 space-y-3">
            {insightsByKey.admin_completion_pie && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                  <Button variant="ghost" size="sm" onClick={() => clearInsight('admin_completion_pie')}>
                    Clear
                  </Button>
                </div>
                <ChatMarkdown role="model" content={insightsByKey.admin_completion_pie} />
              </div>
            )}
            {insightsByKey.admin_completion_rate && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                  <Button variant="ghost" size="sm" onClick={() => clearInsight('admin_completion_rate')}>
                    Clear
                  </Button>
                </div>
                <ChatMarkdown role="model" content={insightsByKey.admin_completion_rate} />
              </div>
            )}
          </div>
        )}
      </section>

    </div>
  );
}
