import { apiJson } from './api-client';
import type { ManagerReportResponse } from '../types/manager';

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
