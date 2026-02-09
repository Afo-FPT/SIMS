import { apiJson } from './api-client';

export interface CreateInboundItemPayload {
  itemName: string;
  quantity: number;
  unit: string;
  quantityPerUnit?: number;
}

export async function createInboundStorageRequest(payload: {
  contractId: string;
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
  /** Customer-provided inbound/outbound reference */
  reference?: string;
  customer_id: string;
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
    quantity_requested: number;
    quantity_actual?: number;
  }>;
}

export async function listStorageRequests(params: { requestType?: 'IN' | 'OUT'; status?: string } = {}): Promise<StorageRequestView[]> {
  const qs = new URLSearchParams();
  if (params.requestType) qs.set('requestType', params.requestType);
  if (params.status) qs.set('status', params.status);
  return await apiJson<StorageRequestView[]>(
    `/storage-requests${qs.toString() ? `?${qs}` : ''}`,
    { method: 'GET' }
  );
}

export async function getStorageRequestById(id: string): Promise<StorageRequestView> {
  return await apiJson<StorageRequestView>(`/storage-requests/${id}`, { method: 'GET' });
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
  items: Array<{ requestDetailId: string; quantityActual: number; shelfId?: string }>;
}) {
  return await apiJson(`/staff/storage-requests/${payload.requestId}/complete`, {
    method: 'PATCH',
    body: JSON.stringify({ items: payload.items }),
  });
}

