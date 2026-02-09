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
  approved_by?: {
    user_id: string;
    name: string;
    email: string;
  };
  rejected_at?: string;
  rejected_by?: {
    user_id: string;
    name: string;
    email: string;
  };
  rejection_reason?: string;
  counting_deadline?: string;
  completed_at?: string;
  confirmed_at?: string;
  confirmed_by?: {
    user_id: string;
    name: string;
    email: string;
  };
  assigned_staff?: Array<{ user_id: string; name: string; email: string; assigned_at: string }>;
  items?: CycleCountItemResult[];
  target_items?: CycleCountTargetItem[];
  warehouse_id: string;
  warehouse_name: string;
  created_at: string;
  updated_at: string;
  inventory_adjusted?: boolean;
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

// CUSTOMER creates cycle count (inventory checking) request
export interface CreateCycleCountPayload {
  contractId: string;
  /**
   * Optional list of stored item IDs to count.
   * If omitted, backend will count ALL stored items of the contract.
   */
  storedItemIds?: string[];
  note?: string;
  preferredDate?: string;
}

export async function createCycleCount(
  payload: CreateCycleCountPayload
): Promise<CycleCountResponse> {
  return await apiJson<CycleCountResponse>('/cycle-counts', {
    method: 'POST',
    body: JSON.stringify({
      contractId: payload.contractId,
      storedItemIds: payload.storedItemIds && payload.storedItemIds.length > 0 ? payload.storedItemIds : undefined,
      note: payload.note?.trim() || undefined,
      preferredDate: payload.preferredDate || undefined,
    }),
  });
}

// MANAGER approves or rejects cycle count
export async function approveCycleCount(
  cycleCountId: string
): Promise<CycleCountResponse> {
  return await apiJson<CycleCountResponse>(`/cycle-counts/${cycleCountId}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ decision: 'APPROVED' }),
  });
}

export async function rejectCycleCount(
  cycleCountId: string,
  rejectionReason: string
): Promise<CycleCountResponse> {
  return await apiJson<CycleCountResponse>(`/cycle-counts/${cycleCountId}/approve`, {
    method: 'PUT',
    body: JSON.stringify({
      decision: 'REJECTED',
      rejectionReason: rejectionReason.trim(),
    }),
  });
}

// MANAGER assigns staff to cycle count
export interface AssignStaffPayload {
  staffIds: string[];
  countingDeadline: string; // ISO string or any date string parseable by backend
}

export async function assignStaffToCycleCount(
  cycleCountId: string,
  payload: AssignStaffPayload
): Promise<CycleCountResponse> {
  return await apiJson<CycleCountResponse>(`/cycle-counts/${cycleCountId}/assign-staff`, {
    method: 'PUT',
    body: JSON.stringify({
      staffIds: payload.staffIds,
      countingDeadline: payload.countingDeadline,
    }),
  });
}

// CUSTOMER confirms cycle count result (no inventory adjustment)
export async function confirmCycleCount(
  cycleCountId: string
): Promise<CycleCountResponse> {
  return await apiJson<CycleCountResponse>(`/cycle-counts/${cycleCountId}/confirm`, {
    method: 'PUT',
  });
}

// MANAGER requests recount after staff submitted
export async function requestRecount(
  cycleCountId: string
): Promise<CycleCountResponse> {
  return await apiJson<CycleCountResponse>(`/cycle-counts/${cycleCountId}/request-recount`, {
    method: 'PUT',
  });
}

// CUSTOMER requests inventory adjustment based on discrepancies
export async function requestInventoryAdjustment(
  cycleCountId: string,
  reason?: string
): Promise<CycleCountResponse> {
  return await apiJson<CycleCountResponse>(`/cycle-counts/${cycleCountId}/request-adjustment`, {
    method: 'PUT',
    body: JSON.stringify({
      reason: reason?.trim() || undefined,
    }),
  });
}

// MANAGER applies inventory adjustment
export async function applyCycleCountAdjustment(
  cycleCountId: string
): Promise<CycleCountResponse> {
  return await apiJson<CycleCountResponse>(`/cycle-counts/${cycleCountId}/apply-adjustment`, {
    method: 'PUT',
  });
}
