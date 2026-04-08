'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJSCore,
  Legend as ChartLegend,
  LinearScale,
  Tooltip as ChartTooltip,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { listMyStoredItems } from '../../../lib/stored-items.api';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import { requestReportInsight } from '../../../lib/ai-insights.api';
import { Button } from '../../../components/ui/Button';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { ChatMarkdown } from '../../../components/ChatMarkdown';
import { ChartDateFilterBar } from '../../../components/reports/ChartDateFilterBar';
import { defaultReportDateRange, type QuickPreset } from '../../../lib/report-date-range';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

ChartJSCore.register(
  ArcElement,
  BarElement,
  CategoryScale,
  ChartLegend,
  LinearScale,
  ChartTooltip,
);

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

function dayKey(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CustomerReportsPage() {
  const init = useMemo(() => defaultReportDateRange(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [ioStartDate, setIoStartDate] = useState(init.start);
  const [ioEndDate, setIoEndDate] = useState(init.end);
  const [ioPreset, setIoPreset] = useState<QuickPreset | null>('1m');
  const [storedItems, setStoredItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);

  const [insightsByKey, setInsightsByKey] = useState<Record<string, string>>({});
  const [insightLoadingKey, setInsightLoadingKey] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function run(isInitial: boolean) {
      try {
        if (isInitial) {
          setLoading(true);
          setError(null);
        }
        const [items, req, cc] = await Promise.all([
          listMyStoredItems(),
          listStorageRequests(),
          getCycleCounts(),
        ]);
        if (cancelled) return;
        setStoredItems(items);
        setRequests(req);
        setCycleCounts(cc);
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
      if (document.visibilityState === 'visible') {
        void run(false);
      }
    }, 15000);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  function filterRequestsByRange(source: any[], start: string, end: string) {
    if (!start || !end) return source;
    const from = new Date(start);
    const to = new Date(end);
    to.setHours(23, 59, 59, 999);
    return source.filter((r) => {
      const t = new Date(r.updated_at || r.created_at);
      return t >= from && t <= to;
    });
  }

  function filterCycleCountsByRange(source: any[], start: string, end: string) {
    if (!start || !end) return source;
    const from = new Date(start);
    const to = new Date(end);
    to.setHours(23, 59, 59, 999);
    return source.filter((c) => {
      const t = new Date(c.updated_at || c.created_at);
      return t >= from && t <= to;
    });
  }

  const ioRequests = useMemo(() => filterRequestsByRange(requests, ioStartDate, ioEndDate), [requests, ioStartDate, ioEndDate]);
  const discrepancyCycleCounts = useMemo(() => cycleCounts, [cycleCounts]);

  const ioTrend = useMemo(() => {
    const map = new Map<string, { key: string; periodLabel: string; inbound: number; outbound: number }>();
    const fromDate = new Date(ioStartDate);
    const toDate = new Date(ioEndDate);
    const dayMs = 24 * 60 * 60 * 1000;
    for (let t = fromDate.getTime(); t <= toDate.getTime(); t += dayMs) {
      const d = new Date(t);
      const key = dayKey(d.toISOString());
      map.set(key, { key, periodLabel: key, inbound: 0, outbound: 0 });
    }
    ioRequests.forEach((r) => {
      const ts = r.updated_at || r.created_at;
      const key = dayKey(ts);
      if (!map.has(key)) map.set(key, { key, periodLabel: key, inbound: 0, outbound: 0 });
      const row = map.get(key)!;
      const qty = r.items.reduce((sum: number, i: any) => sum + (i.quantity_actual ?? i.quantity_requested ?? 0), 0);
      if (r.request_type === 'IN') row.inbound += qty;
      else row.outbound += qty;
    });
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [ioRequests, ioStartDate, ioEndDate]);

  const discrepancyRows = useMemo(() => {
    return discrepancyCycleCounts.map((c) => {
      const system = (c.items || []).reduce((s: number, i: any) => s + (i.system_quantity || 0), 0);
      const actual = (c.items || []).reduce((s: number, i: any) => s + (i.counted_quantity || 0), 0);
      return {
        id: c.cycle_count_id.slice(-8).toUpperCase(),
        system,
        actual,
        discrepancy: Math.abs(actual - system),
        status: c.status,
      };
    });
  }, [discrepancyCycleCounts]);

  const discrepancyPie = useMemo(() => {
    const under = discrepancyRows.filter((r) => r.actual < r.system).length;
    const over = discrepancyRows.filter((r) => r.actual > r.system).length;
    const equal = discrepancyRows.filter((r) => r.actual === r.system).length;
    return [
      { name: 'Missing', value: under },
      { name: 'Excess', value: over },
      { name: 'Matched', value: equal },
    ];
  }, [discrepancyRows]);

  const requestStatusSummary = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'PENDING').length;
    const inProgress = requests.filter((r) => r.status === 'APPROVED' || r.status === 'DONE_BY_STAFF').length;
    const completed = requests.filter((r) => r.status === 'COMPLETED').length;
    const rejected = requests.filter((r) => r.status === 'REJECTED').length;
    return [
      { name: 'Pending', value: pending },
      { name: 'In progress', value: inProgress },
      { name: 'Completed', value: completed },
      { name: 'Rejected', value: rejected },
    ];
  }, [requests]);

  const topProductsByQuantity = useMemo(() => {
    const map = new Map<string, { item: string; inbound: number; outbound: number }>();
    requests.forEach((r) => {
      (r.items || []).forEach((i: any) => {
        const key = i.item_name || 'Unknown';
        if (!map.has(key)) map.set(key, { item: key, inbound: 0, outbound: 0 });
        const row = map.get(key)!;
        const qty = i.quantity_actual ?? i.quantity_requested ?? 0;
        if (r.request_type === 'IN') row.inbound += qty;
        else row.outbound += qty;
      });
    });
    return Array.from(map.values())
      .map((r) => ({ ...r, total: r.inbound + r.outbound }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [requests]);

  const pieAnimatedOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      animation: {
        duration: 1400,
        easing: 'easeOutCubic' as const,
        animateRotate: true,
        animateScale: true,
      },
      animations: {
        numbers: { duration: 1200, easing: 'easeOutCubic' as const },
      },
      plugins: {
        title: { display: true, text: 'Distribution overview', color: '#0f172a', font: { size: 13, weight: 'bold' as const } },
        subtitle: { display: true, text: 'Current period data • Unit: requests', color: '#64748b' },
        legend: { position: 'bottom' as const },
        tooltip: {
          callbacks: {
            label: (ctx: any) => `${ctx.label}: ${(ctx.raw ?? 0).toLocaleString('en-US')}`,
          },
        },
      },
    }),
    [],
  );

  const ioSummary = useMemo(() => {
    const totalInbound = ioTrend.reduce((s, d) => s + d.inbound, 0);
    const totalOutbound = ioTrend.reduce((s, d) => s + d.outbound, 0);
    return { totalInbound, totalOutbound, periods: ioTrend.length };
  }, [ioTrend]);

  const topProductsSummary = useMemo(() => {
    const totalMoved = topProductsByQuantity.reduce((s, d) => s + d.total, 0);
    return { totalMoved, productCount: topProductsByQuantity.length };
  }, [topProductsByQuantity]);

  async function handleInsightRequest(chartKey: string, data: unknown, range?: { startDate: string; endDate: string }) {
    try {
      setInsightError(null);
      setInsightLoadingKey(chartKey);
      const res = await requestReportInsight({
        chartKey,
        startDate: range?.startDate ?? init.start,
        endDate: range?.endDate ?? init.end,
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

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Reports</h1>
        </div>
        <LoadingSkeleton className="h-64 rounded-3xl" />
      </div>
    );
  }
  if (error) return <ErrorState title="Failed to load customer reports" message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Reports</h1>
        <p className="mt-1 text-xs text-slate-500">Last updated: {lastUpdated ?? '--:--:--'}</p>
      </div>
      {insightError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">
          {insightError}
        </div>
      )}

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Inbound/Outbound History Report</h2>
              <p className="mt-1 text-sm text-slate-500">Unit: quantity</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                isLoading={insightLoadingKey === 'io_history'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'io_history'}
                onClick={() => handleInsightRequest('io_history', { ioTrend }, { startDate: ioStartDate, endDate: ioEndDate })}
              >
                Insight
              </Button>
            </div>
          </div>
          <div className="mt-3">
            <ChartDateFilterBar
              enableToggle
              initialCollapsed
              startDate={ioStartDate}
              endDate={ioEndDate}
              activePreset={ioPreset}
              onStartChange={setIoStartDate}
              onEndChange={setIoEndDate}
              onClearPreset={() => setIoPreset(null)}
              onApplyPreset={(range, preset) => {
                setIoStartDate(range.start);
                setIoEndDate(range.end);
                setIoPreset(preset);
              }}
            />
          </div>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard title="Total inbound" value={ioSummary.totalInbound.toLocaleString('en-US')} />
            <KpiCard title="Total outbound" value={ioSummary.totalOutbound.toLocaleString('en-US')} />
            <KpiCard title="Periods shown" value={ioSummary.periods} />
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="h-72 relative">
              <Bar
                data={{
                  labels: ioTrend.map((d) => d.periodLabel),
                  datasets: [
                    { label: 'Inbound', data: ioTrend.map((d) => d.inbound), backgroundColor: '#0ea5e9' },
                    { label: 'Outbound', data: ioTrend.map((d) => d.outbound), backgroundColor: '#6366f1' },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    title: { display: true, text: 'Inbound/outbound comparison', color: '#0f172a', font: { size: 13, weight: 'bold' } },
                    subtitle: { display: true, text: `Range: ${ioStartDate} -> ${ioEndDate} • Unit: quantity`, color: '#64748b' },
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${(ctx.raw ?? 0).toLocaleString('en-US')}` } },
                  },
                  scales: {
                    x: { title: { display: true, text: 'Day' } },
                    y: { beginAtZero: true, title: { display: true, text: 'Quantity (units)' } },
                  },
                }}
              />
            </div>
          </div>
          {insightsByKey.io_history && (
            <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                <Button variant="ghost" size="sm" onClick={() => clearInsight('io_history')}>
                  Clear
                </Button>
              </div>
              <ChatMarkdown role="model" content={insightsByKey.io_history} />
            </div>
          )}
        </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Inventory Checking & Discrepancy Report</h2>
              <p className="mt-1 text-sm text-slate-500">Unit: quantity difference</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                isLoading={insightLoadingKey === 'discrepancy'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'discrepancy'}
                onClick={() => handleInsightRequest('discrepancy', { discrepancyRows, discrepancyPie })}
              >
                Insight
              </Button>
            </div>
          </div>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <KpiCard title="Cycle checks" value={discrepancyRows.length} />
            <KpiCard title="Total discrepancy" value={totalFormat(discrepancyRows.reduce((s, r) => s + r.discrepancy, 0))} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 relative">
              <Bar
                data={{
                  labels: discrepancyRows.map((d) => d.id),
                  datasets: [
                    { label: 'System', data: discrepancyRows.map((d) => d.system), backgroundColor: '#0ea5e9' },
                    { label: 'Actual', data: discrepancyRows.map((d) => d.actual), backgroundColor: '#22c55e' },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    title: { display: true, text: 'System vs actual by cycle', color: '#0f172a', font: { size: 13, weight: 'bold' } },
                    subtitle: { display: true, text: `Updated: ${lastUpdated ?? '--:--:--'} • Unit: quantity`, color: '#64748b' },
                    legend: { position: 'bottom' },
                  },
                  scales: {
                    x: { title: { display: true, text: 'Cycle ID' } },
                    y: { beginAtZero: true, title: { display: true, text: 'Quantity (units)' } },
                  },
                }}
              />
            </div>
            <div className="h-72 relative">
              <Pie
                data={{
                  labels: discrepancyPie.map((d) => d.name),
                  datasets: [
                    {
                      data: discrepancyPie.map((d) => d.value),
                      backgroundColor: discrepancyPie.map((_, i) => COLORS[i % COLORS.length]),
                    },
                  ],
                }}
                options={pieAnimatedOptions}
              />
            </div>
          </div>
          {insightsByKey.discrepancy && (
            <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                <Button variant="ghost" size="sm" onClick={() => clearInsight('discrepancy')}>
                  Clear
                </Button>
              </div>
              <ChatMarkdown role="model" content={insightsByKey.discrepancy} />
            </div>
          )}
        </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Request Status Report</h2>
              <p className="mt-1 text-sm text-slate-500">Unit: requests</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                isLoading={insightLoadingKey === 'request_status'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'request_status'}
                onClick={() => handleInsightRequest('request_status', { requestStatusSummary })}
              >
                Insight
              </Button>
            </div>
          </div>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <KpiCard title="Total requests" value={requestStatusSummary.reduce((s, r) => s + r.value, 0)} />
            <KpiCard title="Completed" value={requestStatusSummary.find((r) => r.name === 'Completed')?.value ?? 0} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 relative">
              <Pie
                data={{
                  labels: requestStatusSummary.map((d) => d.name),
                  datasets: [
                    {
                      data: requestStatusSummary.map((d) => d.value),
                      backgroundColor: requestStatusSummary.map((_, i) => COLORS[i % COLORS.length]),
                    },
                  ],
                }}
                options={pieAnimatedOptions}
              />
            </div>
            <div className="h-72 relative">
              <Bar
                data={{
                  labels: requestStatusSummary.map((d) => d.name),
                  datasets: [
                    {
                      label: 'Count',
                      data: requestStatusSummary.map((d) => d.value),
                      backgroundColor: '#0ea5e9',
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    title: { display: true, text: 'Request status count', color: '#0f172a', font: { size: 13, weight: 'bold' } },
                    subtitle: { display: true, text: `Updated: ${lastUpdated ?? '--:--:--'} • Unit: requests`, color: '#64748b' },
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${(ctx.raw ?? 0).toLocaleString('en-US')}` } },
                  },
                  scales: {
                    x: { title: { display: true, text: 'Status' } },
                    y: { beginAtZero: true, title: { display: true, text: 'Requests (count)' } },
                  },
                }}
              />
            </div>
          </div>
          {insightsByKey.request_status && (
            <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                <Button variant="ghost" size="sm" onClick={() => clearInsight('request_status')}>
                  Clear
                </Button>
              </div>
              <ChatMarkdown role="model" content={insightsByKey.request_status} />
            </div>
          )}
        </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Top Products by Quantity</h2>
              <p className="mt-1 text-sm text-slate-500">Unit: quantity</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              isLoading={insightLoadingKey === 'top_products'}
              disabled={insightLoadingKey !== null && insightLoadingKey !== 'top_products'}
              onClick={() => handleInsightRequest('top_products', { topProductsByQuantity })}
            >
              Insight
            </Button>
          </div>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <KpiCard title="Products shown" value={topProductsSummary.productCount} />
            <KpiCard title="Total moved quantity" value={totalFormat(topProductsSummary.totalMoved)} />
          </div>
          <div className="h-72 relative">
            <Bar
              data={{
                labels: topProductsByQuantity.map((d) => d.item),
                datasets: [
                  {
                    label: 'Inbound quantity',
                    data: topProductsByQuantity.map((d) => d.inbound),
                    backgroundColor: '#0ea5e9',
                    stack: 'q',
                  },
                  {
                    label: 'Outbound quantity',
                    data: topProductsByQuantity.map((d) => d.outbound),
                    backgroundColor: '#6366f1',
                    stack: 'q',
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  title: { display: true, text: 'Top moved products', color: '#0f172a', font: { size: 13, weight: 'bold' } },
                  subtitle: { display: true, text: `Updated: ${lastUpdated ?? '--:--:--'} • Unit: quantity`, color: '#64748b' },
                  legend: { position: 'bottom' },
                  tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${(ctx.raw ?? 0).toLocaleString('en-US')}` } },
                },
                indexAxis: 'y',
                scales: {
                  x: { stacked: true, beginAtZero: true, title: { display: true, text: 'Quantity (units)' } },
                  y: { stacked: true, title: { display: true, text: 'Product' } },
                },
              }}
            />
          </div>
          {insightsByKey.top_products && (
            <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                <Button variant="ghost" size="sm" onClick={() => clearInsight('top_products')}>
                  Clear
                </Button>
              </div>
              <ChatMarkdown role="model" content={insightsByKey.top_products} />
            </div>
          )}
        </section>
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function totalFormat(value: number): string {
  return value.toLocaleString('en-US');
}

