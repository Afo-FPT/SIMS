import { apiJson } from './api-client';
import type {
  ManagerReportResponse,
  ApprovalByManagerItem,
  TopOutboundProductItem,
  ProcessingTimeTrendPoint,
  ProcessingTimeBoxPlotItem,
  ExpiryStackedReport,
  ZonePricingComboRow,
  PenaltyTopCustomerRow,
  ManagerDeepGranularity,
  ManagerRevenueReportResponse,
} from '../types/manager';

export type ReportGranularity = 'day' | 'week';

/**
 * Lấy dữ liệu báo cáo operations cho manager (kết nối backend GET /api/reports).
 * Gồm stats, capacity, inventory, trendData (Inbound/Outbound theo ngày/tuần), anomalies.
 */
export async function getManagerReport(
  startDate: string,
  endDate: string,
  granularity: ReportGranularity = 'day'
): Promise<ManagerReportResponse> {
  const params = new URLSearchParams({ startDate, endDate });
  if (granularity === 'week') params.set('granularity', 'week');
  return apiJson<ManagerReportResponse>(`/reports?${params.toString()}`);
}

/**
 * Get approval rate by manager (Inbound + Outbound).
 * Backend GET /api/reports/approval-by-manager?startDate=&endDate=
 */
export async function getApprovalByManager(
  startDate: string,
  endDate: string
): Promise<ApprovalByManagerItem[]> {
  const params = new URLSearchParams({ startDate, endDate });
  return apiJson<ApprovalByManagerItem[]>(`/reports/approval-by-manager?${params.toString()}`);
}

/**
 * Get top 10 products by outbound quantity (highest frequency and volume).
 * Backend GET /api/reports/top-outbound-products?startDate=&endDate=
 */
export async function getTopOutboundProducts(
  startDate: string,
  endDate: string
): Promise<TopOutboundProductItem[]> {
  const params = new URLSearchParams({ startDate, endDate });
  return apiJson<TopOutboundProductItem[]>(`/reports/top-outbound-products?${params.toString()}`);
}

/**
 * Get average processing time stats (creation to approval/rejection).
 * Backend GET /api/reports/processing-time?startDate=&endDate=&granularity=week|month
 */
export async function getProcessingTime(
  startDate: string,
  endDate: string,
  granularity: 'week' | 'month' = 'week'
): Promise<{ trendData: ProcessingTimeTrendPoint[]; boxPlotData: ProcessingTimeBoxPlotItem[] }> {
  const params = new URLSearchParams({ startDate, endDate, granularity });
  return apiJson<{ trendData: ProcessingTimeTrendPoint[]; boxPlotData: ProcessingTimeBoxPlotItem[] }>(
    `/reports/processing-time?${params.toString()}`,
  );
}

/** Stacked expiry status (contracts + zone leases) by period */
export async function getManagerExpiryStackedReport(
  startDate: string,
  endDate: string,
  granularity: ManagerDeepGranularity,
): Promise<ExpiryStackedReport> {
  const params = new URLSearchParams({ startDate, endDate, granularity });
  return apiJson<ExpiryStackedReport>(`/reports/manager/expiry-stacked?${params.toString()}`);
}

/** Zone occupancy (snapshot) + avg rent in range + AI suggested monthly price */
export async function getManagerZonePricingCombo(
  startDate: string,
  endDate: string,
): Promise<ZonePricingComboRow[]> {
  const params = new URLSearchParams({ startDate, endDate });
  return apiJson<ZonePricingComboRow[]>(`/reports/manager/zone-pricing-combo?${params.toString()}`);
}

/** Top customers by damage quantity (inventory penalty proxy) */
export async function getManagerPenaltyTopCustomers(
  startDate: string,
  endDate: string,
  limit = 10,
): Promise<PenaltyTopCustomerRow[]> {
  const params = new URLSearchParams({ startDate, endDate, limit: String(limit) });
  return apiJson<PenaltyTopCustomerRow[]>(`/reports/manager/penalty-top-customers?${params.toString()}`);
}

/** Revenue summary + trend by week/month */
export async function getManagerRevenueReport(
  startDate: string,
  endDate: string,
  granularity: 'week' | 'month' = 'week',
): Promise<ManagerRevenueReportResponse> {
  const params = new URLSearchParams({ startDate, endDate, granularity });
  return apiJson<ManagerRevenueReportResponse>(`/reports/manager/revenue?${params.toString()}`);
}
