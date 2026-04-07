'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJSCore,
  Legend as ChartLegend,
  LinearScale,
  Tooltip as ChartTooltip,
} from 'chart.js';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import { requestReportInsight } from '../../../lib/ai-insights.api';
import { ChartDateFilterBar } from '../../../components/reports/ChartDateFilterBar';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Button } from '../../../components/ui/Button';
import { ChatMarkdown } from '../../../components/ChatMarkdown';
import { defaultReportDateRange, type QuickPreset } from '../../../lib/report-date-range';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

ChartJSCore.register(ArcElement, BarElement, CategoryScale, ChartLegend, LinearScale, ChartTooltip);

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function StaffReportsPage() {
  const init = useMemo(() => defaultReportDateRange(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [historyStartDate, setHistoryStartDate] = useState(init.start);
  const [historyEndDate, setHistoryEndDate] = useState(init.end);
  const [historyPreset, setHistoryPreset] = useState<QuickPreset | null>('1m');

  const [requests, setRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);

  const [insightsByKey, setInsightsByKey] = useState<Record<string, string>>({});
  const [insightLoadingKey, setInsightLoadingKey] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);

  const aiStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toIsoDate(d);
  }, []);
  const aiEndDate = useMemo(() => toIsoDate(new Date()), []);

  async function handleInsightRequest(chartKey: string, data: unknown) {
    try {
      setInsightError(null);
      setInsightLoadingKey(chartKey);
      const res = await requestReportInsight({ chartKey, startDate: aiStartDate, endDate: aiEndDate, data });
      setInsightsByKey((prev) => ({ ...prev, [chartKey]: res.insight }));
    } catch (e) {
      setInsightError(e instanceof Error ? e.message : 'Failed to generate insight');
    } finally {
      setInsightLoadingKey(null);
    }
  }

  function clearInsight(chartKey: string) {
    setInsightsByKey((prev) => {
      const next = { ...prev };
      delete next[chartKey];
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function run(isInitial: boolean) {
      try {
        if (isInitial) {
          setLoading(true);
          setError(null);
        }
        const [req, cc] = await Promise.all([listStorageRequests(), getCycleCounts()]);
        if (cancelled) return;
        setRequests(req || []);
        setCycleCounts(cc || []);
        setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour12: false }));
      } catch (e) {
        if (!cancelled && isInitial) setError(e instanceof Error ? e.message : 'Failed to load reports');
      } finally {
        if (!cancelled && isInitial) {
          setLoading(false);
        }
      }
    }

    void run(true);
    pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') void run(false);
    }, 15000);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  const historyRequests = useMemo(() => {
    const from = new Date(historyStartDate).getTime();
    const to = new Date(historyEndDate).getTime() + 86399999;
    return requests.filter((r) => {
      const t = new Date(r.updated_at || r.created_at).getTime();
      return t >= from && t <= to;
    });
  }, [requests, historyStartDate, historyEndDate]);

  const historyCycleCounts = useMemo(() => {
    const from = new Date(historyStartDate).getTime();
    const to = new Date(historyEndDate).getTime() + 86399999;
    return cycleCounts.filter((c) => {
      const t = new Date(c.updated_at || c.created_at).getTime();
      return t >= from && t <= to;
    });
  }, [cycleCounts, historyStartDate, historyEndDate]);

  const inOutPerDay = useMemo(() => {
    const fromDate = new Date(historyStartDate);
    const toDate = new Date(historyEndDate);
    const dayMs = 24 * 60 * 60 * 1000;
    const base: Array<{ iso: string; day: string; inbound: number; outbound: number; cycle: number }> = [];

    for (let t = fromDate.getTime(); t <= toDate.getTime(); t += dayMs) {
      const dt = new Date(t);
      const iso = dt.toISOString().slice(0, 10);
      const day = dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
      base.push({ iso, day, inbound: 0, outbound: 0, cycle: 0 });
    }
    const byDay = new Map(base.map((d) => [d.iso, d]));

    historyRequests.forEach((r) => {
      const iso = new Date(r.updated_at || r.created_at).toISOString().slice(0, 10);
      const row = byDay.get(iso);
      if (!row) return;
      const qty = (r.items || []).reduce((sum: number, i: any) => sum + (i.quantity_actual ?? i.quantity_requested ?? 0), 0);
      if (r.request_type === 'IN') row.inbound += qty;
      else row.outbound += qty;
    });

    historyCycleCounts.forEach((c) => {
      const iso = new Date(c.updated_at || c.created_at).toISOString().slice(0, 10);
      const row = byDay.get(iso);
      if (!row) return;
      row.cycle += (c.items || c.target_items || []).length;
    });

    return base.map(({ day, inbound, outbound, cycle }) => ({ day, inbound, outbound, cycle }));
  }, [historyRequests, historyCycleCounts, historyStartDate, historyEndDate]);

  const discrepancySummary = useMemo(() => {
    const damaged = requests.reduce((sum, r) => sum + (r.items || []).reduce((s: number, i: any) => s + (i.damage_quantity || 0), 0), 0);
    const mismatch = cycleCounts.reduce((sum, c) => sum + (c.items || []).reduce((s: number, i: any) => s + Math.abs(i.discrepancy || 0), 0), 0);
    const location = requests.filter((r) => r.status === 'REJECTED').length;
    return [
      { name: 'Damaged', value: damaged },
      { name: 'Quantity mismatch', value: mismatch },
      { name: 'Location/flow issue', value: location },
    ];
  }, [requests, cycleCounts]);

  const realtimeCycleAccuracy = useMemo(() => {
    return cycleCounts.map((c) => {
      const system = (c.items || []).reduce((s: number, i: any) => s + (i.system_quantity || 0), 0);
      const actual = (c.items || []).reduce((s: number, i: any) => s + (i.counted_quantity || 0), 0);
      const accuracy = system === 0 ? 100 : Math.max(0, Math.round(100 - (Math.abs(system - actual) / system) * 100));
      return {
        id: String(c.cycle_count_id).slice(-6).toUpperCase(),
        system,
        actual,
        accuracy,
      };
    });
  }, [cycleCounts]);

  const realtimeTaskTypeDistribution = useMemo(() => {
    const inbound = requests.filter((r) => r.request_type === 'IN').length;
    const outbound = requests.filter((r) => r.request_type === 'OUT').length;
    const cycleCount = cycleCounts.length;
    return [
      { name: 'Inbound tasks', value: inbound },
      { name: 'Outbound tasks', value: outbound },
      { name: 'Cycle count tasks', value: cycleCount },
    ];
  }, [requests, cycleCounts]);

  const realtimeWorkloadByStatus = useMemo(() => {
    const requestPending = requests.filter((r) => r.status === 'PENDING').length;
    const requestInProgress = requests.filter((r) => r.status === 'APPROVED' || r.status === 'DONE_BY_STAFF').length;
    const requestCompleted = requests.filter((r) => r.status === 'COMPLETED').length;

    const cyclePending = cycleCounts.filter((c) => c.status === 'PENDING').length;
    const cycleInProgress = cycleCounts.filter((c) => c.status === 'APPROVED' || c.status === 'STAFF_SUBMITTED').length;
    const cycleCompleted = cycleCounts.filter((c) => c.status === 'CONFIRMED').length;

    return [
      { status: 'Pending', requests: requestPending, cycleCounts: cyclePending },
      { status: 'In progress', requests: requestInProgress, cycleCounts: cycleInProgress },
      { status: 'Completed', requests: requestCompleted, cycleCounts: cycleCompleted },
    ];
  }, [requests, cycleCounts]);

  const historyKpis = useMemo(() => {
    const inboundOrders = historyRequests.filter((r) => r.request_type === 'IN').length;
    const outboundOrders = historyRequests.filter((r) => r.request_type === 'OUT').length;
    const cycleTasks = historyCycleCounts.length;
    const movedUnits = inOutPerDay.reduce((sum, d) => sum + d.inbound + d.outbound, 0);
    return { inboundOrders, outboundOrders, cycleTasks, movedUnits };
  }, [historyRequests, historyCycleCounts, inOutPerDay]);

  const issueKpis = useMemo(() => {
    const totalIssues = discrepancySummary.reduce((sum, item) => sum + item.value, 0);
    const topIssue = discrepancySummary.reduce((top, item) => (item.value > top.value ? item : top), discrepancySummary[0] ?? { name: 'N/A', value: 0 });
    return { totalIssues, topIssue };
  }, [discrepancySummary]);

  const cycleKpis = useMemo(() => {
    if (realtimeCycleAccuracy.length === 0) return { avgAccuracy: 0, checkedCycles: 0, highAccuracy: 0, lowAccuracy: 0 };
    const checkedCycles = realtimeCycleAccuracy.length;
    const avgAccuracy = Math.round(realtimeCycleAccuracy.reduce((sum, item) => sum + item.accuracy, 0) / checkedCycles);
    const highAccuracy = realtimeCycleAccuracy.filter((item) => item.accuracy >= 95).length;
    const lowAccuracy = realtimeCycleAccuracy.filter((item) => item.accuracy < 80).length;
    return { avgAccuracy, checkedCycles, highAccuracy, lowAccuracy };
  }, [realtimeCycleAccuracy]);

  const workloadKpis = useMemo(() => {
    const pendingTotal = realtimeWorkloadByStatus.find((d) => d.status === 'Pending');
    const inProgressTotal = realtimeWorkloadByStatus.find((d) => d.status === 'In progress');
    const completedTotal = realtimeWorkloadByStatus.find((d) => d.status === 'Completed');
    const totalPending = (pendingTotal?.requests ?? 0) + (pendingTotal?.cycleCounts ?? 0);
    const totalInProgress = (inProgressTotal?.requests ?? 0) + (inProgressTotal?.cycleCounts ?? 0);
    const totalCompleted = (completedTotal?.requests ?? 0) + (completedTotal?.cycleCounts ?? 0);
    return { totalPending, totalInProgress, totalCompleted };
  }, [realtimeWorkloadByStatus]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Reports</h1>
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
        <p className="mt-1 text-xs text-slate-500">Last updated: {lastUpdated ?? '--:--:--'}</p>
      </div>

      {insightError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{insightError}</div>}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-slate-900">Personal Operation History Report</h2>
        <ChartDateFilterBar
          enableToggle
          initialCollapsed
          startDate={historyStartDate}
          endDate={historyEndDate}
          activePreset={historyPreset}
          onStartChange={setHistoryStartDate}
          onEndChange={setHistoryEndDate}
          onClearPreset={() => setHistoryPreset(null)}
          onApplyPreset={(range, preset) => {
            setHistoryStartDate(range.start);
            setHistoryEndDate(range.end);
            setHistoryPreset(preset);
          }}
        />
        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            isLoading={insightLoadingKey === 'staff_operation_history_bar'}
            disabled={insightLoadingKey !== null && insightLoadingKey !== 'staff_operation_history_bar'}
            onClick={() => handleInsightRequest('staff_operation_history_bar', { inOutPerDay })}
          >
            Insight
          </Button>
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiCard title="Inbound orders" value={historyKpis.inboundOrders} />
          <KpiCard title="Outbound orders" value={historyKpis.outboundOrders} />
          <KpiCard title="Cycle tasks" value={historyKpis.cycleTasks} />
          <KpiCard title="Moved units" value={historyKpis.movedUnits} />
        </div>
        <div className="h-72">
          <Bar
            data={{
              labels: inOutPerDay.map((d) => d.day),
              datasets: [
                { label: 'Inbound', data: inOutPerDay.map((d) => d.inbound), backgroundColor: '#0ea5e9', stack: 'ops' },
                { label: 'Outbound', data: inOutPerDay.map((d) => d.outbound), backgroundColor: '#6366f1', stack: 'ops' },
                { label: 'Cycle count', data: inOutPerDay.map((d) => d.cycle), backgroundColor: '#22c55e', stack: 'ops' },
              ],
            }}
            options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true, ticks: { autoSkip: false } }, y: { stacked: true, beginAtZero: true } } }}
          />
        </div>
        {insightsByKey.staff_operation_history_bar && <InsightPanel content={insightsByKey.staff_operation_history_bar} onClear={() => clearInsight('staff_operation_history_bar')} />}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">Discrepancy & Issue Summary Report</h2>
            <Button
              variant="outline"
              size="sm"
              isLoading={insightLoadingKey === 'staff_discrepancy_summary'}
              disabled={insightLoadingKey !== null && insightLoadingKey !== 'staff_discrepancy_summary'}
              onClick={() => handleInsightRequest('staff_discrepancy_summary', { discrepancySummary })}
            >
              Insight
            </Button>
          </div>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <KpiCard title="Total issues" value={issueKpis.totalIssues} />
            <KpiCard title="Top issue" value={issueKpis.topIssue.name} />
            <KpiCard title="Top issue count" value={issueKpis.topIssue.value} />
            <KpiCard title="Issue categories" value={discrepancySummary.length} />
          </div>
          <div className="h-72">
            <Pie
              data={{
                labels: discrepancySummary.map((d) => d.name),
                datasets: [{ data: discrepancySummary.map((d) => d.value), backgroundColor: discrepancySummary.map((_, i) => COLORS[i % COLORS.length]) }],
              }}
              options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
            />
          </div>
          {insightsByKey.staff_discrepancy_summary && <InsightPanel content={insightsByKey.staff_discrepancy_summary} onClear={() => clearInsight('staff_discrepancy_summary')} />}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">Task Workload Overview</h2>
            <Button
              variant="outline"
              size="sm"
              isLoading={insightLoadingKey === 'staff_warehouse_health'}
              disabled={insightLoadingKey !== null && insightLoadingKey !== 'staff_warehouse_health'}
              onClick={() => handleInsightRequest('staff_warehouse_health', { taskTypeDistribution: realtimeTaskTypeDistribution, workloadByStatus: realtimeWorkloadByStatus })}
            >
              Insight
            </Button>
          </div>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <KpiCard title="Pending workload" value={workloadKpis.totalPending} />
            <KpiCard title="In-progress workload" value={workloadKpis.totalInProgress} />
            <KpiCard title="Completed workload" value={workloadKpis.totalCompleted} />
            <KpiCard title="Task types" value={realtimeTaskTypeDistribution.length} />
          </div>
          <div className="h-72">
            <Pie
              data={{
                labels: realtimeWorkloadByStatus.map((d) => d.status),
                datasets: [{
                  label: 'Workload',
                  data: realtimeWorkloadByStatus.map((d) => d.requests + d.cycleCounts),
                  backgroundColor: ['#f59e0b', '#0ea5e9', '#22c55e'],
                }],
              }}
              options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
            />
          </div>
          {insightsByKey.staff_warehouse_health && <InsightPanel content={insightsByKey.staff_warehouse_health} onClear={() => clearInsight('staff_warehouse_health')} />}
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-900">Cycle Count Execution Report</h2>
          <Button
            variant="outline"
            size="sm"
            isLoading={insightLoadingKey === 'staff_cycle_count_execution'}
            disabled={insightLoadingKey !== null && insightLoadingKey !== 'staff_cycle_count_execution'}
            onClick={() => handleInsightRequest('staff_cycle_count_execution', { cycleAccuracy: realtimeCycleAccuracy })}
          >
            Insight
          </Button>
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiCard title="Checked cycles" value={cycleKpis.checkedCycles} />
          <KpiCard title="Average accuracy" value={`${cycleKpis.avgAccuracy}%`} />
          <KpiCard title=">= 95% accuracy" value={cycleKpis.highAccuracy} />
          <KpiCard title="< 80% accuracy" value={cycleKpis.lowAccuracy} />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-72">
            <Bar
              data={{
                labels: realtimeCycleAccuracy.map((d) => d.id),
                datasets: [
                  { label: 'System', data: realtimeCycleAccuracy.map((d) => d.system), backgroundColor: '#0ea5e9' },
                  { label: 'Actual', data: realtimeCycleAccuracy.map((d) => d.actual), backgroundColor: '#22c55e' },
                ],
              }}
              options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }}
            />
          </div>
          <div className="space-y-3">
            {realtimeCycleAccuracy.slice(0, 6).map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-bold text-slate-900">Cycle {row.id}</p>
                  <p className="text-sm font-bold text-slate-700">{row.accuracy}%</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`${row.accuracy >= 95 ? 'bg-emerald-500' : row.accuracy >= 80 ? 'bg-amber-500' : 'bg-red-500'} h-full`} style={{ width: `${row.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        {insightsByKey.staff_cycle_count_execution && <InsightPanel content={insightsByKey.staff_cycle_count_execution} onClear={() => clearInsight('staff_cycle_count_execution')} />}
      </section>
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string | number }) {
  const isLongText = typeof value === 'string' && value.length >= 14;
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">{title}</p>
      <p className={`mt-1 font-black text-slate-900 ${isLongText ? 'text-lg' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}

function InsightPanel({ content, onClear }: { content: string; onClear: () => void }) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
      <ChatMarkdown role="model" content={content} />
    </div>
  );
}
