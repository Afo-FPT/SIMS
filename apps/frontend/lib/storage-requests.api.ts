import { getAuthState } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const state = getAuthState();
  return state.token;
}

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  return fetch(getApiUrl(path), { ...options, headers });
}

export interface CreateInboundItemPayload {
  itemName: string;
  quantity: number;
  unit: string;
  quantityPerUnit?: number;
}

export async function createInboundStorageRequest(payload: {
  contractId: string;
  items: CreateInboundItemPayload[];
}) {
  const res = await fetchWithAuth('/storage-requests/inbound', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to create inbound request');
  return data.data ?? data;
}

export interface CreateOutboundItemPayload {
  shelfId: string;
  itemName: string;
  quantity: number;
  unit: string;
}

export async function createOutboundStorageRequest(payload: {
  contractId: string;
  items: CreateOutboundItemPayload[];
}) {
  const res = await fetchWithAuth('/storage-requests/outbound', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to create outbound request');
  return data.data ?? data;
}

export interface StorageRequestView {
  request_id: string;
  contract_id: string;
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
  const res = await fetchWithAuth(`/storage-requests${qs.toString() ? `?${qs}` : ''}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to load storage requests');
  return (data.data ?? data) as StorageRequestView[];
}

export async function getStorageRequestById(id: string): Promise<StorageRequestView> {
  const res = await fetchWithAuth(`/storage-requests/${id}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to load storage request');
  return (data.data ?? data) as StorageRequestView;
}

export async function approveInboundRequest(id: string, payload: { decision: 'APPROVED' | 'REJECTED'; note?: string }) {
  const res = await fetchWithAuth(`/inbound-requests/${id}/approval`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to approve inbound request');
  return data.data ?? data;
}

export interface ContractShelfOption {
  shelf_id: string;
  shelf_code: string;
  zone_id: string;
  zone_code?: string;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE';
}

export async function listContractShelves(contractId: string): Promise<ContractShelfOption[]> {
  const res = await fetchWithAuth(`/contracts/${contractId}/shelves`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to load contract shelves');
  return (data.data ?? data) as ContractShelfOption[];
}

export async function staffCompleteStorageRequest(payload: {
  requestId: string;
  items: Array<{ requestDetailId: string; quantityActual: number; shelfId?: string }>;
}) {
  const res = await fetchWithAuth(`/staff/storage-requests/${payload.requestId}/complete`, {
    method: 'PATCH',
    body: JSON.stringify({ items: payload.items }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to complete storage request');
  return data.data ?? data;
}

