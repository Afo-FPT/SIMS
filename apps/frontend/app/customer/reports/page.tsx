'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { listMyStoredItems } from '../../../lib/stored-items.api';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Badge } from '../../../components/ui/Badge';

type ReportTab =
  | 'current_inventory'
  | 'io_history'
  | 'turnover'
  | 'request_status'
  | 'alerts';

function monthKey(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function CustomerReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReportTab>('current_inventory');
  const [storedItems, setStoredItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const [items, req] = await Promise.all([
          listMyStoredItems(),
          listStorageRequests(),
        ]);
        if (cancelled) return;
        setStoredItems(items);
        setRequests(req);
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

  const inventoryByWarehouseType = useMemo(() => {
    const map = new Map<string, number>();
    storedItems.forEach((i) => {
      const warehouseType = (i.shelf_code || 'STANDARD').includes('COLD') ? 'Cold' : 'Normal';
      map.set(warehouseType, (map.get(warehouseType) || 0) + i.quantity);
    });
    return [...map.entries()].map(([name, quantity]) => ({ name, quantity }));
  }, [storedItems]);

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

  const alertsData = useMemo(() => {
    const lowStock = storedItems.filter((i) => i.quantity < 50).length;
    const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;
    return { lowStock, pendingRequests };
  }, [storedItems, requests]);

  const requestStatusReport = useMemo(() => {
    const statusMap = new Map<string, number>([
      ['Pending', 0],
      ['In Progress', 0],
      ['Completed', 0],
      ['Cancelled', 0],
      ['Other', 0],
    ]);

    requests.forEach((r) => {
      const raw = String(r.status || '').trim().toUpperCase();
      if (raw === 'PENDING') statusMap.set('Pending', (statusMap.get('Pending') || 0) + 1);
      else if (raw === 'IN_PROGRESS' || raw === 'PROCESSING') {
        statusMap.set('In Progress', (statusMap.get('In Progress') || 0) + 1);
      } else if (raw === 'COMPLETED' || raw === 'DONE' || raw === 'APPROVED') {
        statusMap.set('Completed', (statusMap.get('Completed') || 0) + 1);
      } else if (raw === 'CANCELLED' || raw === 'REJECTED') {
        statusMap.set('Cancelled', (statusMap.get('Cancelled') || 0) + 1);
      } else {
        statusMap.set('Other', (statusMap.get('Other') || 0) + 1);
      }
    });

    const data = [...statusMap.entries()].map(([status, count]) => ({ status, count }));
    const total = data.reduce((sum, row) => sum + row.count, 0);
    const top = data.reduce((best, row) => (row.count > best.count ? row : best), data[0] || { status: 'N/A', count: 0 });

    return { data, total, top };
  }, [requests]);

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
          ['current_inventory', 'Current Inventory'],
          ['io_history', 'Inbound/Outbound History'],
          ['turnover', 'Inventory Level & Turnover'],
          ['request_status', 'Request Status Overview'],
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

      {tab === 'current_inventory' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-black text-slate-900">Current Inventory Report</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryByWarehouseType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantity" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {storedItems.slice(0, 6).map((item) => {
                const min = 50;
                const max = 300;
                const ratio = Math.min(100, Math.round((item.quantity / max) * 100));
                const color = item.quantity < min ? 'bg-red-500' : item.quantity < min * 1.5 ? 'bg-amber-500' : 'bg-emerald-500';
                return (
                  <div key={item.stored_item_id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <p className="font-bold text-slate-900">{item.item_name}</p>
                      <Badge variant={item.quantity < min ? 'error' : item.quantity < min * 1.5 ? 'warning' : 'success'}>{item.quantity} {item.unit}</Badge>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color}`} style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

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

      {tab === 'request_status' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-black text-slate-900">Request Status Overview Report</h2>
              <p className="text-sm text-slate-500 mt-1">See how your service requests are distributed by processing status.</p>
            </div>
            <Badge variant="info">Total requests: {requestStatusReport.total}</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={requestStatusReport.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="lg:col-span-2 space-y-3">
              {requestStatusReport.data.map((row) => {
                const pct = requestStatusReport.total > 0 ? Math.round((row.count / requestStatusReport.total) * 100) : 0;
                return (
                  <div key={row.status} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-bold text-slate-900">{row.status}</p>
                      <p className="font-bold text-slate-700">{row.count}</p>
                    </div>
                    <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{pct}% of all requests</p>
                  </div>
                );
              })}
              <div className="rounded-2xl bg-sky-50 border border-sky-100 p-3 text-sm text-slate-700">
                Most common status: <span className="font-bold">{requestStatusReport.top.status}</span> ({requestStatusReport.top.count} requests)
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === 'alerts' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Alerts & Trend Insights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
            <KpiCard title="Low Stock Alerts" value={alertsData.lowStock} icon="warning" />
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
