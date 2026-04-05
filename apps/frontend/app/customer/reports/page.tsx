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
import { listMyStoredItems } from '../../../lib/stored-items.api';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import { requestReportInsight } from '../../../lib/ai-insights.api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
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

type ReportTab =
  | 'io_history'
  | 'turnover'
  | 'discrepancy'
  | 'request_status'
  | 'top_products';

type HistoryGranularity = 'day' | 'week' | 'month';

function monthKey(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function dayKey(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekKey(ts: string): string {
  const d = new Date(ts);
  const day = d.getDay() || 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function toWeekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
  })}`;
}

export default function CustomerReportsPage() {
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReportTab>('io_history');
  const [historyGranularity, setHistoryGranularity] = useState<HistoryGranularity>('day');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [storedItems, setStoredItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);

  const [insightsByKey, setInsightsByKey] = useState<Record<string, string>>({});
  const [insightLoadingKey, setInsightLoadingKey] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function run() {
      try {
        if (!hasLoaded) setLoading(true);
        setError(null);
        const [items, req, cc] = await Promise.all([
          listMyStoredItems(),
          listStorageRequests(),
          getCycleCounts(),
        ]);
        if (cancelled) return;
        setStoredItems(items);
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

  useEffect(() => {
    setInsightsByKey({});
    setInsightLoadingKey(null);
    setInsightError(null);
  }, [startDate, endDate, tab]);

  const filteredRequests = useMemo(() => {
    if (!startDate || !endDate) return requests;
    const from = new Date(startDate);
    const to = new Date(endDate);
    to.setHours(23, 59, 59, 999);
    return requests.filter((r) => {
      const t = new Date(r.updated_at || r.created_at);
      return t >= from && t <= to;
    });
  }, [requests, startDate, endDate]);

  const filteredCycleCounts = useMemo(() => {
    if (!startDate || !endDate) return cycleCounts;
    const from = new Date(startDate);
    const to = new Date(endDate);
    to.setHours(23, 59, 59, 999);
    return cycleCounts.filter((c) => {
      const t = new Date(c.updated_at || c.created_at);
      return t >= from && t <= to;
    });
  }, [cycleCounts, startDate, endDate]);

  const ioTrend = useMemo(() => {
    const map = new Map<string, { key: string; periodLabel: string; inbound: number; outbound: number }>();
    filteredRequests.forEach((r) => {
      const ts = r.updated_at || r.created_at;
      const key = historyGranularity === 'day' ? dayKey(ts) : historyGranularity === 'week' ? weekKey(ts) : monthKey(ts);
      const periodLabel = historyGranularity === 'week' ? toWeekLabel(key) : key;
      if (!map.has(key)) map.set(key, { key, periodLabel, inbound: 0, outbound: 0 });
      const row = map.get(key)!;
      const qty = r.items.reduce((sum: number, i: any) => sum + (i.quantity_actual ?? i.quantity_requested ?? 0), 0);
      if (r.request_type === 'IN') row.inbound += qty;
      else row.outbound += qty;
    });
    const maxPoints = historyGranularity === 'day' ? 14 : 12;
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-maxPoints);
  }, [filteredRequests, historyGranularity]);

  const turnoverByProduct = useMemo(() => {
    const inMap = new Map<string, number>();
    const outMap = new Map<string, number>();
    filteredRequests.forEach((r) => {
      r.items.forEach((i: any) => {
        const qty = i.quantity_actual ?? i.quantity_requested ?? 0;
        if (r.request_type === 'IN') inMap.set(i.item_name, (inMap.get(i.item_name) || 0) + qty);
        else outMap.set(i.item_name, (outMap.get(i.item_name) || 0) + qty);
      });
    });
    return storedItems.slice(0, 12).map((item) => {
      const inQty = inMap.get(item.item_name) || 0;
      const outQty = outMap.get(item.item_name) || 0;
      const avgStock = Math.max(1, item.quantity);
      return {
        item: item.item_name,
        stock: item.quantity,
        turnover: Number(((inQty + outQty) / avgStock).toFixed(2)),
      };
    });
  }, [filteredRequests, storedItems]);

  const discrepancyRows = useMemo(() => {
    return filteredCycleCounts.map((c) => {
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
  }, [filteredCycleCounts]);

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
    const pending = filteredRequests.filter((r) => r.status === 'PENDING').length;
    const inProgress = filteredRequests.filter((r) => r.status === 'APPROVED' || r.status === 'DONE_BY_STAFF').length;
    const completed = filteredRequests.filter((r) => r.status === 'COMPLETED').length;
    const rejected = filteredRequests.filter((r) => r.status === 'REJECTED').length;
    return [
      { name: 'Pending', value: pending },
      { name: 'In progress', value: inProgress },
      { name: 'Completed', value: completed },
      { name: 'Rejected', value: rejected },
    ];
  }, [filteredRequests]);

  const topProductsByQuantity = useMemo(() => {
    const map = new Map<string, { item: string; inbound: number; outbound: number }>();
    filteredRequests.forEach((r) => {
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
  }, [filteredRequests]);

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
      plugins: { legend: { position: 'bottom' as const } },
    }),
    [],
  );

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

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reports</h1>
          <p className="text-slate-500 mt-1">Track your warehouse operations and inventory performance in one place</p>
        </div>
        <LoadingSkeleton className="h-64 rounded-3xl" />
      </div>
    );
  }
  if (error) return <ErrorState title="Failed to load customer reports" message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reports</h1>
        <p className="text-slate-500 mt-1">Track your warehouse operations and inventory performance in one place</p>
      </div>
      {insightError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">
          {insightError}
        </div>
      )}

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Report Filters</h2>
            <p className="text-sm text-slate-500 mt-1">Select date range for report data</p>
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
              <button
                type="button"
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(start.getDate() - 30);
                  setStartDate(start.toISOString().slice(0, 10));
                  setEndDate(end.toISOString().slice(0, 10));
                }}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Last 30 days
              </button>
              <button
                type="button"
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(start.getDate() - 90);
                  setStartDate(start.toISOString().slice(0, 10));
                  setEndDate(end.toISOString().slice(0, 10));
                }}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Last 90 days
              </button>
            </div>
            <Button onClick={() => window.location.reload()}>Refresh</Button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          ['io_history', 'Inbound/Outbound History'],
          ['turnover', 'Inventory Level & Turnover'],
          ['discrepancy', 'Checking & Discrepancy'],
          ['request_status', 'Request Status Overview'],
          ['top_products', 'Top Products by Quantity'],
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

      {tab === 'io_history' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-900">Inbound/Outbound History Report</h2>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Granularity</p>
              <select
                value={historyGranularity}
                onChange={(e) => setHistoryGranularity(e.target.value as HistoryGranularity)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white"
              >
                <option value="day">By day</option>
                <option value="week">By week</option>
                <option value="month">By month</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 z-10"
                isLoading={insightLoadingKey === 'io_history_line'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'io_history_line'}
                onClick={() => handleInsightRequest('io_history_line', { ioTrend, historyGranularity })}
              >
                Insight
              </Button>
              <Line
                data={{
                  labels: ioTrend.map((d) => d.periodLabel),
                  datasets: [
                    { label: 'Inbound', data: ioTrend.map((d) => d.inbound), borderColor: '#0ea5e9', backgroundColor: '#0ea5e9', tension: 0.3 },
                    { label: 'Outbound', data: ioTrend.map((d) => d.outbound), borderColor: '#6366f1', backgroundColor: '#6366f1', tension: 0.3 },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom' } },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
            <div className="h-72 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 z-10"
                isLoading={insightLoadingKey === 'io_history_bar'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'io_history_bar'}
                onClick={() => handleInsightRequest('io_history_bar', { ioTrend, historyGranularity })}
              >
                Insight
              </Button>
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
                  plugins: { legend: { position: 'bottom' } },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
          </div>
          {insightsByKey.io_history_line && (
            <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                <Button variant="ghost" size="sm" onClick={() => clearInsight('io_history_line')}>
                  Clear
                </Button>
              </div>
              <ChatMarkdown role="model" content={insightsByKey.io_history_line} />
            </div>
          )}
          {insightsByKey.io_history_bar && (
            <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                <Button variant="ghost" size="sm" onClick={() => clearInsight('io_history_bar')}>
                  Clear
                </Button>
              </div>
              <ChatMarkdown role="model" content={insightsByKey.io_history_bar} />
            </div>
          )}
        </section>
      )}

      {tab === 'turnover' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Inventory Level & Turnover Report</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 z-10"
                isLoading={insightLoadingKey === 'turnover_line'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'turnover_line'}
                onClick={() => handleInsightRequest('turnover_line', { turnoverByProduct })}
              >
                Insight
              </Button>
              <ChartJSComponent
                type="line"
                data={{
                  labels: turnoverByProduct.map((d) => d.item),
                  datasets: [
                    {
                      label: 'Stock',
                      data: turnoverByProduct.map((d) => d.stock),
                      borderColor: '#0ea5e9',
                      backgroundColor: '#0ea5e9',
                      yAxisID: 'y',
                      tension: 0.3,
                    },
                    {
                      label: 'Turnover',
                      data: turnoverByProduct.map((d) => d.turnover),
                      borderColor: '#f59e0b',
                      backgroundColor: '#f59e0b',
                      yAxisID: 'y1',
                      tension: 0.3,
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom' } },
                  scales: {
                    y: { position: 'left', beginAtZero: true },
                    y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } },
                  },
                }}
              />
            </div>
            <div className="h-72 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 z-10"
                isLoading={insightLoadingKey === 'turnover_bar'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'turnover_bar'}
                onClick={() => handleInsightRequest('turnover_bar', { turnoverByProduct })}
              >
                Insight
              </Button>
              <Bar
                data={{
                  labels: turnoverByProduct.map((d) => d.item),
                  datasets: [
                    {
                      label: 'Turnover',
                      data: turnoverByProduct.map((d) => d.turnover),
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
          {insightsByKey.turnover_line && (
            <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                <Button variant="ghost" size="sm" onClick={() => clearInsight('turnover_line')}>
                  Clear
                </Button>
              </div>
              <ChatMarkdown role="model" content={insightsByKey.turnover_line} />
            </div>
          )}
          {insightsByKey.turnover_bar && (
            <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                <Button variant="ghost" size="sm" onClick={() => clearInsight('turnover_bar')}>
                  Clear
                </Button>
              </div>
              <ChatMarkdown role="model" content={insightsByKey.turnover_bar} />
            </div>
          )}
        </section>
      )}

      {tab === 'discrepancy' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Inventory Checking & Discrepancy Report</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 z-10"
                isLoading={insightLoadingKey === 'discrepancy_bar'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'discrepancy_bar'}
                onClick={() => handleInsightRequest('discrepancy_bar', { discrepancyRows })}
              >
                Insight
              </Button>
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
                  plugins: { legend: { position: 'bottom' } },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
            <div className="h-72 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 z-10"
                isLoading={insightLoadingKey === 'discrepancy_pie'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'discrepancy_pie'}
                onClick={() => handleInsightRequest('discrepancy_pie', { discrepancyPie })}
              >
                Insight
              </Button>
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
          {insightsByKey.discrepancy_bar && (
            <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                <Button variant="ghost" size="sm" onClick={() => clearInsight('discrepancy_bar')}>
                  Clear
                </Button>
              </div>
              <ChatMarkdown role="model" content={insightsByKey.discrepancy_bar} />
            </div>
          )}
          {insightsByKey.discrepancy_pie && (
            <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                <Button variant="ghost" size="sm" onClick={() => clearInsight('discrepancy_pie')}>
                  Clear
                </Button>
              </div>
              <ChatMarkdown role="model" content={insightsByKey.discrepancy_pie} />
            </div>
          )}
        </section>
      )}

      {tab === 'request_status' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Request Status Overview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 z-10"
                isLoading={insightLoadingKey === 'request_status_pie'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'request_status_pie'}
                onClick={() => handleInsightRequest('request_status_pie', { requestStatusSummary })}
              >
                Insight
              </Button>
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
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 z-10"
                isLoading={insightLoadingKey === 'request_status_bar'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'request_status_bar'}
                onClick={() => handleInsightRequest('request_status_bar', { requestStatusSummary })}
              >
                Insight
              </Button>
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
                  plugins: { legend: { position: 'bottom' } },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
          </div>
          {insightsByKey.request_status_pie && (
            <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                <Button variant="ghost" size="sm" onClick={() => clearInsight('request_status_pie')}>
                  Clear
                </Button>
              </div>
              <ChatMarkdown role="model" content={insightsByKey.request_status_pie} />
            </div>
          )}
          {insightsByKey.request_status_bar && (
            <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                <Button variant="ghost" size="sm" onClick={() => clearInsight('request_status_bar')}>
                  Clear
                </Button>
              </div>
              <ChatMarkdown role="model" content={insightsByKey.request_status_bar} />
            </div>
          )}
        </section>
      )}

      {tab === 'top_products' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Top Products by Quantity</h2>
          <div className="h-72 relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-10 right-0 z-10"
              isLoading={insightLoadingKey === 'top_products'}
              disabled={insightLoadingKey !== null && insightLoadingKey !== 'top_products'}
              onClick={() => handleInsightRequest('top_products', { topProductsByQuantity })}
            >
              Insight
            </Button>
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
                plugins: { legend: { position: 'bottom' } },
                indexAxis: 'y',
                scales: { x: { stacked: true, beginAtZero: true }, y: { stacked: true } },
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
      )}
    </div>
  );
}

