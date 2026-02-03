import { apiJson } from './api-client';

export interface CycleCountTargetItem {
  stored_item_id: string;
  shelf_id: string;
  shelf_code: string;
  item_name: string;
  unit: string;
  system_quantity: number;
}

export interface CycleCountItemResult {
  item_id?: string;
  stored_item_id: string;
  shelf_id: string;
  shelf_code: string;
  item_name: string;
  unit: string;
  system_quantity: number;
  counted_quantity?: number;
  discrepancy?: number;
  note?: string;
}

export interface CycleCountResponse {
  cycle_count_id: string;
  contract_id: string;
  contract_code: string;
  customer_id: string;
  customer_name: string;
  status: string;
  note?: string;
  preferred_date?: string;
  requested_at: string;
  approved_at?: string;
  counting_deadline?: string;
  completed_at?: string;
  assigned_staff?: Array<{ user_id: string; name: string; email: string; assigned_at: string }>;
  items?: CycleCountItemResult[];
  target_items?: CycleCountTargetItem[];
  warehouse_id: string;
  warehouse_name: string;
  created_at: string;
  updated_at: string;
}

export async function getCycleCounts(): Promise<CycleCountResponse[]> {
  return await apiJson<CycleCountResponse[]>('/cycle-counts', { method: 'GET' });
}

export async function getCycleCountById(id: string): Promise<CycleCountResponse> {
  return await apiJson<CycleCountResponse>(`/cycle-counts/${id}`, { method: 'GET' });
}

export interface SubmitCycleCountResultItem {
  storedItemId: string;
  shelfId: string;
  countedQuantity: number;
  note?: string;
}

export async function submitCycleCountResult(
  cycleCountId: string,
  items: SubmitCycleCountResultItem[]
): Promise<CycleCountResponse> {
  return await apiJson<CycleCountResponse>(`/cycle-counts/${cycleCountId}/submit-result`, {
    method: 'PUT',
    body: JSON.stringify({
      items: items.map((i) => ({
        storedItemId: i.storedItemId,
        shelfId: i.shelfId,
        countedQuantity: i.countedQuantity,
        note: i.note?.trim() || undefined,
      })),
    }),
  });
}
