'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts';

import { getManagerReport, type ReportGranularity } from '../../../lib/reports.api';
import { useToastHelpers } from '../../../lib/toast';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import type {
  ManagerReportTrendPoint,
  ManagerReportAnomaly,
  ManagerReportExpiringAndCapacity,
  ManagerReportExpiringContractItem,
} from '../../../types/manager';

const COLORS = ['#0f172a', '#334155', '#475569', '#94a3b8', '#e2e8f0'];
const INBOUND_COLOR = '#006c75';
const OUTBOUND_COLOR = '#0f172a';
const GANTT_COLORS = ['#006c75', '#0f172a', '#475569', '#64748b', '#94a3b8'];

export default function ManagerReportsPage() {
  const toast = useToastHelpers();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-04-30');

  const [stats, setStats] = useState({
    inbound: 0,
    outbound: 0,
    completion: 0,
    discrepancies: 0
  });

  const [capacityData, setCapacityData] = useState<{ name: string; value: number }[]>([]);
  const [inventoryData, setInventoryData] = useState<{ name: string; qty: number }[]>([]);
  const [trendData, setTrendData] = useState<ManagerReportTrendPoint[]>([]);
  const [anomalies, setAnomalies] = useState<ManagerReportAnomaly[]>([]);
  const [expiringAndCapacity, setExpiringAndCapacity] = useState<ManagerReportExpiringAndCapacity | null>(null);
  const [granularity, setGranularity] = useState<ReportGranularity>('day');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!startDate || !endDate) return;

        const report = await getManagerReport(startDate, endDate, granularity);

        setStats(report.stats);
        setCapacityData(report.capacityData?.length ? report.capacityData : [
          { name: 'Occupied', value: 0 },
          { name: 'Empty', value: 100 },
        ]);
        setInventoryData(report.inventoryData ?? []);
        setTrendData(report.trendData ?? []);
        setAnomalies(report.anomalies ?? []);
        setExpiringAndCapacity(report.expiringAndCapacity ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reports');
        toast.error('Failed to load report data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, granularity]);

  // ====================== EXPORT CSV ======================
  const handleExportCSV = () => {
    try {
      const now = new Date().toISOString().slice(0, 10);
      const filename = `SIMS-AI_Operational_Report_${now}.csv`;

      const escapeCsvValue = (value: any): string => {
        if (value == null) return '';
        const str = String(value).trim();
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      let csvRows: string[] = [];

      csvRows.push('SIMS-AI OPERATIONAL REPORT');
      csvRows.push(`Generated Date: ${new Date().toLocaleString('en-US')}`);
      csvRows.push(`Period: ${startDate} to ${endDate}`);
      csvRows.push('');
  
      // KEY METRICS
      csvRows.push('=== KEY METRICS ===');
      csvRows.push('Metric,Value,Unit');
      csvRows.push(`Inbound Volume,${escapeCsvValue(stats.inbound)},units`);
      csvRows.push(`Outbound Volume,${escapeCsvValue(stats.outbound)},units`);
      csvRows.push(`Task Completion Rate,${escapeCsvValue(stats.completion)},%`);
      csvRows.push(`Stock Discrepancies,${escapeCsvValue(stats.discrepancies)},items`);
      csvRows.push('');
  
      // SPACE UTILIZATION
      csvRows.push('=== SPACE UTILIZATION ===');
      csvRows.push('Category,Value (%),Note');
      capacityData.forEach(item => {
        csvRows.push([
          escapeCsvValue(item.name),
          escapeCsvValue(item.value),
          escapeCsvValue('Calculated from Shelf.maxCapacity vs StoredItem.quantity')
        ].join(','));
      });
      csvRows.push('');
  
      // STOCK BY CATEGORY
      csvRows.push('=== STOCK BY CATEGORY ===');
      csvRows.push('Category,Quantity,Note');
      inventoryData.forEach(item => {
        csvRows.push([
          escapeCsvValue(item.name),
          escapeCsvValue(item.qty),
          escapeCsvValue('From StoredItem grouped by category')
        ].join(','));
      });
      csvRows.push('');

      // INBOUND/OUTBOUND TREND
      csvRows.push('=== INBOUND/OUTBOUND TREND ===');
      csvRows.push('Date,Inbound,Outbound');
      trendData.forEach(item => {
        csvRows.push([escapeCsvValue(item.date), escapeCsvValue(item.inbound), escapeCsvValue(item.outbound)].join(','));
      });
      csvRows.push('');

      // ANOMALIES
      csvRows.push('=== DETECTED ANOMALIES ===');
      csvRows.push('Date,Type,Value,Message,Severity');
      anomalies.forEach(a => {
        csvRows.push([escapeCsvValue(a.date), escapeCsvValue(a.type), escapeCsvValue(a.value), escapeCsvValue(a.message), escapeCsvValue(a.severity)].join(','));
      });

      if (expiringAndCapacity) {
        csvRows.push('');
        csvRows.push('=== EXPIRING CONTRACTS & CAPACITY RISK ===');
        csvRows.push('KPI,Value');
        csvRows.push(`Expiring in 30 days,${escapeCsvValue(expiringAndCapacity.kpis.expiringIn30)}`);
        csvRows.push(`Expiring in 60 days,${escapeCsvValue(expiringAndCapacity.kpis.expiringIn60)}`);
        csvRows.push(`Expiring in 90 days,${escapeCsvValue(expiringAndCapacity.kpis.expiringIn90)}`);
        csvRows.push(`Capacity utilization (%),${escapeCsvValue(expiringAndCapacity.kpis.capacityUtilizationPercent)}`);
        csvRows.push('');
        csvRows.push('Expiring in 30 days,ContractCode,Customer,StartDate,EndDate,ExpiresInDays');
        expiringAndCapacity.expiringIn30.forEach(c => {
          csvRows.push([escapeCsvValue('30'), escapeCsvValue(c.contractCode), escapeCsvValue(c.customerName), escapeCsvValue(c.startDate), escapeCsvValue(c.endDate), escapeCsvValue(c.expiresInDays)].join(','));
        });
        csvRows.push('Expiring in 60 days,ContractCode,Customer,StartDate,EndDate,ExpiresInDays');
        expiringAndCapacity.expiringIn60.forEach(c => {
          csvRows.push([escapeCsvValue('60'), escapeCsvValue(c.contractCode), escapeCsvValue(c.customerName), escapeCsvValue(c.startDate), escapeCsvValue(c.endDate), escapeCsvValue(c.expiresInDays)].join(','));
        });
        csvRows.push('Expiring in 90 days,ContractCode,Customer,StartDate,EndDate,ExpiresInDays');
        expiringAndCapacity.expiringIn90.forEach(c => {
          csvRows.push([escapeCsvValue('90'), escapeCsvValue(c.contractCode), escapeCsvValue(c.customerName), escapeCsvValue(c.startDate), escapeCsvValue(c.endDate), escapeCsvValue(c.expiresInDays)].join(','));
        });
      }

      const csvContent = csvRows.join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('CSV report exported successfully');
    } catch (err) {
      toast.error('CSV export failed');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 p-8 bg-slate-50 min-h-screen">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <LoadingSkeleton className="h-10 w-64" />
          <div className="flex gap-3">
            <LoadingSkeleton className="h-10 w-36" />
            <LoadingSkeleton className="h-10 w-36" />
            <LoadingSkeleton className="h-10 w-44" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <LoadingSkeleton key={i} className="h-28 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <LoadingSkeleton className="h-80 rounded-3xl" />
          <LoadingSkeleton className="h-80 rounded-3xl" />
        </div>
        <LoadingSkeleton className="h-80 rounded-3xl" />
        <LoadingSkeleton className="h-40 rounded-3xl" />
        <LoadingSkeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Report Error" message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-8 p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Operations Analytics</h1>
          <p className="text-slate-500 mt-1">Real-time data from SIMS-AI infrastructure</p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-auto bg-white" />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-auto bg-white" />
          <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setGranularity('day')}
              className={`px-4 py-2.5 text-sm font-bold transition-colors ${granularity === 'day' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              By day
            </button>
            <button
              type="button"
              onClick={() => setGranularity('week')}
              className={`px-4 py-2.5 text-sm font-bold transition-colors ${granularity === 'week' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              By week
            </button>
          </div>
          <Button onClick={handleExportCSV}>Download CSV Report</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Inbound Flow" value={stats.inbound} unit="units" />
        <StatCard title="Outbound Flow" value={stats.outbound} unit="units" />
        <StatCard title="Task Accuracy" value={`${stats.completion}%`} />
        <StatCard 
          title="Stock Discrepancy" 
          value={stats.discrepancies} 
          unit="items mismatched" 
          isWarning={stats.discrepancies > 0} 
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pie Chart - Space Utilization */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Space Utilization</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={capacityData} innerRadius={80} outerRadius={100} paddingAngle={5} dataKey="value">
                  {capacityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart - Stock by Category */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Stock by Category</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="qty" fill="#0f172a" radius={[0, 8, 8, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Inbound/Outbound Trend - Line Chart */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">
          Inbound / Outbound Trend {granularity === 'week' ? '(by week)' : '(by day)'}
        </h3>
        <div className="h-80">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  formatter={(value: number) => [value, '']}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Legend verticalAlign="top" height={36} />
                <Line
                  type="monotone"
                  dataKey="inbound"
                  name="Inbound"
                  stroke={INBOUND_COLOR}
                  strokeWidth={2}
                  dot={{ fill: INBOUND_COLOR, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="outbound"
                  name="Outbound"
                  stroke={OUTBOUND_COLOR}
                  strokeWidth={2}
                  dot={{ fill: OUTBOUND_COLOR, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              No trend data in this period
            </div>
          )}
        </div>
      </div>

      {/* Expiring contracts & capacity risk */}
      {expiringAndCapacity && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">
            Contracts expiring & capacity risk
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="Expiring in 30 days" value={expiringAndCapacity.kpis.expiringIn30} unit="contracts" isWarning={expiringAndCapacity.kpis.expiringIn30 > 0} />
            <StatCard title="Expiring in 60 days" value={expiringAndCapacity.kpis.expiringIn60} unit="contracts" />
            <StatCard title="Expiring in 90 days" value={expiringAndCapacity.kpis.expiringIn90} unit="contracts" />
            <StatCard title="Capacity in use" value={`${expiringAndCapacity.kpis.capacityUtilizationPercent}%`} unit="utilization" isWarning={expiringAndCapacity.kpis.capacityUtilizationPercent >= 85} />
          </div>

          {/* Lists: 30 / 60 / 90 days */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <ExpiringList title="Expiring in 30 days" items={expiringAndCapacity.expiringIn30} />
            <ExpiringList title="Expiring in 60 days" items={expiringAndCapacity.expiringIn60} />
            <ExpiringList title="Expiring in 90 days" items={expiringAndCapacity.expiringIn90} />
          </div>

          {/* Gantt: contracts timeline */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Timeline (next 90 days)</h4>
            {expiringAndCapacity.ganttContracts.length > 0 ? (
              <GanttChart contracts={expiringAndCapacity.ganttContracts} />
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm font-medium rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                No contracts expiring in the next 90 days
              </div>
            )}
          </div>
        </div>
      )}

      {/* Anomaly detection */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">
          Anomaly Detection
        </h3>
        {anomalies.length > 0 ? (
          <ul className="space-y-3">
            {anomalies.map((a, i) => (
              <li
                key={`${a.date}-${a.type}-${i}`}
                className={`flex flex-wrap items-start gap-3 p-4 rounded-2xl border ${
                  a.severity === 'high' ? 'bg-red-50/50 border-red-200' : 'bg-amber-50/50 border-amber-200'
                }`}
              >
                <span className="material-symbols-outlined shrink-0 text-slate-600">
                  {a.type === 'inbound' ? 'inbox' : 'outbox'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{a.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {a.date} · {a.type} = {a.value} · {a.severity === 'high' ? 'High' : 'Low'}
                  </p>
                </div>
                <span
                  className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                    a.severity === 'high' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                  }`}
                >
                  {a.severity === 'high' ? 'High' : 'Low'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-8 text-center text-slate-500 text-sm font-medium rounded-2xl bg-slate-50 border border-dashed border-slate-200">
            No anomalies detected in this period
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, isWarning = false }: {
  title: string;
  value: string | number;
  unit?: string;
  isWarning?: boolean;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-colors">
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">{title}</h3>
      <p className={`text-3xl font-black ${isWarning ? 'text-red-600' : 'text-slate-900'}`}>
        {value}
      </p>
      {unit && <p className="text-xs text-slate-400 mt-1 font-medium">{unit}</p>}
    </div>
  );
}

function ExpiringList({
  title,
  items,
}: {
  title: string;
  items: ManagerReportExpiringContractItem[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{title}</h4>
      {items.length === 0 ? (
        <p className="text-slate-400 text-sm">None</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c.contractId} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono font-bold text-slate-800">{c.contractCode}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-600 truncate">{c.customerName}</span>
              <span className="text-slate-400 text-xs">to {c.endDate}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GanttChart({ contracts }: { contracts: ManagerReportExpiringContractItem[] }) {
  const start = Math.min(...contracts.map((c) => new Date(c.startDate).getTime()));
  const end = Math.max(...contracts.map((c) => new Date(c.endDate).getTime()));
  const range = end - start || 1;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px] space-y-3">
        {contracts.map((c, idx) => {
          const left = ((new Date(c.startDate).getTime() - start) / range) * 100;
          const width = ((new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / range) * 100;
          return (
            <div key={c.contractId} className="flex items-center gap-4">
              <div className="w-40 shrink-0 flex flex-col">
                <span className="font-mono text-sm font-bold text-slate-800 truncate">{c.contractCode}</span>
                <span className="text-xs text-slate-500 truncate">{c.customerName}</span>
              </div>
              <div className="flex-1 relative h-8 bg-slate-100 rounded-lg overflow-hidden">
                <div
                  className="absolute top-1 bottom-1 rounded-md"
                  style={{
                    left: `${Math.max(0, left)}%`,
                    width: `${Math.min(100 - left, width)}%`,
                    backgroundColor: GANTT_COLORS[idx % GANTT_COLORS.length],
                    opacity: 0.9,
                  }}
                  title={`${c.startDate} – ${c.endDate} (expires in ${c.expiresInDays} days)`}
                />
              </div>
              <div className="w-24 shrink-0 text-right text-xs text-slate-500">
                {c.endDate} ({c.expiresInDays}d)
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400 font-medium">
        <span>{new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <span>{new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
    </div>
  );
}