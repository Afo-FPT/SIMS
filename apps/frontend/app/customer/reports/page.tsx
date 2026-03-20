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
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

type ReportTab =
  | 'io_history'
  | 'turnover'
  | 'discrepancy'
  | 'alerts';

function monthKey(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function CustomerReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReportTab>('io_history');
  const [storedItems, setStoredItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
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
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const ioTrend = useMemo(() => {
    const map = new Map<string, { month: string; inbound: number; outbound: number }>();
    requests.forEach((r) => {
      const key = monthKey(r.updated_at || r.created_at);
      if (!map.has(key)) map.set(key, { month: key, inbound: 0, outbound: 0 });
      const row = map.get(key)!;
      const qty = r.items.reduce((sum: number, i: any) => sum + (i.quantity_actual ?? i.quantity_requested ?? 0), 0);
      if (r.request_type === 'IN') row.inbound += qty;
      else row.outbound += qty;
    });
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  }, [requests]);

  const turnoverByProduct = useMemo(() => {
    const inMap = new Map<string, number>();
    const outMap = new Map<string, number>();
    requests.forEach((r) => {
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
  }, [requests, storedItems]);

  const discrepancyRows = useMemo(() => {
    return cycleCounts.map((c) => {
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
  }, [cycleCounts]);

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

  const alertsData = useMemo(() => {
    const lowStock = storedItems.filter((i) => i.quantity < 50).length;
    const discrepancy = discrepancyRows.filter((r) => r.discrepancy > 0).length;
    const pendingConfirm = cycleCounts.filter((c) => c.status === 'STAFF_SUBMITTED').length;
    const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;
    return { lowStock, discrepancy, pendingConfirm, pendingRequests };
  }, [storedItems, discrepancyRows, cycleCounts, requests]);

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

      <div className="flex flex-wrap gap-2">
        {[
          ['io_history', 'Inbound/Outbound History'],
          ['turnover', 'Inventory Level & Turnover'],
          ['discrepancy', 'Checking & Discrepancy'],
          ['alerts', 'Alerts & Trend Insights'],
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

      {tab === 'alerts' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Alerts & Trend Insights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard title="Low Stock Alerts" value={alertsData.lowStock} icon="warning" />
            <KpiCard title="Discrepancy Events" value={alertsData.discrepancy} icon="report_problem" />
            <KpiCard title="Pending Confirmations" value={alertsData.pendingConfirm} icon="fact_check" />
            <KpiCard title="Pending Requests" value={alertsData.pendingRequests} icon="pending_actions" />
          </div>
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
        </section>
      )}
    </div>
  );
}

function KpiCard({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-primary">{icon}</span>
        <p className="text-xs uppercase font-black tracking-wider text-slate-500">{title}</p>
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
