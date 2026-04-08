import { apiJson } from './api-client';

export interface CreateInboundItemPayload {
  itemName: string;
  quantity: number;
  unit: string;
  quantityPerUnit?: number;
  /** Volume of one unit in cubic meters (m³) */
  volumePerUnitM3: number;
}

export async function createInboundStorageRequest(payload: {
  contractId: string;
  zoneId: string;
  /** Customer-provided inbound reference (e.g. IN-2025-0025) */
  reference?: string;
  items: CreateInboundItemPayload[];
}) {
  return await apiJson('/storage-requests/inbound', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface CreateOutboundItemPayload {
  shelfId: string;
  itemName: string;
  quantity: number;
  unit: string;
}

export async function createOutboundStorageRequest(payload: {
  contractId: string;
  /** Customer-provided outbound reference (e.g. OUT-2025-0012) */
  reference?: string;
  items: CreateOutboundItemPayload[];
}) {
  return await apiJson('/storage-requests/outbound', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface StorageRequestView {
  request_id: string;
  contract_id: string;
  /** Contract code for display (Contract code) */
  contract_code?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  requested_zone_id?: string;
  requested_zone_code?: string;
  /** Customer-provided inbound/outbound reference */
  reference?: string;
  customer_id: string;
  customer_name?: string;
  request_type: 'IN' | 'OUT';
  status: 'PENDING' | 'APPROVED' | 'DONE_BY_STAFF' | 'COMPLETED' | 'REJECTED';
  created_at: string;
  updated_at: string;
  items: Array<{
    request_detail_id: string;
    shelf_id?: string;
    shelf_code?: string;
    zone_id?: string;
    zone_code?: string;
    item_name: string;
    unit: string;
    quantity_per_unit?: number;
    volume_per_unit_m3?: number;
    quantity_requested: number;
    quantity_actual?: number;
    /** Shelf stock before/after staff completed IN/OUT (when recorded) */
    quantity_on_hand_before?: number;
    quantity_on_hand_after?: number;
    damage_quantity?: number;
    loss_reason?: string;
    loss_notes?: string;
  }>;
}

export async function listStorageRequests(
  params: { requestType?: 'IN' | 'OUT'; status?: string; allAssigned?: boolean } = {}
): Promise<StorageRequestView[]> {
  const qs = new URLSearchParams();
  if (params.requestType) qs.set('requestType', params.requestType);
  if (params.status) qs.set('status', params.status);
  if (params.allAssigned) qs.set('allAssigned', 'true');
  return await apiJson<StorageRequestView[]>(
    `/storage-requests${qs.toString() ? `?${qs}` : ''}`,
    { method: 'GET' }
  );
}

export async function getStorageRequestById(id: string): Promise<StorageRequestView> {
  return await apiJson<StorageRequestView>(`/storage-requests/${id}`, { method: 'GET' });
}

/**
 * Customer confirms a staff-completed storage request.
 * PATCH /storage-requests/:id/confirm
 */
export async function confirmStorageRequest(requestId: string) {
  return await apiJson<{ request_id: string; final_status: string; customer_confirmed_at: string; updated_at: string }>(
    `/storage-requests/${requestId}/confirm`,
    { method: 'PATCH' },
  );
}

/**
 * Manager assigns a PENDING storage request to one or more staff.
 * PATCH /storage-requests/:id/assign  body: { staffIds: string[] }
 */
export async function assignStorageRequest(requestId: string, staffIds: string[]) {
  return await apiJson<{ request_id: string; status: string; assigned_staff_ids: string[] }>(
    `/storage-requests/${requestId}/assign`,
    {
      method: 'PATCH',
      body: JSON.stringify({ staffIds }),
    }
  );
}

export async function approveInboundRequest(id: string, payload: { decision: 'APPROVED' | 'REJECTED'; note?: string }) {
  return await apiJson(`/inbound-requests/${id}/approval`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export interface ContractShelfOption {
  shelf_id: string;
  shelf_code: string;
  zone_id: string;
  zone_code?: string;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE';
}

export async function listContractShelves(contractId: string): Promise<ContractShelfOption[]> {
  return await apiJson<ContractShelfOption[]>(`/contracts/${contractId}/shelves`, { method: 'GET' });
}

export async function staffCompleteStorageRequest(payload: {
  requestId: string;
  items: Array<{
    requestDetailId: string;
    quantityActual: number;
    shelfId?: string;
    damageQuantity?: number;
    lossReason?: string;
    lossNotes?: string;
  }>;
}) {
  return await apiJson(`/staff/storage-requests/${payload.requestId}/complete`, {
    method: 'PATCH',
    body: JSON.stringify({ items: payload.items }),
  });
}

