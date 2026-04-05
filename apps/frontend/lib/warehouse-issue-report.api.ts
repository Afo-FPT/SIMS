import { apiJson } from './api-client';

export interface CreateWarehouseIssueReportPayload {
  note: string;
  warehouseId?: string;
  type?: 'damage' | 'safety' | 'equipment' | 'inventory' | 'other';
}

export interface WarehouseIssueReportResponse {
  report_id: string;
  staff_id: string;
  warehouse_id?: string;
  note: string;
  type?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function createWarehouseIssueReport(
  payload: CreateWarehouseIssueReportPayload
): Promise<WarehouseIssueReportResponse> {
  if (!payload.note || !payload.note.trim()) {
    throw new Error('Ghi chú (note) là bắt buộc');
  }
  return await apiJson<WarehouseIssueReportResponse>('/warehouse-issue-reports', {
    method: 'POST',
    body: JSON.stringify({
      note: payload.note.trim(),
      warehouseId: payload.warehouseId?.trim() || undefined,
      type: payload.type || undefined,
    }),
  });
}
