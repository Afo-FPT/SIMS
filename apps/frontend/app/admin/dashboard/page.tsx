'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Chart as ChartJSCore } from 'chart.js';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Legend as ChartLegend,
  LinearScale,
  Tooltip as ChartTooltip,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { listUsers, getAdminDashboardSnapshot } from '../../../lib/admin.api';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import { requestReportInsight } from '../../../lib/ai-insights.api';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Button } from '../../../components/ui/Button';
import { ChatMarkdown } from '../../../components/ChatMarkdown';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { ChartDateFilterBar } from '../../../components/reports/ChartDateFilterBar';
import { defaultReportDateRange, type QuickPreset } from '../../../lib/report-date-range';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

function pieTooltipLabelCb(context: { label?: string; parsed: number; dataset: { data: unknown[] } }): string {
  const data = context.dataset.data as number[];
  const total = data.reduce((a, b) => a + (Number(b) || 0), 0);
  const v = Number(context.parsed) || 0;
  const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
  return `${context.label ?? ''}: ${v.toLocaleString('en-US')} (${pct}% of total)`;
}

const chartTitle = (text: string) => ({
  display: true as const,
  text,
  font: { size: 15, weight: 'bold' as const },
  color: '#0f172a',
  padding: { bottom: 4 },
});

const chartSubtitle = (text: string) => ({
  display: true as const,
  text,
  color: '#64748b',
  font: { size: 11 },
  padding: { bottom: 10 },
});

ChartJSCore.register(ArcElement, BarElement, CategoryScale, ChartLegend, LinearScale, ChartTooltip);

ChartJSCore.defaults.animation = {
  duration: 1200,
  easing: 'easeOutCubic',
};
ChartJSCore.defaults.animations = {
  x: { duration: 900, from: 0 },
  y: { duration: 900, from: 0 },
  radius: { duration: 900, from: 0 },
} as any;
ChartJSCore.defaults.transitions.show = {
  animations: {
    x: { from: 0 },
    y: { from: 0 },
  },
} as any;

function toIsoLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayKey(ts: string): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
}

function dayBucket(ts: string): { key: string; label: string; sortTs: number } {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return {
    key: `${y}-${m}-${day}`,
    label: dayKey(ts),
    sortTs: new Date(`${y}-${m}-${day}T00:00:00`).getTime(),
  };
}

function inDateRange(ts: string, start: string, end: string): boolean {
  const t = new Date(ts).getTime();
  const s = start ? new Date(`${start}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const e = end ? new Date(`${end}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
  return t >= s && t <= e;
}

export default function AdminDashboard() {
  const defaultOps = useMemo(() => defaultReportDateRange(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [storageRequests, setStorageRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);
  const [snapshot, setSnapshot] = useState({ activeContracts: 0, geminiConfigured: false });
  const [opsStartDate, setOpsStartDate] = useState(defaultOps.start);
  const [opsEndDate, setOpsEndDate] = useState(defaultOps.end);
  const [opsPreset, setOpsPreset] = useState<QuickPreset | null>('1m');
  const [insightsByKey, setInsightsByKey] = useState<Record<string, string>>({});
  const [insightLoadingKey, setInsightLoadingKey] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    setInsightsByKey({});
    setInsightLoadingKey(null);
    setInsightError(null);
  }, [opsStartDate, opsEndDate]);

  async function handleInsightRequest(
    chartKey: string,
    data: unknown,
    range?: { startDate: string; endDate: string },
  ) {
    const today = toIsoLocalDate(new Date());
    try {
      setInsightError(null);
      setInsightLoadingKey(chartKey);
      const res = await requestReportInsight({
        chartKey,
        startDate: range?.startDate ?? today,
        endDate: range?.endDate ?? today,
        data,
      });
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

    async function run(isInitialLoad: boolean) {
      try {
        if (isInitialLoad) {
          setLoading(true);
          setError(null);
        }
        const [usersRes, reqs, cycles, snap] = await Promise.all([
          listUsers({ page: 1, limit: 50000 }),
          listStorageRequests(),
          getCycleCounts(),
          getAdminDashboardSnapshot().catch(() => ({ activeContracts: 0, geminiConfigured: false })),
        ]);
        if (cancelled) return;
        setUsers(usersRes.items || []);
        setStorageRequests(reqs || []);
        setCycleCounts(cycles || []);
        setSnapshot(snap);
        setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour12: false }));
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

  const filteredStorageRequestsOps = useMemo(
    () => storageRequests.filter((r) => inDateRange(r.updated_at || r.created_at, opsStartDate, opsEndDate)),
    [storageRequests, opsStartDate, opsEndDate],
  );

  const filteredCycleCountsOps = useMemo(
    () => cycleCounts.filter((c) => inDateRange(c.updated_at || c.created_at, opsStartDate, opsEndDate)),
    [cycleCounts, opsStartDate, opsEndDate],
  );

  const roleDistributionBusiness = useMemo(() => {
    const roles: { key: string; label: string }[] = [
      { key: 'MANAGER', label: 'Manager' },
      { key: 'STAFF', label: 'Staff' },
      { key: 'CUSTOMER', label: 'Customer' },
    ];
    return roles.map(({ key, label }) => ({
      role: label,
      value: users.filter((u) => u.role === key).length,
    }));
  }, [users]);

  const operationsTimeline = useMemo(() => {
    const storageByDay = new Map<string, { inbound: number; outbound: number }>();
    const cycleByDay = new Map<string, number>();

    filteredStorageRequestsOps.forEach((r) => {
      const bucket = dayBucket(r.updated_at || r.created_at);
      const normalizedType = String(r.request_type || '').toUpperCase();
      if (normalizedType !== 'IN' && normalizedType !== 'OUT') return;
      const current = storageByDay.get(bucket.key) ?? { inbound: 0, outbound: 0 };
      if (normalizedType === 'IN') current.inbound += 1;
      else current.outbound += 1;
      storageByDay.set(bucket.key, current);
    });

    filteredCycleCountsOps.forEach((c) => {
      const bucket = dayBucket(c.updated_at || c.created_at);
      cycleByDay.set(bucket.key, (cycleByDay.get(bucket.key) || 0) + 1);
    });

    // Build a complete day-by-day timeline in selected range (inclusive).
    const start = new Date(`${opsStartDate}T00:00:00`);
    const end = new Date(`${opsEndDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

    const timeline: { period: string; inbound: number; outbound: number; cycleCount: number; total: number }[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${d}`;
      const storage = storageByDay.get(key) ?? { inbound: 0, outbound: 0 };
      const cycleCount = cycleByDay.get(key) ?? 0;
      const inbound = storage.inbound;
      const outbound = storage.outbound;
      const total = inbound + outbound + cycleCount;
      timeline.push({
        period: cursor.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
        inbound,
        outbound,
        cycleCount,
        total,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return timeline;
  }, [filteredStorageRequestsOps, filteredCycleCountsOps, opsStartDate, opsEndDate]);

  const completionOverviewThree = useMemo(() => {
    const pendingOnly =
      storageRequests.filter((r) => r.status === 'PENDING').length +
      cycleCounts.filter((c) => c.status === 'PENDING').length;
    const inProgress =
      storageRequests.filter((r) => r.status === 'APPROVED' || r.status === 'DONE_BY_STAFF').length +
      cycleCounts.filter((c) =>
        ['APPROVED', 'ASSIGNED', 'STAFF_SUBMITTED', 'COUNTING_IN_PROGRESS'].includes(String(c.status)),
      ).length;
    const completed =
      storageRequests.filter((r) => r.status === 'COMPLETED').length +
      cycleCounts.filter((c) => c.status === 'CONFIRMED').length;
    const rejected =
      storageRequests.filter((r) => r.status === 'REJECTED').length +
      cycleCounts.filter((c) => c.status === 'REJECTED').length;
    return [
      { name: 'Completed', value: completed },
      { name: 'Pending', value: pendingOnly + inProgress },
      { name: 'Rejected', value: rejected },
    ];
  }, [storageRequests, cycleCounts]);

  const headlineStats = useMemo(() => {
    const totalBusinessUsers = users.filter((u) => ['MANAGER', 'STAFF', 'CUSTOMER'].includes(u.role)).length;
    const pendingApproval =
      storageRequests.filter((r) => r.status === 'PENDING').length +
      cycleCounts.filter((c) => c.status === 'PENDING').length;
    const systemErrors =
      storageRequests.filter((r) => r.status === 'REJECTED').length +
      cycleCounts.filter((c) => c.status === 'ADJUSTMENT_REQUESTED' || c.status === 'REJECTED').length;
    return {
      totalBusinessUsers,
      pendingApproval,
      activeContracts: snapshot.activeContracts,
      systemErrors,
    };
  }, [users, storageRequests, cycleCounts, snapshot.activeContracts]);

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
        time: new Date(r.updated_at || r.created_at).toLocaleString('en-GB'),
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
        time: new Date(c.updated_at || c.created_at).toLocaleString('en-GB'),
        ts,
      });
    }
    return rows.sort((a, b) => b.ts - a.ts).slice(0, 10);
  }, [storageRequests, cycleCounts]);

  const kpiRolePieTotal = useMemo(
    () => roleDistributionBusiness.reduce((s, d) => s + d.value, 0),
    [roleDistributionBusiness],
  );
  const kpiRoleCount = useMemo(
    () => roleDistributionBusiness.filter((d) => d.value > 0).length,
    [roleDistributionBusiness],
  );

  const kpiOperationsTotals = useMemo(() => {
    let inbound = 0;
    let outbound = 0;
    let cycleCount = 0;
    for (const d of operationsTimeline) {
      inbound += d.inbound;
      outbound += d.outbound;
      cycleCount += d.cycleCount;
    }
    return { inbound, outbound, cycleCount, total: inbound + outbound + cycleCount };
  }, [operationsTimeline]);

  const kpiCompletionPie = useMemo(() => {
    const total = completionOverviewThree.reduce((s, d) => s + d.value, 0);
    const completed = completionOverviewThree.find((d) => d.name === 'Completed')?.value ?? 0;
    const pct = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';
    return { total, completed, pct };
  }, [completionOverviewThree]);

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

      {insightError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">{insightError}</div>
      )}

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
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Pending requests</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">{headlineStats.pendingApproval}</p>
            <p className="mt-2 text-xs text-slate-500">Not approved yet (PENDING)</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <span className="material-symbols-outlined text-2xl">contract</span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Active contracts</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">{headlineStats.activeContracts}</p>
            <p className="mt-2 text-xs text-slate-500">Current active contracts</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
                <span className="material-symbols-outlined text-2xl">bug_report</span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">System errors</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">{headlineStats.systemErrors}</p>
            <p className="mt-2 text-xs text-slate-500">Rejected + adjustment needed</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-lg font-black text-slate-900">User &amp; role analytics</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total accounts</p>
              <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">{kpiRolePieTotal.toLocaleString('en-US')}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Roles</p>
              <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">{kpiRoleCount}</p>
            </div>
          </div>
          <div className="relative mt-6 h-80">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-1 right-0 z-10"
              isLoading={insightLoadingKey === 'admin_role_distribution'}
              disabled={insightLoadingKey !== null && insightLoadingKey !== 'admin_role_distribution'}
              onClick={() => handleInsightRequest('admin_role_distribution', { roleDistribution: roleDistributionBusiness })}
            >
              Insight
            </Button>
            <Pie
              data={{
                labels: roleDistributionBusiness.map((d) => d.role),
                datasets: [
                  {
                    data: roleDistributionBusiness.map((d) => d.value),
                    backgroundColor: roleDistributionBusiness.map((_, i) => COLORS[i % COLORS.length]),
                    borderWidth: 1,
                    borderColor: '#fff',
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  title: chartTitle('Account distribution by role'),
                  subtitle: chartSubtitle('Manager, Staff, Customer'),
                  legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                  tooltip: { callbacks: { label: (c) => pieTooltipLabelCb(c as any) } },
                },
              }}
            />
          </div>
          {insightsByKey.admin_role_distribution && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                <Button variant="ghost" size="sm" onClick={() => clearInsight('admin_role_distribution')}>
                  Clear
                </Button>
              </div>
              <ChatMarkdown role="model" content={insightsByKey.admin_role_distribution} />
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-lg font-black text-slate-900">Task &amp; request completion</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total</p>
              <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">{kpiCompletionPie.total.toLocaleString('en-US')}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Completed</p>
              <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">{kpiCompletionPie.completed.toLocaleString('en-US')}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Completion rate</p>
              <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">{kpiCompletionPie.pct}%</p>
            </div>
          </div>
          <div className="relative mt-6 h-80">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-1 right-0 z-10"
              isLoading={insightLoadingKey === 'admin_completion_pie'}
              disabled={insightLoadingKey !== null && insightLoadingKey !== 'admin_completion_pie'}
              onClick={() => handleInsightRequest('admin_completion_pie', { completionOverview: completionOverviewThree })}
            >
              Insight
            </Button>
            <Pie
              data={{
                labels: completionOverviewThree.map((d) => d.name),
                datasets: [
                  {
                    data: completionOverviewThree.map((d) => d.value),
                    backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                    borderWidth: 1,
                    borderColor: '#fff',
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  title: chartTitle('Request status'),
                  subtitle: chartSubtitle('Completed / Pending / Rejected'),
                  legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                  tooltip: { callbacks: { label: (c) => pieTooltipLabelCb(c as any) } },
                },
              }}
            />
          </div>
          {insightsByKey.admin_completion_pie && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                <Button variant="ghost" size="sm" onClick={() => clearInsight('admin_completion_pie')}>
                  Clear
                </Button>
              </div>
              <ChatMarkdown role="model" content={insightsByKey.admin_completion_pie} />
            </div>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h2 className="text-lg font-black text-slate-900">System operations volume</h2>
        <div className="mt-4 space-y-4">
          <ChartDateFilterBar
            enableToggle
            initialCollapsed
            startDate={opsStartDate}
            endDate={opsEndDate}
            activePreset={opsPreset}
            onStartChange={setOpsStartDate}
            onEndChange={setOpsEndDate}
            onClearPreset={() => setOpsPreset(null)}
            onApplyPreset={(r, preset) => {
              setOpsStartDate(r.start);
              setOpsEndDate(r.end);
              setOpsPreset(preset);
            }}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Inbound</p>
            <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">{kpiOperationsTotals.inbound.toLocaleString('en-US')}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Outbound</p>
            <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">{kpiOperationsTotals.outbound.toLocaleString('en-US')}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cycle count</p>
            <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">{kpiOperationsTotals.cycleCount.toLocaleString('en-US')}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total</p>
            <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">{kpiOperationsTotals.total.toLocaleString('en-US')}</p>
          </div>
        </div>
        <div className="relative mt-4 h-80">
          <Button
            variant="ghost"
            size="sm"
            className="absolute -top-1 right-0 z-10"
            isLoading={insightLoadingKey === 'admin_operations_bar'}
            disabled={insightLoadingKey !== null && insightLoadingKey !== 'admin_operations_bar'}
            onClick={() =>
              handleInsightRequest('admin_operations_bar', { operationsTimeline }, { startDate: opsStartDate, endDate: opsEndDate })
            }
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
              plugins: {
                title: chartTitle('Operations per period'),
                subtitle: chartSubtitle('Stacked bars: inbound / outbound / cycle count'),
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                tooltip: {
                  callbacks: {
                    footer: (items) => {
                      const sum = items.reduce((s, it) => s + (Number(it.raw) || 0), 0);
                      return `Period total: ${sum.toLocaleString('en-US')}`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  stacked: true,
                  ticks: {
                    autoSkip: false,
                    maxRotation: 0,
                    minRotation: 0,
                    color: '#64748b',
                  },
                  title: {
                    display: true,
                    text: 'Day',
                    color: '#475569',
                    font: { size: 12, weight: 'bold' },
                  },
                  grid: { display: false },
                },
                y: {
                  stacked: true,
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Operations',
                    color: '#475569',
                    font: { size: 12, weight: 'bold' },
                  },
                  ticks: { precision: 0, color: '#64748b' },
                  grid: { color: '#f1f5f9' },
                },
              },
            }}
          />
        </div>
        {insightsByKey.admin_operations_bar && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
              <Button variant="ghost" size="sm" onClick={() => clearInsight('admin_operations_bar')}>
                Clear
              </Button>
            </div>
            <ChatMarkdown role="model" content={insightsByKey.admin_operations_bar} />
          </div>
        )}
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
