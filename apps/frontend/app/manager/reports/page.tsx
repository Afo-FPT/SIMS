'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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

import {
  getManagerReport,
  getApprovalByManager,
  getTopOutboundProducts,
  getProcessingTime,
  type ReportGranularity,
} from '../../../lib/reports.api';
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
  ApprovalByManagerItem,
  TopOutboundProductItem,
  ProcessingTimeTrendPoint,
  ProcessingTimeBoxPlotItem,
} from '../../../types/manager';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];
const INBOUND_COLOR = '#0ea5e9';
const OUTBOUND_COLOR = '#6366f1';
const APPROVED_COLOR = '#059669';
const REJECTED_COLOR = '#dc2626';
const OUTBOUND_TOP_COLOR = '#0ea5e9';
const GANTT_COLORS = ['#0ea5e9', '#6366f1', '#22c55e', '#f59e0b', '#14b8a6'];
type ReportTab = 'summary' | 'approvals' | 'outbound' | 'processing' | 'contracts' | 'anomalies';

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

export default function ManagerReportsPage() {
  const toast = useToastHelpers();
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
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
  const [approvalByManager, setApprovalByManager] = useState<ApprovalByManagerItem[]>([]);
  const [topOutboundProducts, setTopOutboundProducts] = useState<TopOutboundProductItem[]>([]);
  const [processingTimeTrend, setProcessingTimeTrend] = useState<ProcessingTimeTrendPoint[]>([]);
  const [processingTimeBoxPlot, setProcessingTimeBoxPlot] = useState<ProcessingTimeBoxPlotItem[]>([]);
  const [processingTimeGranularity, setProcessingTimeGranularity] = useState<'week' | 'month'>('week');
  const [tab, setTab] = useState<ReportTab>('summary');
  const stockChartHeight = Math.max(288, inventoryData.length * 44);
  // Keep stable height to avoid reflow / label jump during polling
  const outboundChartHeight = Math.max(220, 10 * 42);
  const topOutboundProductsSignatureRef = useRef<string>('');
  const topOutboundOrderRef = useRef<string[]>([]);
  const trendXAxisInterval = granularity === 'day' ? Math.max(0, Math.ceil(trendData.length / 8) - 1) : 'preserveStartEnd';
  const processingTrendXAxisInterval =
    processingTimeGranularity === 'week'
      ? Math.max(0, Math.ceil(processingTimeTrend.length / 6) - 1)
      : 'preserveStartEnd';

  const formatTrendLabel = (value: string) => {
    if (granularity !== 'day') return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
  };

  const formatProcessingPeriodLabel = (value: string) => {
    if (processingTimeGranularity === 'month') {
      const date = new Date(`${value}-01`);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      }
      return value;
    }
    return value.replace(/\s+/g, ' ');
  };

  const normalizeTopOutboundProducts = (list: TopOutboundProductItem[]): TopOutboundProductItem[] => {
    const incoming = Array.isArray(list) ? list : [];
    const keyOf = (p: TopOutboundProductItem) => String(p.itemName ?? '').trim();

    const byKey = new Map<string, TopOutboundProductItem>();
    for (const p of incoming) {
      const k = keyOf(p);
      if (!k) continue;
      byKey.set(k, p);
    }

    // Initialize stable order (deterministic) on first load
    if (topOutboundOrderRef.current.length === 0) {
      topOutboundOrderRef.current = [...byKey.values()]
        .slice()
        .sort((a, b) => {
          const aq = Number(a.totalQuantity) || 0;
          const bq = Number(b.totalQuantity) || 0;
          if (bq !== aq) return bq - aq;
          return String(a.itemName).localeCompare(String(b.itemName));
        })
        .slice(0, 10)
        .map((p) => keyOf(p));
    } else {
      const nextOrder: string[] = [];
      const existing = topOutboundOrderRef.current;
      for (const k of existing) {
        if (byKey.has(k)) nextOrder.push(k);
      }
      for (const k of byKey.keys()) {
        if (!nextOrder.includes(k)) nextOrder.push(k);
      }
      topOutboundOrderRef.current = nextOrder.slice(0, 10);
    }

    // Stable "rank" based on stable order position
    return topOutboundOrderRef.current
      .map((k, idx) => {
        const p = byKey.get(k);
        if (!p) return null;
        return { ...p, rank: idx + 1 };
      })
      .filter(Boolean) as TopOutboundProductItem[];
  };

  const stockByCategoryData = useMemo(() => {
    return {
      labels: inventoryData.map((d) => d.name),
      datasets: [
        {
          label: 'Quantity',
          data: inventoryData.map((d) => d.qty),
          backgroundColor: '#6366f1',
        },
      ],
    };
  }, [inventoryData]);

  const stockByCategoryOptions = useMemo(() => {
    return {
      animation: false as const,
      responsiveAnimationDuration: 0,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      indexAxis: 'y' as const,
      scales: {
        x: { beginAtZero: true },
        y: {
          ticks: {
            font: { size: 12 },
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
          },
        },
      },
    };
  }, []);

  const topOutboundProductsBarData = useMemo(() => {
    return {
      labels: topOutboundProducts.map((d) => d.itemName),
      datasets: [
        {
          label: 'Total quantity',
          data: topOutboundProducts.map((d) => d.totalQuantity),
          backgroundColor: OUTBOUND_TOP_COLOR,
        },
      ],
    };
  }, [topOutboundProducts]);

  const topOutboundProductsBarOptions = useMemo(() => {
    return {
      animation: false as const,
      responsiveAnimationDuration: 0,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      indexAxis: 'y' as const,
      scales: {
        x: { beginAtZero: true },
        y: {
          ticks: {
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
          },
        },
      },
    };
  }, []);

  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const fetchData = async () => {
      try {
        if (!hasLoaded) setLoading(true);
        setError(null);
        if (!startDate || !endDate) return;

        const [report, approvalData, topOutboundData, processingTimeData] = await Promise.all([
          getManagerReport(startDate, endDate, granularity),
          getApprovalByManager(startDate, endDate),
          getTopOutboundProducts(startDate, endDate),
          getProcessingTime(startDate, endDate, processingTimeGranularity),
        ]);

        if (cancelled) return;
        setStats(report.stats);
        setCapacityData(
          report.capacityData?.length
            ? report.capacityData
            : [
                { name: 'Occupied', value: 0 },
                { name: 'Empty', value: 100 },
              ],
        );
        setInventoryData(
          (report.inventoryData ?? []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name))),
        );
        setTrendData(report.trendData ?? []);
        setAnomalies(report.anomalies ?? []);
        setExpiringAndCapacity(report.expiringAndCapacity ?? null);
        setApprovalByManager(approvalData ?? []);
        const nextTopOutbound = normalizeTopOutboundProducts(topOutboundData ?? []);
        const signature = nextTopOutbound
          .map((d) => `${d.itemName}|${d.totalQuantity}|${d.outboundCount}|${d.unit}`)
          .join('~');
        if (topOutboundProductsSignatureRef.current !== signature) {
          topOutboundProductsSignatureRef.current = signature;
          setTopOutboundProducts(nextTopOutbound);
        }
        setProcessingTimeTrend(processingTimeData?.trendData ?? []);
        setProcessingTimeBoxPlot(processingTimeData?.boxPlotData ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load reports');
          toast.error('Failed to load report data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHasLoaded(true);
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchData();
      }
    };

    void fetchData();
    pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchData();
      }
    }, 30000);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [startDate, endDate, granularity, processingTimeGranularity, hasLoaded, toast]);

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
      csvRows.push(
        `Generated Date: ${new Date().toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
      );
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

      // APPROVAL RATE BY MANAGER
      csvRows.push('');
      csvRows.push('=== APPROVAL RATE BY MANAGER ===');
      csvRows.push('Manager,Inbound Approved,Inbound Rejected,Outbound Approved,Outbound Rejected,Total Approved,Total Rejected,Approval Rate (%)');
      approvalByManager.forEach(m => {
        csvRows.push([
          escapeCsvValue(m.managerName),
          escapeCsvValue(m.inboundApproved),
          escapeCsvValue(m.inboundRejected),
          escapeCsvValue(m.outboundApproved),
          escapeCsvValue(m.outboundRejected),
          escapeCsvValue(m.totalApproved),
          escapeCsvValue(m.totalRejected),
          escapeCsvValue(m.approvalRatePercent),
        ].join(','));
      });

      // TOP 10 OUTBOUND PRODUCTS
      csvRows.push('');
      csvRows.push('=== TOP 10 OUTBOUND PRODUCTS ===');
      csvRows.push('Rank,Product Name,Total Quantity,Outbound Count,Unit');
      topOutboundProducts.forEach(p => {
        csvRows.push([
          escapeCsvValue(p.rank),
          escapeCsvValue(p.itemName),
          escapeCsvValue(p.totalQuantity),
          escapeCsvValue(p.outboundCount),
          escapeCsvValue(p.unit),
        ].join(','));
      });

      // PROCESSING TIME
      csvRows.push('');
      csvRows.push('=== AVERAGE PROCESSING TIME (TREND) ===');
      csvRows.push('Period,Inbound Avg (h),Outbound Avg (h),Inbound Count,Outbound Count');
      processingTimeTrend.forEach(t => {
        csvRows.push([
          escapeCsvValue(t.period),
          escapeCsvValue(t.inboundAvgHours),
          escapeCsvValue(t.outboundAvgHours),
          escapeCsvValue(t.inboundCount),
          escapeCsvValue(t.outboundCount),
        ].join(','));
      });
      csvRows.push('');
      csvRows.push('=== PROCESSING TIME DISTRIBUTION (BOX PLOT) ===');
      csvRows.push('Type,Min (h),Q1 (h),Median (h),Q3 (h),Max (h),Count,Avg (h)');
      processingTimeBoxPlot.forEach(b => {
        csvRows.push([
          escapeCsvValue(b.type),
          escapeCsvValue(b.min),
          escapeCsvValue(b.q1),
          escapeCsvValue(b.median),
          escapeCsvValue(b.q3),
          escapeCsvValue(b.max),
          escapeCsvValue(b.count),
          escapeCsvValue(b.avgHours),
        ].join(','));
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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manager Reports</h1>
          <p className="text-slate-500 mt-1">Operational analytics, approvals, outbound products, processing time, and anomalies</p>
        </div>
        <LoadingSkeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Report Error" message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manager Reports</h1>
        <p className="text-slate-500 mt-1">Operational analytics, approvals, outbound products, processing time, and anomalies</p>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Report Filters</h2>
            <p className="text-sm text-slate-500 mt-1">Adjust time range and granularity for all modules</p>
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
            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
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
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          ['summary', 'Summary'],
          ['approvals', 'Approval Rate'],
          ['outbound', 'Top Outbound Products'],
          ['processing', 'Processing Time'],
          ['contracts', 'Contract Risk'],
          ['anomalies', 'Anomalies'],
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

      {tab === 'summary' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Inbound Flow" value={stats.inbound} unit="units" />
            <StatCard title="Outbound Flow" value={stats.outbound} unit="units" />
            <StatCard title="Task Accuracy" value={`${stats.completion}%`} />
            <StatCard title="Stock Discrepancy" value={stats.discrepancies} unit="items mismatched" isWarning={stats.discrepancies > 0} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Space Utilization</h3>
              <div className="h-72">
                <Pie
                  data={{
                    labels: capacityData.map((d) => d.name),
                    datasets: [
                      {
                        data: capacityData.map((d) => d.value),
                        backgroundColor: capacityData.map((_, i) => COLORS[i % COLORS.length]),
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                  }}
                />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Stock by Category</h3>
              <div className="max-h-[28rem] overflow-y-auto pr-1">
                <div style={{ height: `${stockChartHeight}px`, minHeight: '18rem' }}>
                  <Bar
                    data={stockByCategoryData}
                    options={stockByCategoryOptions}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">
              Inbound / Outbound Trend {granularity === 'week' ? '(by week)' : '(by day)'}
            </h3>
            <div className="h-80">
              {trendData.length > 0 ? (
                <Line
                  data={{
                    labels: trendData.map((d) => d.date),
                    datasets: [
                      {
                        label: 'Inbound',
                        data: trendData.map((d) => d.inbound),
                        borderColor: INBOUND_COLOR,
                        backgroundColor: INBOUND_COLOR,
                        tension: 0.3,
                      },
                      {
                        label: 'Outbound',
                        data: trendData.map((d) => d.outbound),
                        borderColor: OUTBOUND_COLOR,
                        backgroundColor: OUTBOUND_COLOR,
                        tension: 0.3,
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                      x: { ticks: { maxTicksLimit: 10 } },
                      y: { beginAtZero: true },
                    },
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                  No trend data in this period
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'approvals' && (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">
          Approval Rate by Manager
        </h3>
        <p className="text-slate-500 text-sm mb-6">
          Compare quantity and approval/rejection rate per Manager (Inbound + Outbound)
        </p>

        {approvalByManager.length > 0 ? (
          <>
            {/* KPI Cards for approval stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Total Approved"
                value={approvalByManager.reduce((s, m) => s + m.totalApproved, 0)}
                unit="requests"
              />
              <StatCard
                title="Total Rejected"
                value={approvalByManager.reduce((s, m) => s + m.totalRejected, 0)}
                unit="requests"
                isWarning={approvalByManager.reduce((s, m) => s + m.totalRejected, 0) > 0}
              />
              <StatCard
                title="Avg Approval Rate"
                value={
                  approvalByManager.filter((m) => m.totalDecisions > 0).length > 0
                    ? `${Math.round(
                        approvalByManager
                          .filter((m) => m.totalDecisions > 0)
                          .reduce((s, m) => s + m.approvalRatePercent, 0) /
                          approvalByManager.filter((m) => m.totalDecisions > 0).length
                      )}%`
                    : '0%'
                }
              />
              <StatCard
                title="Managers with Decisions"
                value={approvalByManager.filter((m) => m.totalDecisions > 0).length}
                unit="managers"
              />
            </div>

            {/* Horizontal Bar Chart - by Manager */}
            <div className="h-[400px] min-h-[200px]">
              <Bar
                data={{
                  labels: approvalByManager.map((d) => d.managerName),
                  datasets: [
                    {
                      label: 'Approved',
                      data: approvalByManager.map((d) => d.totalApproved),
                      backgroundColor: APPROVED_COLOR,
                      stack: 'a',
                    },
                    {
                      label: 'Rejected',
                      data: approvalByManager.map((d) => d.totalRejected),
                      backgroundColor: REJECTED_COLOR,
                      stack: 'a',
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: { legend: { position: 'bottom' } },
                  scales: {
                    x: { stacked: true, beginAtZero: true },
                    y: { stacked: true },
                  },
                }}
              />
            </div>

            {/* Summary table */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Summary by Manager</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 font-bold border-b border-slate-200">
                      <th className="pb-2 pr-4">Manager</th>
                      <th className="pb-2 pr-4 text-right">Inbound Approved</th>
                      <th className="pb-2 pr-4 text-right">Inbound Rejected</th>
                      <th className="pb-2 pr-4 text-right">Outbound Approved</th>
                      <th className="pb-2 pr-4 text-right">Outbound Rejected</th>
                      <th className="pb-2 pr-4 text-right">Approval Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvalByManager.map((m) => (
                      <tr key={m.managerId} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 pr-4 font-medium text-slate-900">{m.managerName}</td>
                        <td className="py-2 pr-4 text-right text-emerald-600">{m.inboundApproved}</td>
                        <td className="py-2 pr-4 text-right text-red-600">{m.inboundRejected}</td>
                        <td className="py-2 pr-4 text-right text-emerald-600">{m.outboundApproved}</td>
                        <td className="py-2 pr-4 text-right text-red-600">{m.outboundRejected}</td>
                        <td className="py-2 pr-4 text-right font-bold text-slate-900">{m.approvalRatePercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-slate-500 text-sm font-medium rounded-2xl bg-slate-50 border border-dashed border-slate-200">
            No approval data in this period. Managers approve/reject Inbound and Outbound requests.
          </div>
        )}
      </div>
      )}

      {tab === 'outbound' && (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">
          Top 10 Outbound Products
        </h3>
        <p className="text-slate-500 text-sm mb-6">
          Products with highest outbound frequency and volume in the selected period (30/90 days)
        </p>

        {topOutboundProducts.length > 0 ? (
          <>
            {/* Horizontal Bar Chart */}
            <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
              <div style={{ height: `${outboundChartHeight}px` }}>
                <Bar
                  data={topOutboundProductsBarData}
                  options={topOutboundProductsBarOptions}
                />
              </div>
            </div>

            {/* Detail Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Detail Table
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-slate-500 font-bold border-b border-slate-200">
                      <th className="py-3 px-4 w-20">Rank</th>
                      <th className="py-3 px-4">Product name</th>
                      <th className="py-3 px-4 text-right w-44">Total quantity</th>
                      <th className="py-3 px-4 text-right w-44">Outbound count</th>
                      <th className="py-3 px-4 w-24">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topOutboundProducts.map((p) => (
                      <tr
                        key={p.itemName}
                        className="border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50/40 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-2.5 px-4">
                          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                            {p.rank}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          <span className="line-clamp-1">{p.itemName}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="inline-flex items-center justify-end rounded-lg bg-sky-50 px-2.5 py-1 font-bold text-sky-700">
                            {p.totalQuantity.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-700 font-semibold">
                          {p.outboundCount} shipments
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{p.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-slate-500 text-sm font-medium rounded-2xl bg-slate-50 border border-dashed border-slate-200">
            No outbound data in this period. Completed outbound requests will appear here.
          </div>
        )}
      </div>
      )}

      {tab === 'processing' && (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">
          Average Processing Time
        </h3>
        <p className="text-slate-500 text-sm mb-6">
          Time from request creation to approval/rejection (Inbound vs Outbound)
        </p>

        {(processingTimeTrend.length > 0 || processingTimeBoxPlot.some((b) => b.count > 0)) ? (
          <>
            {/* Granularity toggle */}
            <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white w-fit mb-6">
              <button
                type="button"
                onClick={() => setProcessingTimeGranularity('week')}
                className={`px-4 py-2.5 text-sm font-bold transition-colors ${processingTimeGranularity === 'week' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                By week
              </button>
              <button
                type="button"
                onClick={() => setProcessingTimeGranularity('month')}
                className={`px-4 py-2.5 text-sm font-bold transition-colors ${processingTimeGranularity === 'month' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                By month
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Line Chart - Trend */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                  Trend {processingTimeGranularity === 'month' ? '(by month)' : '(by week)'}
                </h4>
                <div className="h-72">
                  {processingTimeTrend.length > 0 ? (
                    <Line
                      data={{
                        labels: processingTimeTrend.map((d) => d.period),
                        datasets: [
                          {
                            label: 'Inbound (avg hours)',
                            data: processingTimeTrend.map((d) => d.inboundAvgHours),
                            borderColor: INBOUND_COLOR,
                            backgroundColor: INBOUND_COLOR,
                            tension: 0.3,
                          },
                          {
                            label: 'Outbound (avg hours)',
                            data: processingTimeTrend.map((d) => d.outboundAvgHours),
                            borderColor: OUTBOUND_COLOR,
                            backgroundColor: OUTBOUND_COLOR,
                            tension: 0.3,
                          },
                        ],
                      }}
                      options={{
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } },
                        scales: { x: { ticks: { maxTicksLimit: 10 } }, y: { beginAtZero: true } },
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                      No trend data in this period
                    </div>
                  )}
                </div>
              </div>

              {/* Box Plot */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                  Distribution (Box Plot)
                </h4>
                <BoxPlotChart data={processingTimeBoxPlot} />
              </div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-slate-500 text-sm font-medium rounded-2xl bg-slate-50 border border-dashed border-slate-200">
            No processing time data in this period. Approved/rejected requests will appear here.
          </div>
        )}
      </div>
      )}

      {tab === 'contracts' && expiringAndCapacity && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
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

      {tab === 'anomalies' && (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
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
      )}
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
    <div className="rounded-2xl border border-slate-200 p-4">
      <h3 className="text-xs uppercase font-black tracking-wider text-slate-500">{title}</h3>
      <p className={`text-2xl font-black mt-1 ${isWarning ? 'text-red-600' : 'text-slate-900'}`}>
        {value}
      </p>
      {unit && <p className="text-xs text-slate-400 mt-1 font-medium">{unit}</p>}
    </div>
  );
}

function BoxPlotChart({ data }: { data: ProcessingTimeBoxPlotItem[] }) {
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium rounded-2xl bg-slate-50 border border-dashed border-slate-200">
        No distribution data
      </div>
    );
  }

  const allValues = data.flatMap((d) => [d.min, d.max]);
  const maxVal = allValues.length > 0 ? Math.max(...allValues, 0) : 1;
  const padding = maxVal * 0.05 || 1;
  const scaleMax = Math.max(maxVal + padding, 1);
  const toPercent = (hours: number) => (hours / scaleMax) * 100;

  return (
    <div className="space-y-4">
        {data.map((d) => {
          if (d.count === 0) return null;
          const fill = d.type === 'IN' ? INBOUND_COLOR : OUTBOUND_COLOR;
          const label = d.type === 'IN' ? 'Inbound' : 'Outbound';
          const xMin = toPercent(d.min);
          const xQ1 = toPercent(d.q1);
          const xMedian = toPercent(d.median);
          const xQ3 = toPercent(d.q3);
          const xMax = toPercent(d.max);

          return (
            <div key={d.type} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-slate-800">
                  {label}
                  <span className="ml-2 text-xs text-slate-500 font-medium">(n={d.count})</span>
                </div>
                <div className="text-xs font-semibold text-slate-600">Avg: {d.avgHours.toFixed(1)}h</div>
              </div>

              <div className="relative h-12 rounded-xl bg-white px-2">
                {/* baseline */}
                <div className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-slate-200" />
                {/* grid markers */}
                {[0, 25, 50, 75, 100].map((tick) => (
                  <div
                    key={`${d.type}-${tick}`}
                    className="absolute top-2 bottom-2 w-px bg-slate-100"
                    style={{ left: `calc(${tick}% + 0.5rem)` }}
                  />
                ))}

                {/* whisker min-Q1 */}
                <div
                  className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-slate-300"
                  style={{ left: `calc(${xMin}% + 0.5rem)`, width: `max(calc(${xQ1 - xMin}% - 1px), 0px)` }}
                />
                {/* box Q1-Q3 */}
                <div
                  className="absolute top-2 bottom-2 rounded-md"
                  style={{
                    left: `calc(${xQ1}% + 0.5rem)`,
                    width: `max(calc(${xQ3 - xQ1}% - 1px), 2px)`,
                    backgroundColor: fill,
                    opacity: 0.85,
                  }}
                />
                {/* median */}
                <div
                  className="absolute top-1 bottom-1 w-0.5 rounded-full bg-slate-900"
                  style={{ left: `calc(${xMedian}% + 0.5rem)` }}
                />
                {/* whisker Q3-max */}
                <div
                  className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-slate-300"
                  style={{ left: `calc(${xQ3}% + 0.5rem)`, width: `max(calc(${xMax - xQ3}% - 1px), 0px)` }}
                />
                {/* caps */}
                <div
                  className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-slate-400"
                  style={{ left: `calc(${xMin}% + 0.5rem)` }}
                />
                <div
                  className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-slate-400"
                  style={{ left: `calc(${xMax}% + 0.5rem)` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>0h</span>
                <span>{scaleMax.toFixed(0)}h</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600 sm:grid-cols-5">
                <div className="rounded-md bg-white px-2 py-1">Min: {d.min.toFixed(1)}h</div>
                <div className="rounded-md bg-white px-2 py-1">Q1: {d.q1.toFixed(1)}h</div>
                <div className="rounded-md bg-white px-2 py-1">Median: {d.median.toFixed(1)}h</div>
                <div className="rounded-md bg-white px-2 py-1">Q3: {d.q3.toFixed(1)}h</div>
                <div className="rounded-md bg-white px-2 py-1">Max: {d.max.toFixed(1)}h</div>
              </div>
            </div>
          );
        })}
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
        <span>
          {new Date(start).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
        <span>
          {new Date(end).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      </div>
    </div>
  );
}