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
  getManagerExpiryStackedReport,
  getManagerZonePricingCombo,
  getManagerPenaltyTopCustomers,
  type ReportGranularity,
} from '../../../lib/reports.api';
import { requestReportInsight } from '../../../lib/ai-insights.api';
import { useToastHelpers } from '../../../lib/toast';
import {
  parseLocalDateStart,
  parseLocalDateEndOfDay,
  defaultReportDateRange,
  type QuickPreset,
} from '../../../lib/report-date-range';
import { ChartDateFilterBar } from '../../../components/reports/ChartDateFilterBar';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Pagination } from '../../../components/ui/Pagination';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { ChatMarkdown } from '../../../components/ChatMarkdown';
import type {
  ManagerReportTrendPoint,
  ManagerReportAnomaly,
  ManagerReportExpiringAndCapacity,
  ManagerReportExpiringContractItem,
  ApprovalByManagerItem,
  TopOutboundProductItem,
  ProcessingTimeTrendPoint,
  ProcessingTimeBoxPlotItem,
  ExpiryStackedReport,
  ExpiryContractAlertRow,
  ExpiryZoneLeaseAlertRow,
  ZonePricingComboRow,
  PenaltyTopCustomerRow,
  ManagerDeepGranularity,
} from '../../../types/manager';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];
const INBOUND_COLOR = '#0ea5e9';
const OUTBOUND_COLOR = '#6366f1';
const APPROVED_COLOR = '#059669';
const REJECTED_COLOR = '#dc2626';
const OUTBOUND_TOP_COLOR = '#0ea5e9';
const GANTT_COLORS = ['#0ea5e9', '#6366f1', '#22c55e', '#f59e0b', '#14b8a6'];
type ReportTab = 'summary' | 'deep' | 'approvals' | 'outbound' | 'processing' | 'contracts' | 'anomalies';

/** Same bucket logic as staff In/Out chart → backend daily | monthly | yearly */
function inferManagerDeepGranularity(startIso: string, endIso: string): ManagerDeepGranularity {
  const startMs = parseLocalDateStart(startIso);
  const endMs = parseLocalDateEndOfDay(endIso);
  if (endMs < startMs) return 'monthly';
  const approxDays = (endMs - startMs) / 86400000;
  if (approxDays <= 45) return 'daily';
  if (approxDays <= 550) return 'monthly';
  return 'yearly';
}

const EXPIRY_TABLE_PAGE_SIZE = 10;
const ZONE_PRICING_TABLE_PAGE_SIZE = 10;
const ZONE_PRICING_WAREHOUSE_FILTER_ALL = 'all';
/** Select value when zone rows have no warehouse id in payload */
const ZONE_PRICING_WAREHOUSE_NONE_KEY = '__no_warehouse__';

const MANAGER_CONTRACT_STATUSES = [
  'draft',
  'pending_payment',
  'active',
  'expired',
  'terminated',
] as const;

type ManagerContractStatus = (typeof MANAGER_CONTRACT_STATUSES)[number];

const EXPIRY_CONTRACT_STATUS_ALL = 'all' as const;
type ExpiryContractStatusFilterValue = typeof EXPIRY_CONTRACT_STATUS_ALL | ManagerContractStatus;

function formatManagerContractStatusLabel(status: string): string {
  if (!status) return '—';
  return status.replace(/_/g, ' ');
}

function formatZonePricingVnd(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  return `${Math.round(amount).toLocaleString('en-US')} ₫`;
}

const EXPIRY_DETAIL_STATUS_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: EXPIRY_CONTRACT_STATUS_ALL, label: 'All statuses' },
  ...MANAGER_CONTRACT_STATUSES.map((st) => ({
    value: st,
    label: formatManagerContractStatusLabel(st),
  })),
];

type ExpiryDetailTableRow =
  | ({ kind: 'contract' } & ExpiryContractAlertRow)
  | ({ kind: 'zone' } & ExpiryZoneLeaseAlertRow);

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

export default function ManagerReportsPage() {
  const toast = useToastHelpers();
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initR = defaultReportDateRange();
  const [kpiStart, setKpiStart] = useState(initR.start);
  const [kpiEnd, setKpiEnd] = useState(initR.end);
  const [kpiPreset, setKpiPreset] = useState<QuickPreset | null>(null);

  const [trendStart, setTrendStart] = useState(initR.start);
  const [trendEnd, setTrendEnd] = useState(initR.end);
  const [trendPreset, setTrendPreset] = useState<QuickPreset | null>(null);

  const [spaceStart, setSpaceStart] = useState(initR.start);
  const [spaceEnd, setSpaceEnd] = useState(initR.end);
  const [spacePreset, setSpacePreset] = useState<QuickPreset | null>(null);

  const [stockStart, setStockStart] = useState(initR.start);
  const [stockEnd, setStockEnd] = useState(initR.end);
  const [stockPreset, setStockPreset] = useState<QuickPreset | null>(null);

  const [approvalStart, setApprovalStart] = useState(initR.start);
  const [approvalEnd, setApprovalEnd] = useState(initR.end);
  const [approvalPreset, setApprovalPreset] = useState<QuickPreset | null>(null);

  const [outboundStart, setOutboundStart] = useState(initR.start);
  const [outboundEnd, setOutboundEnd] = useState(initR.end);
  const [outboundPreset, setOutboundPreset] = useState<QuickPreset | null>(null);

  const [processingStart, setProcessingStart] = useState(initR.start);
  const [processingEnd, setProcessingEnd] = useState(initR.end);
  const [processingPreset, setProcessingPreset] = useState<QuickPreset | null>(null);

  const [contractRiskStart, setContractRiskStart] = useState(initR.start);
  const [contractRiskEnd, setContractRiskEnd] = useState(initR.end);
  const [contractRiskPreset, setContractRiskPreset] = useState<QuickPreset | null>(null);

  const [anomalyStart, setAnomalyStart] = useState(initR.start);
  const [anomalyEnd, setAnomalyEnd] = useState(initR.end);
  const [anomalyPreset, setAnomalyPreset] = useState<QuickPreset | null>(null);

  const [deepExpiryStart, setDeepExpiryStart] = useState(initR.start);
  const [deepExpiryEnd, setDeepExpiryEnd] = useState(initR.end);
  const [deepExpiryPreset, setDeepExpiryPreset] = useState<QuickPreset | null>(null);

  const [deepPricingStart, setDeepPricingStart] = useState(initR.start);
  const [deepPricingEnd, setDeepPricingEnd] = useState(initR.end);
  const [deepPricingPreset, setDeepPricingPreset] = useState<QuickPreset | null>(null);

  const [deepPenaltyStart, setDeepPenaltyStart] = useState(initR.start);
  const [deepPenaltyEnd, setDeepPenaltyEnd] = useState(initR.end);
  const [deepPenaltyPreset, setDeepPenaltyPreset] = useState<QuickPreset | null>(null);

  const [insightsByKey, setInsightsByKey] = useState<Record<string, string>>({});
  const [insightLoadingKey, setInsightLoadingKey] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);

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
  const [kpiAnomalies, setKpiAnomalies] = useState<ManagerReportAnomaly[]>([]);
  const [expiringAndCapacity, setExpiringAndCapacity] = useState<ManagerReportExpiringAndCapacity | null>(null);
  const [trendGranularity, setTrendGranularity] = useState<ReportGranularity>('day');
  const [approvalByManager, setApprovalByManager] = useState<ApprovalByManagerItem[]>([]);
  const [topOutboundProducts, setTopOutboundProducts] = useState<TopOutboundProductItem[]>([]);
  const [processingTimeTrend, setProcessingTimeTrend] = useState<ProcessingTimeTrendPoint[]>([]);
  const [processingTimeBoxPlot, setProcessingTimeBoxPlot] = useState<ProcessingTimeBoxPlotItem[]>([]);
  const [processingTimeGranularity, setProcessingTimeGranularity] = useState<'week' | 'month'>('week');
  const [tab, setTab] = useState<ReportTab>('summary');

  const [deepExpiryData, setDeepExpiryData] = useState<ExpiryStackedReport | null>(null);
  const [deepExpiryLoading, setDeepExpiryLoading] = useState(false);
  const [expirySelectedBucketIndex, setExpirySelectedBucketIndex] = useState(0);
  const [expiryDetailPage, setExpiryDetailPage] = useState(1);
  const [expiryContractStatusSelect, setExpiryContractStatusSelect] =
    useState<ExpiryContractStatusFilterValue>(EXPIRY_CONTRACT_STATUS_ALL);

  const [deepPricingData, setDeepPricingData] = useState<ZonePricingComboRow[] | null>(null);
  const [deepPricingLoading, setDeepPricingLoading] = useState(false);
  const [zonePricingTablePage, setZonePricingTablePage] = useState(1);
  const [zonePricingWarehouseFilter, setZonePricingWarehouseFilter] = useState<string>(
    ZONE_PRICING_WAREHOUSE_FILTER_ALL,
  );

  const [deepPenaltyData, setDeepPenaltyData] = useState<PenaltyTopCustomerRow[] | null>(null);
  const [deepPenaltyLoading, setDeepPenaltyLoading] = useState(false);

  const deepExpiryGranularity = useMemo(
    () => inferManagerDeepGranularity(deepExpiryStart, deepExpiryEnd),
    [deepExpiryStart, deepExpiryEnd],
  );

  const expiryFilteredDetailRows: ExpiryDetailTableRow[] = useMemo(() => {
    const b = deepExpiryData?.buckets[expirySelectedBucketIndex];
    if (!b?.details) return [];
    const out: ExpiryDetailTableRow[] = [];
    const match = (status: string) =>
      expiryContractStatusSelect === EXPIRY_CONTRACT_STATUS_ALL || expiryContractStatusSelect === status;
    for (const r of b.details.contractAlerts) {
      if (match(r.contractStatus)) {
        out.push({ kind: 'contract', ...r });
      }
    }
    for (const r of b.details.zoneLeaseAlerts) {
      if (match(r.contractStatus)) {
        out.push({ kind: 'zone', ...r });
      }
    }
    return out;
  }, [deepExpiryData, expirySelectedBucketIndex, expiryContractStatusSelect]);

  const expiryDetailTotalPages = Math.max(1, Math.ceil(expiryFilteredDetailRows.length / EXPIRY_TABLE_PAGE_SIZE));
  const safeExpiryDetailPage = Math.min(Math.max(1, expiryDetailPage), expiryDetailTotalPages);
  const expiryPagedDetailRows = useMemo(() => {
    const start = (safeExpiryDetailPage - 1) * EXPIRY_TABLE_PAGE_SIZE;
    return expiryFilteredDetailRows.slice(start, start + EXPIRY_TABLE_PAGE_SIZE);
  }, [expiryFilteredDetailRows, safeExpiryDetailPage]);

  const zonePricingFilteredRows = useMemo(() => {
    const d = deepPricingData ?? [];
    if (zonePricingWarehouseFilter === ZONE_PRICING_WAREHOUSE_FILTER_ALL) return d;
    if (zonePricingWarehouseFilter === ZONE_PRICING_WAREHOUSE_NONE_KEY) {
      return d.filter((r) => !(r.warehouseId || '').trim());
    }
    return d.filter((r) => (r.warehouseId || '').trim() === zonePricingWarehouseFilter);
  }, [deepPricingData, zonePricingWarehouseFilter]);

  const zonePricingDetailTotalPages = Math.max(
    1,
    Math.ceil(zonePricingFilteredRows.length / ZONE_PRICING_TABLE_PAGE_SIZE),
  );
  const safeZonePricingDetailPage = Math.min(
    Math.max(1, zonePricingTablePage),
    zonePricingDetailTotalPages,
  );
  const zonePricingPagedRows = useMemo(() => {
    const start = (safeZonePricingDetailPage - 1) * ZONE_PRICING_TABLE_PAGE_SIZE;
    return zonePricingFilteredRows.slice(start, start + ZONE_PRICING_TABLE_PAGE_SIZE);
  }, [zonePricingFilteredRows, safeZonePricingDetailPage]);

  const zonePricingWarehouseSelectOptions = useMemo(() => {
    const d = deepPricingData ?? [];
    const byKey = new Map<string, string>();
    for (const r of d) {
      const id = (r.warehouseId || '').trim();
      const key = id || ZONE_PRICING_WAREHOUSE_NONE_KEY;
      if (!byKey.has(key)) {
        byKey.set(key, id ? (r.warehouseName || '—').trim() || '—' : 'Unknown warehouse');
      }
    }
    const entries = [...byKey.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    return [
      { value: ZONE_PRICING_WAREHOUSE_FILTER_ALL, label: 'All warehouses' },
      ...entries.map(([value, label]) => ({ value, label })),
    ];
  }, [deepPricingData]);

  const stockChartHeight = Math.max(288, inventoryData.length * 44);
  // Keep stable height to avoid reflow / label jump during polling
  const outboundChartHeight = Math.max(220, 10 * 42);
  const topOutboundProductsSignatureRef = useRef<string>('');
  const topOutboundOrderRef = useRef<string[]>([]);
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
      animation: { duration: 800, easing: 'easeOutQuart' as const },
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
      animation: { duration: 800, easing: 'easeOutQuart' as const },
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

  const expiryStackedBarOptions = useMemo(() => {
    const buckets = deepExpiryData?.buckets ?? [];
    return {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (_e: unknown, elements: { index: number }[]) => {
        if (elements[0]) {
          setExpirySelectedBucketIndex(elements[0].index);
          setExpiryDetailPage(1);
        }
      },
      plugins: {
        legend: { position: 'bottom' as const },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            afterBody: (items: { dataIndex: number }[]) => {
              if (!items.length) return [];
              const idx = items[0].dataIndex;
              const d = buckets[idx]?.details;
              if (!d) return ['No contract/zone detail for this period.'];
              const lines: string[] = [];
              if (d.contractAlerts.length) {
                lines.push('Contracts (expired / expiring ≤30d):');
                for (const r of d.contractAlerts.slice(0, 6)) {
                  lines.push(
                    `  ${r.contractCode} · ${r.customerName} · ${r.contractStatus} · ${r.tier} · ends ${r.aggregateEndDate}`,
                  );
                }
                if (d.contractAlerts.length > 6) lines.push(`  …+${d.contractAlerts.length - 6} more (table below)`);
              }
              if (d.zoneLeaseAlerts.length) {
                lines.push('Zone lines + shelf codes (inventory):');
                for (const r of d.zoneLeaseAlerts.slice(0, 5)) {
                  const sc = r.shelfCodes.length ? r.shelfCodes.join(', ') : '—';
                  lines.push(
                    `  ${r.contractCode} / zone ${r.zoneCode} · ${r.contractStatus} · ${r.tier} · ${r.leaseEndDate} · shelves: ${sc}`,
                  );
                }
                if (d.zoneLeaseAlerts.length > 5) lines.push(`  …+${d.zoneLeaseAlerts.length - 5} more (table below)`);
              }
              if (!d.contractAlerts.length && !d.zoneLeaseAlerts.length) {
                lines.push('No expired or soon-expiring items in this snapshot.');
              }
              return lines;
            },
          },
        },
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
      },
    };
  }, [deepExpiryData]);

  useEffect(() => {
    topOutboundOrderRef.current = [];
    topOutboundProductsSignatureRef.current = '';
  }, [outboundStart, outboundEnd]);

  useEffect(() => {
    setExpiryDetailPage(1);
  }, [expirySelectedBucketIndex, expiryContractStatusSelect, deepExpiryData]);

  useEffect(() => {
    setExpiryDetailPage((p) => Math.min(Math.max(1, p), expiryDetailTotalPages));
  }, [expiryDetailTotalPages]);

  useEffect(() => {
    setZonePricingTablePage(1);
  }, [zonePricingWarehouseFilter, deepPricingData]);

  useEffect(() => {
    setZonePricingTablePage((p) => Math.min(Math.max(1, p), zonePricingDetailTotalPages));
  }, [zonePricingDetailTotalPages]);

  useEffect(() => {
    if (!deepPricingData?.length) return;
    if (zonePricingWarehouseFilter === ZONE_PRICING_WAREHOUSE_FILTER_ALL) return;
    const keys = new Set<string>();
    for (const r of deepPricingData) {
      keys.add((r.warehouseId || '').trim() || ZONE_PRICING_WAREHOUSE_NONE_KEY);
    }
    if (!keys.has(zonePricingWarehouseFilter)) {
      setZonePricingWarehouseFilter(ZONE_PRICING_WAREHOUSE_FILTER_ALL);
    }
  }, [deepPricingData, zonePricingWarehouseFilter]);

  useEffect(() => {
    setInsightsByKey({});
    setInsightLoadingKey(null);
    setInsightError(null);
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const fetchData = async () => {
      try {
        if (!hasLoaded) setLoading(true);
        setError(null);

        const [
          reportKpi,
          reportTrend,
          reportSpace,
          reportStock,
          reportAnom,
          reportContracts,
          approvalData,
          topOutboundData,
          processingTimeData,
        ] = await Promise.all([
          getManagerReport(kpiStart, kpiEnd, 'day'),
          getManagerReport(trendStart, trendEnd, trendGranularity),
          getManagerReport(spaceStart, spaceEnd, 'day'),
          getManagerReport(stockStart, stockEnd, 'day'),
          getManagerReport(anomalyStart, anomalyEnd, 'day'),
          getManagerReport(contractRiskStart, contractRiskEnd, 'day'),
          getApprovalByManager(approvalStart, approvalEnd),
          getTopOutboundProducts(outboundStart, outboundEnd),
          getProcessingTime(processingStart, processingEnd, processingTimeGranularity),
        ]);

        if (cancelled) return;
        setStats(reportKpi.stats);
        setTrendData(reportTrend.trendData ?? []);
        setKpiAnomalies(reportTrend.anomalies ?? []);
        setCapacityData(
          reportSpace.capacityData?.length
            ? reportSpace.capacityData
            : [
                { name: 'Occupied', value: 0 },
                { name: 'Empty', value: 100 },
              ],
        );
        setInventoryData(
          (reportStock.inventoryData ?? []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name))),
        );
        setAnomalies(reportAnom.anomalies ?? []);
        setExpiringAndCapacity(reportContracts.expiringAndCapacity ?? null);
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
  }, [
    kpiStart,
    kpiEnd,
    trendStart,
    trendEnd,
    trendGranularity,
    spaceStart,
    spaceEnd,
    stockStart,
    stockEnd,
    anomalyStart,
    anomalyEnd,
    contractRiskStart,
    contractRiskEnd,
    approvalStart,
    approvalEnd,
    outboundStart,
    outboundEnd,
    processingStart,
    processingEnd,
    processingTimeGranularity,
    hasLoaded,
    toast,
  ]);

  useEffect(() => {
    if (tab !== 'deep') return;
    let cancelled = false;
    (async () => {
      setDeepExpiryLoading(true);
      try {
        const data = await getManagerExpiryStackedReport(deepExpiryStart, deepExpiryEnd, deepExpiryGranularity);
        if (!cancelled) setDeepExpiryData(data);
      } catch (e) {
        if (!cancelled) {
          setDeepExpiryData(null);
          toast.error(e instanceof Error ? e.message : 'Could not load expiry stats');
        }
      } finally {
        if (!cancelled) setDeepExpiryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, deepExpiryStart, deepExpiryEnd, deepExpiryGranularity, toast]);

  useEffect(() => {
    if (!deepExpiryData?.buckets?.length) return;
    setExpirySelectedBucketIndex(deepExpiryData.buckets.length - 1);
  }, [deepExpiryData]);

  useEffect(() => {
    if (tab !== 'deep') return;
    let cancelled = false;
    (async () => {
      setDeepPricingLoading(true);
      try {
        const data = await getManagerZonePricingCombo(deepPricingStart, deepPricingEnd);
        if (!cancelled) setDeepPricingData(data);
      } catch (e) {
        if (!cancelled) {
          setDeepPricingData(null);
          toast.error(e instanceof Error ? e.message : 'Could not load zone pricing data');
        }
      } finally {
        if (!cancelled) setDeepPricingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, deepPricingStart, deepPricingEnd, toast]);

  useEffect(() => {
    if (tab !== 'deep') return;
    let cancelled = false;
    (async () => {
      setDeepPenaltyLoading(true);
      try {
        const data = await getManagerPenaltyTopCustomers(deepPenaltyStart, deepPenaltyEnd, 10);
        if (!cancelled) setDeepPenaltyData(data);
      } catch (e) {
        if (!cancelled) {
          setDeepPenaltyData(null);
          toast.error(e instanceof Error ? e.message : 'Could not load penalty analysis');
        }
      } finally {
        if (!cancelled) setDeepPenaltyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, deepPenaltyStart, deepPenaltyEnd, toast]);

  async function handleInsightRequest(
    chartKey: string,
    data: unknown,
    range?: { startDate: string; endDate: string },
  ) {
    try {
      setInsightError(null);
      setInsightLoadingKey(chartKey);
      const res = await requestReportInsight({
        chartKey,
        startDate: range?.startDate ?? kpiStart,
        endDate: range?.endDate ?? kpiEnd,
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manager Reports</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-3xl leading-relaxed">
            Per-section date filters and tabs for summary, deep analytics, approvals, outbound, processing, contracts, and anomalies.
          </p>
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
        <p className="text-sm text-slate-500 mt-2 max-w-3xl leading-relaxed">
          Each chart or block has its own date range (and quick presets). Tabs cover summary KPIs, deep analytics, approvals,
          outbound, processing, contract risk, and anomalies.
        </p>
      </div>
      {insightError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">
          {insightError}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          ['summary', 'Summary'],
          ['deep', 'Deep dive'],
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
          <ChartDateFilterBar
            startDate={kpiStart}
            endDate={kpiEnd}
            activePreset={kpiPreset}
            onStartChange={setKpiStart}
            onEndChange={setKpiEnd}
            onClearPreset={() => setKpiPreset(null)}
            onApplyPreset={(r, preset) => {
              setKpiStart(r.start);
              setKpiEnd(r.end);
              setKpiPreset(preset);
            }}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Inbound Flow" value={stats.inbound} unit="units" />
            <StatCard title="Outbound Flow" value={stats.outbound} unit="units" />
            <StatCard title="Task Accuracy" value={`${stats.completion}%`} />
            <StatCard title="Stock Discrepancy" value={stats.discrepancies} unit="items mismatched" isWarning={stats.discrepancies > 0} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Space utilization</h3>
                <p className="text-xs text-slate-500 mt-1">Share of capacity in use vs empty.</p>
              </div>
              <ChartDateFilterBar
                startDate={spaceStart}
                endDate={spaceEnd}
                activePreset={spacePreset}
                onStartChange={setSpaceStart}
                onEndChange={setSpaceEnd}
                onClearPreset={() => setSpacePreset(null)}
                onApplyPreset={(r, preset) => {
                  setSpaceStart(r.start);
                  setSpaceEnd(r.end);
                  setSpacePreset(preset);
                }}
              />
              <div className="h-72 relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute -top-10 right-0 z-10"
                  isLoading={insightLoadingKey === 'manager_space_utilization'}
                  disabled={insightLoadingKey !== null && insightLoadingKey !== 'manager_space_utilization'}
                  onClick={() =>
                    handleInsightRequest(
                      'manager_space_utilization',
                      { capacityData },
                      { startDate: spaceStart, endDate: spaceEnd },
                    )
                  }
                >
                  Insight
                </Button>
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
              {insightsByKey.manager_space_utilization && (
                <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                    <Button variant="ghost" size="sm" onClick={() => clearInsight('manager_space_utilization')}>
                      Clear
                    </Button>
                  </div>
                  <ChatMarkdown role="model" content={insightsByKey.manager_space_utilization} />
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Stock by category</h3>
                <p className="text-xs text-slate-500 mt-1">Inventory quantity grouped by product category.</p>
              </div>
              <ChartDateFilterBar
                startDate={stockStart}
                endDate={stockEnd}
                activePreset={stockPreset}
                onStartChange={setStockStart}
                onEndChange={setStockEnd}
                onClearPreset={() => setStockPreset(null)}
                onApplyPreset={(r, preset) => {
                  setStockStart(r.start);
                  setStockEnd(r.end);
                  setStockPreset(preset);
                }}
              />
              <div className="max-h-[28rem] overflow-y-auto pr-1">
                <div style={{ height: `${stockChartHeight}px`, minHeight: '18rem' }} className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute -top-10 right-0 z-10"
                    isLoading={insightLoadingKey === 'manager_stock_by_category'}
                    disabled={insightLoadingKey !== null && insightLoadingKey !== 'manager_stock_by_category'}
                    onClick={() =>
                      handleInsightRequest(
                        'manager_stock_by_category',
                        { inventoryData },
                        { startDate: stockStart, endDate: stockEnd },
                      )
                    }
                  >
                    Insight
                  </Button>
                  <Bar
                    data={stockByCategoryData}
                    options={stockByCategoryOptions}
                  />
                </div>
              </div>
              {insightsByKey.manager_stock_by_category && (
                <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                    <Button variant="ghost" size="sm" onClick={() => clearInsight('manager_stock_by_category')}>
                      Clear
                    </Button>
                  </div>
                  <ChatMarkdown role="model" content={insightsByKey.manager_stock_by_category} />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Inbound / outbound trend</h3>
              <p className="text-xs text-slate-500 mt-1">Request counts bucketed by day or week for this range.</p>
            </div>
            <ChartDateFilterBar
              startDate={trendStart}
              endDate={trendEnd}
              activePreset={trendPreset}
              onStartChange={setTrendStart}
              onEndChange={setTrendEnd}
              onClearPreset={() => setTrendPreset(null)}
              onApplyPreset={(r, preset) => {
                setTrendStart(r.start);
                setTrendEnd(r.end);
                setTrendPreset(preset);
              }}
            />
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Trend buckets</p>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white w-fit">
                <button
                  type="button"
                  onClick={() => setTrendGranularity('day')}
                  className={`px-4 py-2 text-xs font-bold transition-colors sm:text-sm ${
                    trendGranularity === 'day' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  By day
                </button>
                <button
                  type="button"
                  onClick={() => setTrendGranularity('week')}
                  className={`px-4 py-2 text-xs font-bold transition-colors sm:text-sm ${
                    trendGranularity === 'week' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  By week
                </button>
              </div>
            </div>
            <div className="h-80 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 z-10"
                isLoading={insightLoadingKey === 'manager_inbound_outbound_trend'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'manager_inbound_outbound_trend'}
                onClick={() =>
                  handleInsightRequest(
                    'manager_inbound_outbound_trend',
                    {
                      granularity: trendGranularity,
                      trendData,
                      anomalies: kpiAnomalies,
                    },
                    { startDate: trendStart, endDate: trendEnd },
                  )
                }
              >
                Insight
              </Button>
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
            {insightsByKey.manager_inbound_outbound_trend && (
              <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                  <Button variant="ghost" size="sm" onClick={() => clearInsight('manager_inbound_outbound_trend')}>
                    Clear
                  </Button>
                </div>
                <ChatMarkdown role="model" content={insightsByKey.manager_inbound_outbound_trend} />
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'approvals' && (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Approval rate by manager</h3>
          <p className="text-xs text-slate-500 mt-1">Inbound and outbound decisions in the window.</p>
        </div>
        <ChartDateFilterBar
          startDate={approvalStart}
          endDate={approvalEnd}
          activePreset={approvalPreset}
          onStartChange={setApprovalStart}
          onEndChange={setApprovalEnd}
          onClearPreset={() => setApprovalPreset(null)}
          onApplyPreset={(r, preset) => {
            setApprovalStart(r.start);
            setApprovalEnd(r.end);
            setApprovalPreset(preset);
          }}
        />

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
            <div className="h-[400px] min-h-[200px] relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 z-10"
                isLoading={insightLoadingKey === 'manager_approval_by_manager'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'manager_approval_by_manager'}
                onClick={() =>
                  handleInsightRequest(
                    'manager_approval_by_manager',
                    { approvalByManager },
                    { startDate: approvalStart, endDate: approvalEnd },
                  )
                }
              >
                Insight
              </Button>
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

            {insightsByKey.manager_approval_by_manager && (
              <div className="mt-6 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                  <Button variant="ghost" size="sm" onClick={() => clearInsight('manager_approval_by_manager')}>
                    Clear
                  </Button>
                </div>
                <ChatMarkdown role="model" content={insightsByKey.manager_approval_by_manager} />
              </div>
            )}

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
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Top 10 outbound products</h3>
          <p className="text-xs text-slate-500 mt-1">Highest volume and shipment count.</p>
        </div>
        <ChartDateFilterBar
          startDate={outboundStart}
          endDate={outboundEnd}
          activePreset={outboundPreset}
          onStartChange={setOutboundStart}
          onEndChange={setOutboundEnd}
          onClearPreset={() => setOutboundPreset(null)}
          onApplyPreset={(r, preset) => {
            setOutboundStart(r.start);
            setOutboundEnd(r.end);
            setOutboundPreset(preset);
          }}
        />

        {topOutboundProducts.length > 0 ? (
          <>
            {/* Horizontal Bar Chart */}
            <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50/50 p-3 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 z-10"
                isLoading={insightLoadingKey === 'manager_top_outbound_products'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'manager_top_outbound_products'}
                onClick={() =>
                  handleInsightRequest(
                    'manager_top_outbound_products',
                    { topOutboundProducts },
                    { startDate: outboundStart, endDate: outboundEnd },
                  )
                }
              >
                Insight
              </Button>
              <div style={{ height: `${outboundChartHeight}px` }}>
                <Bar
                  data={topOutboundProductsBarData}
                  options={topOutboundProductsBarOptions}
                />
              </div>
            </div>

            {insightsByKey.manager_top_outbound_products && (
              <div className="mb-8 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                  <Button variant="ghost" size="sm" onClick={() => clearInsight('manager_top_outbound_products')}>
                    Clear
                  </Button>
                </div>
                <ChatMarkdown role="model" content={insightsByKey.manager_top_outbound_products} />
              </div>
            )}

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
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Processing time</h3>
          <p className="text-xs text-slate-500 mt-1">Hours from request creation to decision.</p>
        </div>
        <ChartDateFilterBar
          startDate={processingStart}
          endDate={processingEnd}
          activePreset={processingPreset}
          onStartChange={setProcessingStart}
          onEndChange={setProcessingEnd}
          onClearPreset={() => setProcessingPreset(null)}
          onApplyPreset={(r, preset) => {
            setProcessingStart(r.start);
            setProcessingEnd(r.end);
            setProcessingPreset(preset);
          }}
        />

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
                <div className="h-72 relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute -top-10 right-0 z-10"
                    isLoading={insightLoadingKey === 'manager_processing_time_trend'}
                    disabled={insightLoadingKey !== null && insightLoadingKey !== 'manager_processing_time_trend'}
                    onClick={() =>
                      handleInsightRequest(
                        'manager_processing_time_trend',
                        {
                          processingTimeGranularity,
                          processingTimeTrend,
                        },
                        { startDate: processingStart, endDate: processingEnd },
                      )
                    }
                  >
                    Insight
                  </Button>
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
                {insightsByKey.manager_processing_time_trend && (
                  <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                      <Button variant="ghost" size="sm" onClick={() => clearInsight('manager_processing_time_trend')}>
                        Clear
                      </Button>
                    </div>
                    <ChatMarkdown role="model" content={insightsByKey.manager_processing_time_trend} />
                  </div>
                )}
              </div>

              {/* Box Plot */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute -top-2 right-0 z-10"
                  isLoading={insightLoadingKey === 'manager_processing_time_distribution'}
                  disabled={insightLoadingKey !== null && insightLoadingKey !== 'manager_processing_time_distribution'}
                  onClick={() =>
                    handleInsightRequest(
                      'manager_processing_time_distribution',
                      { processingTimeBoxPlot },
                      { startDate: processingStart, endDate: processingEnd },
                    )
                  }
                >
                  Insight
                </Button>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pr-24">
                  Distribution (Box Plot)
                </h4>
                <BoxPlotChart data={processingTimeBoxPlot} />
                {insightsByKey.manager_processing_time_distribution && (
                  <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                      <Button variant="ghost" size="sm" onClick={() => clearInsight('manager_processing_time_distribution')}>
                        Clear
                      </Button>
                    </div>
                    <ChatMarkdown role="model" content={insightsByKey.manager_processing_time_distribution} />
                  </div>
                )}
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

      {tab === 'contracts' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Contracts &amp; capacity</h3>
            <p className="text-xs text-slate-500 mt-1">Near-term expiries and utilization snapshot.</p>
          </div>
          <ChartDateFilterBar
            startDate={contractRiskStart}
            endDate={contractRiskEnd}
            activePreset={contractRiskPreset}
            onStartChange={setContractRiskStart}
            onEndChange={setContractRiskEnd}
            onClearPreset={() => setContractRiskPreset(null)}
            onApplyPreset={(r, preset) => {
              setContractRiskStart(r.start);
              setContractRiskEnd(r.end);
              setContractRiskPreset(preset);
            }}
          />
          {!expiringAndCapacity ? (
            <div className="py-12 text-center text-slate-500 text-sm font-medium rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              No contract risk snapshot for this range. Try another date span or check back later.
            </div>
          ) : (
            <>
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
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute -top-10 right-0 z-10"
                  isLoading={insightLoadingKey === 'manager_expiring_contracts'}
                  disabled={insightLoadingKey !== null && insightLoadingKey !== 'manager_expiring_contracts'}
                  onClick={() =>
                    handleInsightRequest(
                      'manager_expiring_contracts',
                      { expiringAndCapacity },
                      { startDate: contractRiskStart, endDate: contractRiskEnd },
                    )
                  }
                >
                  Insight
                </Button>
                <GanttChart contracts={expiringAndCapacity.ganttContracts} />
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm font-medium rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                No contracts expiring in the next 90 days
              </div>
            )}
          </div>
          {insightsByKey.manager_expiring_contracts && (
            <div className="mt-6 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                <Button variant="ghost" size="sm" onClick={() => clearInsight('manager_expiring_contracts')}>
                  Clear
                </Button>
              </div>
              <ChatMarkdown role="model" content={insightsByKey.manager_expiring_contracts} />
            </div>
          )}
            </>
          )}
        </div>
      )}

      {tab === 'deep' && (
        <div className="space-y-8">
          {/* 1. Expiry stacked */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 pr-2">
                <h2 className="text-lg font-black text-slate-900">Expiry status (contracts &amp; zone lines)</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Stacked counts by snapshot date; red/yellow need action. Hover a column or click it—table lists contract
                  codes, customers, zone codes, and shelf codes from inventory (StoredItem).
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                isLoading={insightLoadingKey === 'manager_deep_expiry_stacked'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'manager_deep_expiry_stacked'}
                onClick={() => {
                  const buckets = deepExpiryData?.buckets ?? [];
                  const last = buckets[buckets.length - 1];
                  const focus = buckets[expirySelectedBucketIndex] ?? last;
                  handleInsightRequest(
                    'manager_deep_expiry_stacked',
                    {
                      bucketTotals: buckets.map((b) => ({
                        label: b.label,
                        contracts: b.contracts,
                        zoneLeases: b.zoneLeases,
                      })),
                      focusBucketLabel: focus?.label,
                      focusContractAlerts: focus?.details?.contractAlerts ?? [],
                      focusZoneLeaseAlerts: focus?.details?.zoneLeaseAlerts ?? [],
                      latestBucketLabel: last?.label,
                      latestContractAlerts: last?.details?.contractAlerts ?? [],
                      latestZoneLeaseAlerts: last?.details?.zoneLeaseAlerts ?? [],
                      backendGranularity: deepExpiryData?.granularity,
                      inferredGranularity: deepExpiryGranularity,
                    },
                    { startDate: deepExpiryStart, endDate: deepExpiryEnd },
                  );
                }}
              >
                Insight
              </Button>
            </div>
            <ChartDateFilterBar
              startDate={deepExpiryStart}
              endDate={deepExpiryEnd}
              activePreset={deepExpiryPreset}
              onStartChange={setDeepExpiryStart}
              onEndChange={setDeepExpiryEnd}
              onClearPreset={() => setDeepExpiryPreset(null)}
              onApplyPreset={(r, preset) => {
                setDeepExpiryStart(r.start);
                setDeepExpiryEnd(r.end);
                setDeepExpiryPreset(preset);
              }}
            />
            <div className="relative h-80 w-full">
              {deepExpiryLoading ? (
                <LoadingSkeleton className="h-full rounded-2xl" />
              ) : deepExpiryData && deepExpiryData.buckets.length > 0 ? (
                <Bar
                  data={{
                    labels: deepExpiryData.buckets.map((b) => b.label),
                    datasets: [
                      {
                        label: 'Contract · Expired',
                        data: deepExpiryData.buckets.map((b) => b.contracts.expired),
                        backgroundColor: '#dc2626',
                        stack: 'contracts',
                      },
                      {
                        label: 'Contract · Expiring soon',
                        data: deepExpiryData.buckets.map((b) => b.contracts.expiringSoon),
                        backgroundColor: '#ca8a04',
                        stack: 'contracts',
                      },
                      {
                        label: 'Contract · Active',
                        data: deepExpiryData.buckets.map((b) => b.contracts.active),
                        backgroundColor: '#16a34a',
                        stack: 'contracts',
                      },
                      {
                        label: 'Zone line · Expired',
                        data: deepExpiryData.buckets.map((b) => b.zoneLeases.expired),
                        backgroundColor: '#f87171',
                        stack: 'zones',
                      },
                      {
                        label: 'Zone line · Expiring soon',
                        data: deepExpiryData.buckets.map((b) => b.zoneLeases.expiringSoon),
                        backgroundColor: '#facc15',
                        stack: 'zones',
                      },
                      {
                        label: 'Zone line · Active',
                        data: deepExpiryData.buckets.map((b) => b.zoneLeases.active),
                        backgroundColor: '#4ade80',
                        stack: 'zones',
                      },
                    ],
                  }}
                  options={expiryStackedBarOptions}
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                  No data in this range.
                </div>
              )}
            </div>

            {deepExpiryData && deepExpiryData.buckets.length > 0 && (
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Detail — period: {deepExpiryData.buckets[expirySelectedBucketIndex]?.label ?? '—'}
                  </p>
                  <p className="text-xs text-slate-400">Click a bar to change period</p>
                </div>
                <div className="max-w-sm">
                  <Select
                    label="Contract status"
                    options={EXPIRY_DETAIL_STATUS_SELECT_OPTIONS}
                    value={expiryContractStatusSelect}
                    onChange={(e) =>
                      setExpiryContractStatusSelect(e.target.value as ExpiryContractStatusFilterValue)
                    }
                    className="bg-white"
                  />
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="w-12 px-3 py-2 text-center">#</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Contract</th>
                        <th className="px-3 py-2">Customer</th>
                        <th className="px-3 py-2">Zone</th>
                        <th className="px-3 py-2">Shelf codes</th>
                        <th className="px-3 py-2">End date</th>
                        <th className="px-3 py-2">Expiry tier</th>
                        <th className="px-3 py-2">Contract status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiryPagedDetailRows.map((row, i) => {
                        const rowNum = (safeExpiryDetailPage - 1) * EXPIRY_TABLE_PAGE_SIZE + i + 1;
                        return row.kind === 'contract' ? (
                          <tr key={`c-${row.contractId}-${row.aggregateEndDate}-${i}`} className="border-b border-slate-100">
                            <td className="px-3 py-2 text-center tabular-nums text-slate-500 font-semibold">{rowNum}</td>
                            <td className="px-3 py-2 text-slate-600">Contract (aggregate)</td>
                            <td className="px-3 py-2 font-mono font-semibold text-slate-900">{row.contractCode}</td>
                            <td className="px-3 py-2">{row.customerName}</td>
                            <td className="px-3 py-2 text-slate-400">—</td>
                            <td className="px-3 py-2 text-slate-400">—</td>
                            <td className="px-3 py-2 tabular-nums">{row.aggregateEndDate}</td>
                            <td className="px-3 py-2">
                              <span
                                className={
                                  row.tier === 'expired' ? 'font-bold text-red-600' : 'font-bold text-amber-600'
                                }
                              >
                                {row.tier === 'expired' ? 'Expired' : 'Expiring soon'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-800">{formatManagerContractStatusLabel(row.contractStatus)}</td>
                          </tr>
                        ) : (
                          <tr
                            key={`z-${row.contractId}-${row.zoneId}-${row.leaseEndDate}-${i}`}
                            className="border-b border-slate-100"
                          >
                            <td className="px-3 py-2 text-center tabular-nums text-slate-500 font-semibold">{rowNum}</td>
                            <td className="px-3 py-2 text-slate-600">Zone lease</td>
                            <td className="px-3 py-2 font-mono font-semibold text-slate-900">{row.contractCode}</td>
                            <td className="px-3 py-2">{row.customerName}</td>
                            <td className="px-3 py-2 font-mono text-slate-800">{row.zoneCode}</td>
                            <td className="px-3 py-2 text-xs text-slate-700">
                              {row.shelfCodes.length ? row.shelfCodes.join(', ') : '—'}
                            </td>
                            <td className="px-3 py-2 tabular-nums">{row.leaseEndDate}</td>
                            <td className="px-3 py-2">
                              <span
                                className={
                                  row.tier === 'expired' ? 'font-bold text-red-600' : 'font-bold text-amber-600'
                                }
                              >
                                {row.tier === 'expired' ? 'Expired' : 'Expiring soon'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-800">{formatManagerContractStatusLabel(row.contractStatus)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {expiryFilteredDetailRows.length === 0 &&
                  ((deepExpiryData.buckets[expirySelectedBucketIndex]?.details?.contractAlerts?.length ?? 0) > 0 ||
                    (deepExpiryData.buckets[expirySelectedBucketIndex]?.details?.zoneLeaseAlerts?.length ?? 0) > 0) && (
                    <p className="text-sm text-slate-500">
                      No rows match this contract status. Choose &quot;All statuses&quot; or another period.
                    </p>
                  )}
                {expiryFilteredDetailRows.length > 0 && (
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Showing {(safeExpiryDetailPage - 1) * EXPIRY_TABLE_PAGE_SIZE + 1}–
                      {Math.min(safeExpiryDetailPage * EXPIRY_TABLE_PAGE_SIZE, expiryFilteredDetailRows.length)} of{' '}
                      {expiryFilteredDetailRows.length}
                    </p>
                    <Pagination
                      currentPage={safeExpiryDetailPage}
                      totalPages={expiryDetailTotalPages}
                      onPageChange={setExpiryDetailPage}
                    />
                  </div>
                )}
                {(deepExpiryData.buckets[expirySelectedBucketIndex]?.details?.contractAlerts?.length ?? 0) === 0 &&
                  (deepExpiryData.buckets[expirySelectedBucketIndex]?.details?.zoneLeaseAlerts?.length ?? 0) === 0 && (
                    <p className="text-sm text-slate-500">
                      No expired or expiring-soon contracts/leases in this snapshot (all green for this date).
                    </p>
                  )}
              </div>
            )}

            {insightsByKey.manager_deep_expiry_stacked && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                  <Button variant="ghost" size="sm" onClick={() => clearInsight('manager_deep_expiry_stacked')}>
                    Clear
                  </Button>
                </div>
                <ChatMarkdown role="model" content={insightsByKey.manager_deep_expiry_stacked} />
              </div>
            )}
          </section>

          {/* 2. Combo pricing */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 pr-2">
                <h2 className="text-lg font-black text-slate-900">Zone fill vs suggested rent</h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  See how full each zone is compared side by side with a suggested monthly rent, so you can spot crowded
                  areas and where pricing might deserve another look.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                isLoading={insightLoadingKey === 'manager_deep_zone_pricing'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'manager_deep_zone_pricing'}
                onClick={() =>
                  handleInsightRequest(
                    'manager_deep_zone_pricing',
                    deepPricingData,
                    { startDate: deepPricingStart, endDate: deepPricingEnd },
                  )
                }
              >
                Insight
              </Button>
            </div>
            <ChartDateFilterBar
              startDate={deepPricingStart}
              endDate={deepPricingEnd}
              activePreset={deepPricingPreset}
              onStartChange={setDeepPricingStart}
              onEndChange={setDeepPricingEnd}
              onClearPreset={() => setDeepPricingPreset(null)}
              onApplyPreset={(r, preset) => {
                setDeepPricingStart(r.start);
                setDeepPricingEnd(r.end);
                setDeepPricingPreset(preset);
              }}
            />
            <div className="relative h-80 w-full">
              {deepPricingLoading ? (
                <LoadingSkeleton className="h-full rounded-2xl" />
              ) : deepPricingData && deepPricingData.length > 0 ? (
                <ChartJSComponent
                  type="bar"
                  data={{
                    labels: deepPricingData.map((r) => r.zoneCode),
                    datasets: [
                      {
                        type: 'bar',
                        label: 'Occupancy %',
                        data: deepPricingData.map((r) => r.occupancyPercent),
                        backgroundColor: 'rgba(14, 165, 233, 0.55)',
                        borderColor: 'rgb(14, 165, 233)',
                        borderWidth: 1,
                        yAxisID: 'y',
                      },
                      {
                        type: 'line',
                        label: 'Suggested rent (VND/mo)',
                        data: deepPricingData.map((r) => r.suggestedMonthlyPrice),
                        borderColor: '#9333ea',
                        backgroundColor: 'rgba(147, 51, 234, 0.15)',
                        tension: 0.25,
                        yAxisID: 'y1',
                        pointRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                      y: {
                        type: 'linear',
                        position: 'left',
                        min: 0,
                        max: 100,
                        title: { display: true, text: 'Fill %' },
                      },
                      y1: {
                        type: 'linear',
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'VND / month' },
                        ticks: {
                          callback: (v) => (typeof v === 'number' ? `${(v / 1000).toFixed(0)}k` : v),
                        },
                      },
                    },
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                  No zones or shelf data for this range.
                </div>
              )}
            </div>
            {deepPricingData && deepPricingData.length > 0 && !deepPricingLoading && (
              <div className="mt-6 space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Detail breakdown</p>
                <div className="max-w-md">
                  <Select
                    label="Warehouse"
                    options={zonePricingWarehouseSelectOptions}
                    value={zonePricingWarehouseFilter}
                    onChange={(e) => setZonePricingWarehouseFilter(e.target.value)}
                    className="bg-white"
                  />
                </div>
                {zonePricingFilteredRows.length === 0 ? (
                  <p className="text-sm text-slate-500">No rows for this warehouse filter.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full min-w-[960px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <th className="w-12 px-3 py-2 text-center">#</th>
                            <th className="px-3 py-2">Zone</th>
                            <th className="px-3 py-2">Warehouse</th>
                            <th className="px-3 py-2 text-right">Fill %</th>
                            <th className="px-3 py-2 text-right">Shelves rented / total</th>
                            <th className="px-3 py-2 text-right">Avg rent in range</th>
                            <th className="px-3 py-2 text-right">Suggested rent / mo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {zonePricingPagedRows.map((row, i) => {
                            const rowNum =
                              (safeZonePricingDetailPage - 1) * ZONE_PRICING_TABLE_PAGE_SIZE + i + 1;
                            return (
                              <tr key={`${row.zoneId}-${row.zoneCode}-${i}`} className="border-b border-slate-100">
                                <td className="px-3 py-2 text-center tabular-nums text-slate-500 font-semibold">
                                  {rowNum}
                                </td>
                                <td className="px-3 py-2 font-mono font-semibold text-slate-900">{row.zoneCode}</td>
                                <td className="px-3 py-2 text-slate-800">{row.warehouseName || '—'}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-slate-800">
                                  {Math.round(row.occupancyPercent)}%
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                                  {row.shelfRented}
                                  <span className="text-slate-400"> / </span>
                                  {row.shelfTotal}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-slate-800">
                                  {formatZonePricingVnd(row.avgMonthlyRentInRange)}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-slate-800">
                                  {formatZonePricingVnd(row.suggestedMonthlyPrice)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                      <p className="text-xs text-slate-500">
                        Showing {(safeZonePricingDetailPage - 1) * ZONE_PRICING_TABLE_PAGE_SIZE + 1}–
                        {Math.min(
                          safeZonePricingDetailPage * ZONE_PRICING_TABLE_PAGE_SIZE,
                          zonePricingFilteredRows.length,
                        )}{' '}
                        of {zonePricingFilteredRows.length}
                      </p>
                      <Pagination
                        currentPage={safeZonePricingDetailPage}
                        totalPages={zonePricingDetailTotalPages}
                        onPageChange={setZonePricingTablePage}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
            {insightsByKey.manager_deep_zone_pricing && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                  <Button variant="ghost" size="sm" onClick={() => clearInsight('manager_deep_zone_pricing')}>
                    Clear
                  </Button>
                </div>
                <ChatMarkdown role="model" content={insightsByKey.manager_deep_zone_pricing} />
              </div>
            )}
          </section>

          {/* 3. Penalty horizontal bar */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 pr-2">
                <h2 className="text-lg font-black text-slate-900">Damage exposure by customer</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Top customers by total damage units on request line items in the reporting window.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                isLoading={insightLoadingKey === 'manager_deep_penalty_damage'}
                disabled={insightLoadingKey !== null && insightLoadingKey !== 'manager_deep_penalty_damage'}
                onClick={() =>
                  handleInsightRequest(
                    'manager_deep_penalty_damage',
                    deepPenaltyData,
                    { startDate: deepPenaltyStart, endDate: deepPenaltyEnd },
                  )
                }
              >
                Insight
              </Button>
            </div>
            <ChartDateFilterBar
              startDate={deepPenaltyStart}
              endDate={deepPenaltyEnd}
              activePreset={deepPenaltyPreset}
              onStartChange={setDeepPenaltyStart}
              onEndChange={setDeepPenaltyEnd}
              onClearPreset={() => setDeepPenaltyPreset(null)}
              onApplyPreset={(r, preset) => {
                setDeepPenaltyStart(r.start);
                setDeepPenaltyEnd(r.end);
                setDeepPenaltyPreset(preset);
              }}
            />
            <div
              className="relative w-full"
              style={{ height: `${Math.max(280, (deepPenaltyData?.length ?? 5) * 40 + 80)}px` }}
            >
              {deepPenaltyLoading ? (
                <LoadingSkeleton className="h-full min-h-[280px] rounded-2xl" />
              ) : deepPenaltyData && deepPenaltyData.length > 0 ? (
                <Bar
                  data={{
                    labels: deepPenaltyData.map((r) =>
                      r.customerName.length > 28 ? `${r.customerName.slice(0, 28)}…` : r.customerName,
                    ),
                    datasets: [
                      {
                        label: 'Total damage (units)',
                        data: deepPenaltyData.map((r) => r.totalDamageUnits),
                        backgroundColor: 'rgba(239, 68, 68, 0.65)',
                        borderColor: '#b91c1c',
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          afterLabel: (ctx) => {
                            const row = deepPenaltyData![ctx.dataIndex];
                            return `${row.affectedRequestCount} request(s) with damage`;
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        title: { display: true, text: 'Units' },
                      },
                    },
                  }}
                />
              ) : (
                <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                  No damage records in this range.
                </div>
              )}
            </div>
            {insightsByKey.manager_deep_penalty_damage && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
                  <Button variant="ghost" size="sm" onClick={() => clearInsight('manager_deep_penalty_damage')}>
                    Clear
                  </Button>
                </div>
                <ChatMarkdown role="model" content={insightsByKey.manager_deep_penalty_damage} />
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'anomalies' && (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Anomalies</h3>
            <p className="text-xs text-slate-500 mt-1">Unusual inbound/outbound days vs recent average.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            isLoading={insightLoadingKey === 'manager_report_anomalies'}
            disabled={insightLoadingKey !== null && insightLoadingKey !== 'manager_report_anomalies'}
            onClick={() =>
              handleInsightRequest(
                'manager_report_anomalies',
                { anomalies },
                { startDate: anomalyStart, endDate: anomalyEnd },
              )
            }
          >
            Insight
          </Button>
        </div>
        <ChartDateFilterBar
          startDate={anomalyStart}
          endDate={anomalyEnd}
          activePreset={anomalyPreset}
          onStartChange={setAnomalyStart}
          onEndChange={setAnomalyEnd}
          onClearPreset={() => setAnomalyPreset(null)}
          onApplyPreset={(r, preset) => {
            setAnomalyStart(r.start);
            setAnomalyEnd(r.end);
            setAnomalyPreset(preset);
          }}
        />
        {insightsByKey.manager_report_anomalies && (
          <div className="mb-6 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insight</p>
              <Button variant="ghost" size="sm" onClick={() => clearInsight('manager_report_anomalies')}>
                Clear
              </Button>
            </div>
            <ChatMarkdown role="model" content={insightsByKey.manager_report_anomalies} />
          </div>
        )}
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