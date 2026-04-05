import { apiJson } from './api-client';

export interface StockHistoryItem {
  request_id: string;
  contract_id: string;
  customer_id: string;
  customer_name?: string;
  request_type: 'IN' | 'OUT';
  status: 'PENDING' | 'APPROVED' | 'DONE_BY_STAFF' | 'COMPLETED' | 'REJECTED';
  items: {
    request_detail_id: string;
    shelf_id: string;
    shelf_code?: string;
    item_name: string;
    quantity_requested: number;
    quantity_actual?: number;
    unit: string;
  }[];
  approved_by?: string;
  approved_at?: string;
  customer_confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedStockHistoryResponse {
  history: StockHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value));
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export async function getStockInHistory(params: {
  contractId?: string;
  status?: 'PENDING' | 'APPROVED' | 'DONE_BY_STAFF' | 'COMPLETED' | 'REJECTED';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
} = {}): Promise<PaginatedStockHistoryResponse> {
  const query = buildQuery({
    contractId: params.contractId,
    status: params.status,
    startDate: params.startDate,
    endDate: params.endDate,
    page: params.page,
    limit: params.limit,
  });
  return await apiJson<PaginatedStockHistoryResponse>(
    `/stock-history/inbound${query}`,
    { method: 'GET' }
  );
}

export async function getStockOutHistory(params: {
  contractId?: string;
  status?: 'PENDING' | 'APPROVED' | 'DONE_BY_STAFF' | 'COMPLETED' | 'REJECTED';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
} = {}): Promise<PaginatedStockHistoryResponse> {
  const query = buildQuery({
    contractId: params.contractId,
    status: params.status,
    startDate: params.startDate,
    endDate: params.endDate,
    page: params.page,
    limit: params.limit,
  });
  return await apiJson<PaginatedStockHistoryResponse>(
    `/stock-history/outbound${query}`,
    { method: 'GET' }
  );
}

