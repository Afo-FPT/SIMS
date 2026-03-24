'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { listMyStoredItems } from '../../../lib/stored-items.api';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

type ReportTab =
  | 'io_history'
  | 'turnover'
  | 'discrepancy'
  | 'request_status'
  | 'top_products';

function monthKey(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function CustomerReportsPage() {
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReportTab>('io_history');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [storedItems, setStoredItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);

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
    const map = new Map<string, { month: string; inbound: number; outbound: number }>();
    filteredRequests.forEach((r) => {
      const key = monthKey(r.updated_at || r.created_at);
      if (!map.has(key)) map.set(key, { month: key, inbound: 0, outbound: 0 });
      const row = map.get(key)!;
      const qty = r.items.reduce((sum: number, i: any) => sum + (i.quantity_actual ?? i.quantity_requested ?? 0), 0);
      if (r.request_type === 'IN') row.inbound += qty;
      else row.outbound += qty;
    });
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  }, [filteredRequests]);

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
          <h2 className="text-lg font-black text-slate-900 mb-4">Inbound/Outbound History Report</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ioTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line dataKey="inbound" stroke="#0ea5e9" strokeWidth={2} />
                  <Line dataKey="outbound" stroke="#6366f1" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ioTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="inbound" fill="#0ea5e9" />
                  <Bar dataKey="outbound" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {tab === 'turnover' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Inventory Level & Turnover Report</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={turnoverByProduct}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="item" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" dataKey="stock" stroke="#0ea5e9" strokeWidth={2} />
                  <Line yAxisId="right" dataKey="turnover" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={turnoverByProduct}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="item" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="turnover" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {tab === 'discrepancy' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Inventory Checking & Discrepancy Report</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={discrepancyRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="id" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="system" fill="#0ea5e9" />
                  <Bar dataKey="actual" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={discrepancyPie} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100}>
                    {discrepancyPie.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {tab === 'request_status' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Request Status Overview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={requestStatusSummary} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100}>
                    {requestStatusSummary.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={requestStatusSummary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {tab === 'top_products' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Top Products by Quantity</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsByQuantity} layout="vertical" margin={{ left: 28, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickMargin={10} />
                <YAxis
                  dataKey="item"
                  type="category"
                  width={180}
                  tickMargin={10}
                  interval={0}
                />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: 8 }} />
                <Bar dataKey="inbound" stackId="q" fill="#0ea5e9" name="Inbound quantity" />
                <Bar dataKey="outbound" stackId="q" fill="#6366f1" name="Outbound quantity" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

