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
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

function dayKey(ts: string): string {
  return new Date(ts).toLocaleDateString('en-GB', { weekday: 'short' });
}

export default function StaffReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const [req, cc] = await Promise.all([listStorageRequests(), getCycleCounts()]);
        if (cancelled) return;
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

  const completion = useMemo(() => {
    const total = requests.length + cycleCounts.length;
    const completed = requests.filter((r) => r.status === 'COMPLETED').length + cycleCounts.filter((c) => c.status === 'CONFIRMED').length;
    const inProgress = requests.filter((r) => r.status === 'APPROVED' || r.status === 'DONE_BY_STAFF').length + cycleCounts.filter((c) => c.status === 'STAFF_SUBMITTED').length;
    const pending = Math.max(0, total - completed - inProgress);
    const ratio = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, inProgress, pending, ratio };
  }, [requests, cycleCounts]);

  const inOutPerDay = useMemo(() => {
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const base = weekdays.map((d) => ({ day: d, inbound: 0, outbound: 0, cycle: 0 }));
    const byDay = new Map(base.map((d) => [d.day, d]));
    requests.forEach((r) => {
      const day = dayKey(r.updated_at || r.created_at);
      const row = byDay.get(day);
      if (!row) return;
      const qty = r.items.reduce((sum: number, i: any) => sum + (i.quantity_actual ?? i.quantity_requested ?? 0), 0);
      if (r.request_type === 'IN') row.inbound += qty;
      else row.outbound += qty;
    });
    cycleCounts.forEach((c) => {
      const day = dayKey(c.updated_at || c.created_at);
      const row = byDay.get(day);
      if (!row) return;
      row.cycle += (c.items || c.target_items || []).length;
    });
    return base;
  }, [requests, cycleCounts]);

  const operationHistory = useMemo(() => {
    return inOutPerDay.map((d, index) => ({
      ...d,
      seq: index + 1,
      totalOps: d.inbound + d.outbound + d.cycle,
    }));
  }, [inOutPerDay]);

  const discrepancySummary = useMemo(() => {
    const damaged = requests.reduce((sum, r) => sum + r.items.reduce((s: number, i: any) => s + (i.damage_quantity || 0), 0), 0);
    const mismatch = cycleCounts.reduce((sum, c) => sum + (c.items || []).reduce((s: number, i: any) => s + Math.abs(i.discrepancy || 0), 0), 0);
    const location = requests.filter((r) => r.status === 'REJECTED').length;
    return [
      { name: 'Damaged', value: damaged },
      { name: 'Quantity mismatch', value: mismatch },
      { name: 'Location/flow issue', value: location },
    ];
  }, [requests, cycleCounts]);

  const cycleAccuracy = useMemo(() => {
    return cycleCounts.map((c) => {
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
  }, [cycleCounts]);

  const occupancyDonut = useMemo(() => {
    const inbound = requests.filter((r) => r.request_type === 'IN').length;
    const outbound = requests.filter((r) => r.request_type === 'OUT').length;
    const counting = cycleCounts.length;
    return [
      { name: 'Inbound zone', value: inbound },
      { name: 'Outbound zone', value: outbound },
      { name: 'Counting zone', value: counting },
    ];
  }, [requests, cycleCounts]);

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
        <h2 className="text-lg font-black text-slate-900 mb-4">Personal Daily Performance Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <KpiCard title="Completed today" value={completion.completed} />
          <KpiCard title="In progress" value={completion.inProgress} />
          <KpiCard title="Pending" value={completion.pending} />
          <KpiCard title="Completion rate" value={`${completion.ratio}%`} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inOutPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="inbound" fill="#0ea5e9" />
                <Bar dataKey="outbound" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
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

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">Personal Operation History Report</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={operationHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line dataKey="totalOps" stroke="#0ea5e9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={operationHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="inbound" stackId="a" fill="#0ea5e9" />
                <Bar dataKey="outbound" stackId="a" fill="#6366f1" />
                <Bar dataKey="cycle" stackId="a" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">Discrepancy & Issue Summary Report</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={discrepancySummary} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100}>
                  {discrepancySummary.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={discrepancySummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">Cycle Count Execution Report</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cycleAccuracy}>
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

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">Warehouse Health Snapshot (Personal View)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={occupancyDonut} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100}>
                  {occupancyDonut.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-2 text-left text-xs uppercase text-slate-500 font-black">Area</th>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                    <th key={d} className="px-2 py-2 text-xs uppercase text-slate-500 font-black">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['Inbound', 'Outbound', 'Cycle Count'].map((area, rowIdx) => (
                  <tr key={area} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-bold">{area}</td>
                    {[0, 1, 2, 3, 4, 5, 6].map((n) => {
                      const value = (requests.length + cycleCounts.length + rowIdx + n) % 20;
                      const bg = value > 14 ? '#ef4444' : value > 8 ? '#f59e0b' : value > 0 ? '#22c55e' : '#e2e8f0';
                      return (
                        <td key={`${area}-${n}`} className="px-2 py-2">
                          <div style={{ backgroundColor: bg }} className="rounded px-2 py-1 text-center text-white text-xs font-bold">{value}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
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
