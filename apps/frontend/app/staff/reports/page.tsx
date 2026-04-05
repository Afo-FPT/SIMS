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
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import { requestReportInsight } from '../../../lib/ai-insights.api';
import {
  type QuickPreset,
  pad2,
  parseLocalDateStart,
  parseLocalDateEndOfDay,
  defaultReportDateRange,
} from '../../../lib/report-date-range';
import { ChartDateFilterBar } from '../../../components/reports/ChartDateFilterBar';
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

type Granularity = 'day' | 'month' | 'year';

/** Pick day / month / year buckets from range length (no manual control). */
function inferInOutChartGranularity(startIso: string, endIso: string): Granularity {
  const startMs = parseLocalDateStart(startIso);
  const endMs = parseLocalDateEndOfDay(endIso);
  if (endMs < startMs) return 'day';
  const approxDays = (endMs - startMs) / 86400000;
  if (approxDays <= 45) return 'day';
  if (approxDays <= 550) return 'month';
  return 'year';
}

const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatYearMonthKey(ymKey: string): string {
  const [y, m] = ymKey.split('-').map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return ymKey;
  return `${SHORT_MONTH_NAMES[m - 1]} ${y}`;
}

/** Classify warehouse/zone context from real names (no DB type field). */
function classifyWarehouseUsageLabel(text: string): 'Cold storage' | 'Small/Large' | 'Normal' {
  const t = (text || '').toLowerCase();
  if (/cold|lạnh|frozen|freeze|chill|refrigerat|cooler/.test(t)) return 'Cold storage';
  if (/\bsmall\b|\blarge\b|\bxl\b|\bsml\b|bulk|oversize|quá khổ|micro|mega/.test(t)) return 'Small/Large';
  return 'Normal';
}

function storageContextText(r: {
  warehouse_name?: string;
  requested_zone_code?: string;
  items?: Array<{ zone_code?: string }>;
}): string {
  const parts = [r.warehouse_name || '', r.requested_zone_code || ''];
  (r.items || []).forEach((i) => parts.push(i.zone_code || ''));
  return parts.join(' ').trim() || 'normal';
}

function isStorageCompleted(status: string): boolean {
  return status === 'COMPLETED';
}

function isStoragePending(status: string): boolean {
  if (status === 'REJECTED') return false;
  return !isStorageCompleted(status);
}

function isCycleCompleted(status: string): boolean {
  return status === 'CONFIRMED';
}

function isCyclePending(status: string): boolean {
  if (status === 'REJECTED') return false;
  return !isCycleCompleted(status);
}

function localYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function enumerateBucketLabels(startIso: string, endIso: string, g: Granularity): string[] {
  const startMs = parseLocalDateStart(startIso);
  const endMs = parseLocalDateEndOfDay(endIso);
  if (startMs > endMs) return [];

  const labels: string[] = [];
  if (g === 'day') {
    const d = new Date(startMs);
    d.setHours(0, 0, 0, 0);
    while (d.getTime() <= endMs) {
      labels.push(localYmd(d));
      d.setDate(d.getDate() + 1);
    }
    return labels;
  }
  if (g === 'month') {
    const start = new Date(startMs);
    const end = new Date(endMs);
    const d = new Date(start.getFullYear(), start.getMonth(), 1);
    const endCap = new Date(end.getFullYear(), end.getMonth(), 1);
    while (d <= endCap) {
      labels.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
      d.setMonth(d.getMonth() + 1);
    }
    return labels;
  }
  const start = new Date(startMs);
  const end = new Date(endMs);
  const y0 = start.getFullYear();
  const y1 = end.getFullYear();
  for (let y = y0; y <= y1; y++) labels.push(String(y));
  return labels;
}

function bucketKeyFromCreatedAt(createdAt: string | Date, g: Granularity): string | null {
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  if (g === 'day') return localYmd(d);
  if (g === 'month') return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  return String(d.getFullYear());
}

/** Use created_at when present; otherwise updated_at (some payloads omit creation time). */
function activityInstant(e: { created_at?: string; updated_at?: string }): Date | undefined {
  const raw = e.created_at ?? e.updated_at;
  if (raw == null || raw === '') return undefined;
  const d = new Date(raw as string);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function formatBucketLabel(label: string, g: Granularity): string {
  if (g === 'day') {
    const [y, m, day] = label.split('-');
    return `${m}/${day}/${y.slice(2)}`;
  }
  if (g === 'month') return label;
  return label;
}

const CHART_KEYS = {
  inout: 'staff_report_inout_column',
  stacked: 'staff_report_status_stacked',
  pie: 'staff_report_warehouse_pie',
} as const;

export default function StaffReportsPage() {
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRange = defaultReportDateRange();
  const [inOutStart, setInOutStart] = useState(initRange.start);
  const [inOutEnd, setInOutEnd] = useState(initRange.end);
  const [inOutPreset, setInOutPreset] = useState<QuickPreset | null>(null);

  const [statusStart, setStatusStart] = useState(initRange.start);
  const [statusEnd, setStatusEnd] = useState(initRange.end);
  const [statusPreset, setStatusPreset] = useState<QuickPreset | null>(null);

  const [warehouseStart, setWarehouseStart] = useState(initRange.start);
  const [warehouseEnd, setWarehouseEnd] = useState(initRange.end);
  const [warehousePreset, setWarehousePreset] = useState<QuickPreset | null>(null);

  const [requests, setRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);
  const [aiInsightsByKey, setAiInsightsByKey] = useState<Record<string, string>>({});
  const [insightLoadingKey, setInsightLoadingKey] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function run() {
      try {
        if (!hasLoaded) setLoading(true);
        setError(null);
        const [req, cc] = await Promise.all([
          listStorageRequests({ allAssigned: true }),
          getCycleCounts(),
        ]);
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

  const inOutFromMs = useMemo(() => parseLocalDateStart(inOutStart), [inOutStart]);
  const inOutToMs = useMemo(() => parseLocalDateEndOfDay(inOutEnd), [inOutEnd]);

  const filteredRequestsInOut = useMemo(() => {
    return requests.filter((r) => {
      const d = activityInstant(r);
      if (!d) return false;
      const t = d.getTime();
      return t >= inOutFromMs && t <= inOutToMs;
    });
  }, [requests, inOutFromMs, inOutToMs]);

  const statusFromMs = useMemo(() => parseLocalDateStart(statusStart), [statusStart]);
  const statusToMs = useMemo(() => parseLocalDateEndOfDay(statusEnd), [statusEnd]);

  const statusMonthKeys = useMemo(
    () => enumerateBucketLabels(statusStart, statusEnd, 'month'),
    [statusStart, statusEnd],
  );

  const statusMonthDisplayLabels = useMemo(
    () => statusMonthKeys.map(formatYearMonthKey),
    [statusMonthKeys],
  );

  const warehouseFromMs = useMemo(() => parseLocalDateStart(warehouseStart), [warehouseStart]);
  const warehouseToMs = useMemo(() => parseLocalDateEndOfDay(warehouseEnd), [warehouseEnd]);

  const filteredRequestsWarehouse = useMemo(() => {
    return requests.filter((r) => {
      const d = activityInstant(r);
      if (!d) return false;
      const t = d.getTime();
      return t >= warehouseFromMs && t <= warehouseToMs;
    });
  }, [requests, warehouseFromMs, warehouseToMs]);

  const filteredCycleWarehouse = useMemo(() => {
    return cycleCounts.filter((c) => {
      const d = activityInstant(c);
      if (!d) return false;
      const t = d.getTime();
      return t >= warehouseFromMs && t <= warehouseToMs;
    });
  }, [cycleCounts, warehouseFromMs, warehouseToMs]);

  const inOutGranularity = useMemo(
    () => inferInOutChartGranularity(inOutStart, inOutEnd),
    [inOutStart, inOutEnd],
  );

  const inOutBuckets = useMemo(() => {
    const labelsRaw = enumerateBucketLabels(inOutStart, inOutEnd, inOutGranularity);
    const inbound = labelsRaw.map(() => 0);
    const outbound = labelsRaw.map(() => 0);
    const idx = new Map(labelsRaw.map((l, i) => [l, i]));

    filteredRequestsInOut.forEach((r) => {
      const d = activityInstant(r);
      if (!d) return;
      const k = bucketKeyFromCreatedAt(d, inOutGranularity);
      if (k == null) return;
      const i = idx.get(k);
      if (i === undefined) return;
      if (r.request_type === 'IN') inbound[i] += 1;
      else if (r.request_type === 'OUT') outbound[i] += 1;
    });

    const labels = labelsRaw.map((l) => formatBucketLabel(l, inOutGranularity));
    return { labelsRaw, labels, inbound, outbound };
  }, [filteredRequestsInOut, inOutStart, inOutEnd, inOutGranularity]);

  const monthlyStatus = useMemo(() => {
    const labels = statusMonthKeys;
    const completed = labels.map(() => 0);
    const pending = labels.map(() => 0);
    const idx = new Map(labels.map((l, i) => [l, i]));

    const inWindow = (t: number) => t >= statusFromMs && t <= statusToMs;

    requests.forEach((r) => {
      const d = activityInstant(r);
      if (!d) return;
      const t = d.getTime();
      if (!inWindow(t)) return;
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      const i = idx.get(key);
      if (i === undefined) return;
      if (isStorageCompleted(r.status)) completed[i] += 1;
      else if (isStoragePending(r.status)) pending[i] += 1;
    });

    cycleCounts.forEach((c) => {
      const d = activityInstant(c);
      if (!d) return;
      const t = d.getTime();
      if (!inWindow(t)) return;
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      const i = idx.get(key);
      if (i === undefined) return;
      if (isCycleCompleted(c.status)) completed[i] += 1;
      else if (isCyclePending(c.status)) pending[i] += 1;
    });

    return { completed, pending };
  }, [requests, cycleCounts, statusMonthKeys, statusFromMs, statusToMs]);

  const warehouseTypeCounts = useMemo(() => {
    const acc: Record<string, number> = { Normal: 0, 'Cold storage': 0, 'Small/Large': 0 };
    filteredRequestsWarehouse.forEach((r) => {
      const cat = classifyWarehouseUsageLabel(storageContextText(r));
      acc[cat] = (acc[cat] || 0) + 1;
    });
    filteredCycleWarehouse.forEach((c) => {
      const cat = classifyWarehouseUsageLabel(c.warehouse_name || '');
      acc[cat] = (acc[cat] || 0) + 1;
    });
    return acc;
  }, [filteredRequestsWarehouse, filteredCycleWarehouse]);

  const pieLabels = ['Normal', 'Cold storage', 'Small/Large'] as const;
  const pieData = pieLabels.map((l) => warehouseTypeCounts[l] || 0);
  const pieTotalTickets = pieData.reduce((a, b) => a + b, 0);
  const pieHasData = pieTotalTickets > 0;

  const pieChartSlices = pieLabels.map((label, i) => ({
    label,
    value: pieData[i] ?? 0,
    color: COLORS[i % COLORS.length],
  })).filter((s) => s.value > 0);

  async function handleInsightRequest(chartKey: string, rangeStart: string, rangeEnd: string, data: unknown) {
    try {
      setInsightError(null);
      setInsightLoadingKey(chartKey);
      const res = await requestReportInsight({ chartKey, startDate: rangeStart, endDate: rangeEnd, data });
      setAiInsightsByKey((prev) => ({ ...prev, [chartKey]: res.insight }));
    } catch (e) {
      setInsightError(e instanceof Error ? e.message : 'Failed to generate insight');
    } finally {
      setInsightLoadingKey(null);
    }
  }

  function clearAiInsight(chartKey: string) {
    setAiInsightsByKey((prev) => {
      if (!prev[chartKey]) return prev;
      const next = { ...prev };
      delete next[chartKey];
      return next;
    });
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Reports</h1>
        <LoadingSkeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (error) return <ErrorState title="Failed to load staff reports" message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Reports</h1>
      </div>

      {insightError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">{insightError}</div>
      )}

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1 pr-2">
            <h2 className="text-lg font-black text-slate-900">Inbound / outbound</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Column chart: inbound vs outbound storage request counts in this date range (buckets scale by how long the range is).
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            isLoading={insightLoadingKey === CHART_KEYS.inout}
            disabled={insightLoadingKey !== null && insightLoadingKey !== CHART_KEYS.inout}
            onClick={() =>
              handleInsightRequest(CHART_KEYS.inout, inOutStart, inOutEnd, {
                granularity: inOutGranularity,
                startDate: inOutStart,
                endDate: inOutEnd,
                labels: inOutBuckets.labels,
                inbound: inOutBuckets.inbound,
                outbound: inOutBuckets.outbound,
              })
            }
          >
            Insight
          </Button>
        </div>
        <ChartDateFilterBar
          startDate={inOutStart}
          endDate={inOutEnd}
          activePreset={inOutPreset}
          onStartChange={setInOutStart}
          onEndChange={setInOutEnd}
          onClearPreset={() => setInOutPreset(null)}
          onApplyPreset={(r, preset) => {
            setInOutStart(r.start);
            setInOutEnd(r.end);
            setInOutPreset(preset);
          }}
        />
        <div className="h-72">
          <Bar
            data={{
              labels: inOutBuckets.labels,
              datasets: [
                { label: 'Inbound', data: inOutBuckets.inbound, backgroundColor: '#0ea5e9' },
                { label: 'Outbound', data: inOutBuckets.outbound, backgroundColor: '#6366f1' },
              ],
            }}
            options={{
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } },
              scales: {
                x: { ticks: { maxRotation: 45, minRotation: 0, autoSkip: true } },
                y: { beginAtZero: true, ticks: { precision: 0 } },
              },
            }}
          />
        </div>
        {aiInsightsByKey[CHART_KEYS.inout] && (
          <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm space-y-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
              <Button variant="ghost" size="sm" onClick={() => clearAiInsight(CHART_KEYS.inout)}>
                Clear
              </Button>
            </div>
            <ChatMarkdown role="model" content={aiInsightsByKey[CHART_KEYS.inout]} />
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1 pr-2">
            <h2 className="text-lg font-black text-slate-900">Status by month</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Stacked column chart: completed vs pending storage requests and cycle counts, one month per column inside this date range.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            isLoading={insightLoadingKey === CHART_KEYS.stacked}
            disabled={insightLoadingKey !== null && insightLoadingKey !== CHART_KEYS.stacked}
            onClick={() =>
              handleInsightRequest(CHART_KEYS.stacked, statusStart, statusEnd, {
                rangeStart: statusStart,
                rangeEnd: statusEnd,
                monthLabels: statusMonthDisplayLabels,
                completed: monthlyStatus.completed,
                pending: monthlyStatus.pending,
              })
            }
          >
            Insight
          </Button>
        </div>
        <ChartDateFilterBar
          startDate={statusStart}
          endDate={statusEnd}
          activePreset={statusPreset}
          onStartChange={setStatusStart}
          onEndChange={setStatusEnd}
          onClearPreset={() => setStatusPreset(null)}
          onApplyPreset={(r, preset) => {
            setStatusStart(r.start);
            setStatusEnd(r.end);
            setStatusPreset(preset);
          }}
        />
        <div className="h-72">
          {statusMonthKeys.length === 0 ? (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">From ≤ To required.</div>
          ) : (
            <Bar
              data={{
                labels: statusMonthDisplayLabels,
                datasets: [
                  {
                    label: 'Completed',
                    data: monthlyStatus.completed,
                    backgroundColor: '#22c55e',
                    stack: 's',
                  },
                  {
                    label: 'Pending',
                    data: monthlyStatus.pending,
                    backgroundColor: '#f59e0b',
                    stack: 's',
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                  x: { stacked: true, ticks: { maxRotation: 45, minRotation: 0, autoSkip: true } },
                  y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
                },
              }}
            />
          )}
        </div>
        {aiInsightsByKey[CHART_KEYS.stacked] && (
          <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm space-y-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
              <Button variant="ghost" size="sm" onClick={() => clearAiInsight(CHART_KEYS.stacked)}>
                Clear
              </Button>
            </div>
            <ChatMarkdown role="model" content={aiInsightsByKey[CHART_KEYS.stacked]} />
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1 pr-2">
            <h2 className="text-lg font-black text-slate-900">Warehouse mix</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Pie chart: share of tickets by zone type (Normal, cold storage, small/large) inferred from warehouse and zone names in this date range.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            isLoading={insightLoadingKey === CHART_KEYS.pie}
            disabled={insightLoadingKey !== null && insightLoadingKey !== CHART_KEYS.pie}
            onClick={() =>
              handleInsightRequest(CHART_KEYS.pie, warehouseStart, warehouseEnd, {
                startDate: warehouseStart,
                endDate: warehouseEnd,
                counts: warehouseTypeCounts,
              })
            }
          >
            Insight
          </Button>
        </div>
        <ChartDateFilterBar
          startDate={warehouseStart}
          endDate={warehouseEnd}
          activePreset={warehousePreset}
          onStartChange={setWarehouseStart}
          onEndChange={setWarehouseEnd}
          onClearPreset={() => setWarehousePreset(null)}
          onApplyPreset={(r, preset) => {
            setWarehouseStart(r.start);
            setWarehouseEnd(r.end);
            setWarehousePreset(preset);
          }}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-5">
          {pieLabels.map((label, i) => {
            const n = pieData[i] ?? 0;
            const pct = pieTotalTickets ? Math.round((n / pieTotalTickets) * 100) : 0;
            return (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-center"
              >
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p>
                <p className="text-2xl font-black text-slate-900 tabular-nums">{n}</p>
                <p className="text-sm text-slate-600 tabular-nums">{pct}%</p>
              </div>
            );
          })}
        </div>

        <div className="relative mx-auto h-72 w-full min-w-0 max-w-lg">
          {pieHasData && pieChartSlices.length > 0 ? (
            <Pie
              key={`warehouse-mix-${warehouseStart}-${warehouseEnd}-${pieTotalTickets}`}
              data={{
                labels: pieChartSlices.map((s) => s.label),
                datasets: [
                  {
                    data: pieChartSlices.map((s) => s.value),
                    backgroundColor: pieChartSlices.map((s) => s.color),
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 8,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: 12 },
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: {
                    callbacks: {
                      label(ctx) {
                        const v = Number(ctx.raw);
                        const sum = pieChartSlices.reduce((a, s) => a + s.value, 0);
                        const pct = sum ? Math.round((v / sum) * 100) : 0;
                        return ` ${v} tickets (${pct}%)`;
                      },
                    },
                  },
                },
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-slate-500 px-4">No data in range.</div>
          )}
        </div>
        {aiInsightsByKey[CHART_KEYS.pie] && (
          <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm space-y-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
              <Button variant="ghost" size="sm" onClick={() => clearAiInsight(CHART_KEYS.pie)}>
                Clear
              </Button>
            </div>
            <ChatMarkdown role="model" content={aiInsightsByKey[CHART_KEYS.pie]} />
          </div>
        )}
      </section>
    </div>
  );
}
