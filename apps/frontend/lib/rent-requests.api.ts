import type { RentRequest, Contract } from './customer-types';
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
  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  return fetch(getApiUrl(path), {
    ...options,
    headers,
  });
}

interface BackendRentRequest {
  id: string;
  shelves: number;
  startDate: string;
  durationMonths: number;
  zonePreference?: string;
  goodsCategory: string[];
  handlingNotes: string[];
  specialNotes?: string;
  countingUnit: string;
  conversionRule?: {
    boxToPiece?: number;
    cartonToBox?: number;
    palletToCarton?: number;
  };
  status: RentRequest['status'];
  customerName?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt?: string;
}

interface RentRequestsListResponse {
  message: string;
  data: BackendRentRequest[];
}

interface RentRequestSingleResponse {
  message: string;
  data: BackendRentRequest;
}

function mapBackendToRentRequest(r: BackendRentRequest): RentRequest {
  return {
    id: r.id,
    shelves: r.shelves,
    startDate: r.startDate,
    durationMonths: r.durationMonths,
    zonePreference: r.zonePreference as any,
    goodsCategory: r.goodsCategory as any,
    handlingNotes: r.handlingNotes as any,
    specialNotes: r.specialNotes,
    countingUnit: r.countingUnit as any,
    conversionRule: r.conversionRule,
    status: r.status,
    customerName: r.customerName,
    rejectReason: r.rejectReason,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function listRentRequests(): Promise<RentRequest[]> {
  const res = await fetchWithAuth('/rent-requests', { method: 'GET' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load rent requests');
  }
  const response = data as RentRequestsListResponse;
  return response.data.map(mapBackendToRentRequest);
}

export interface CreateRentRequestPayload {
  shelves: number;
  startDate: string;
  durationMonths: number;
  zonePreference?: string;
  goodsCategory?: string[];
  handlingNotes?: string[];
  specialNotes?: string;
  countingUnit: string;
  conversionRule?: {
    boxToPiece?: number;
    cartonToBox?: number;
    palletToCarton?: number;
  };
}

export async function createRentRequest(payload: CreateRentRequestPayload): Promise<RentRequest> {
  const res = await fetchWithAuth('/rent-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create rent request');
  }
  const response = data as RentRequestSingleResponse;
  return mapBackendToRentRequest(response.data);
}

export async function submitRentRequest(id: string): Promise<RentRequest> {
  const res = await fetchWithAuth(`/rent-requests/${id}/submit`, {
    method: 'PATCH',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to submit rent request');
  }
  const response = data as RentRequestSingleResponse;
  return mapBackendToRentRequest(response.data);
}

export async function cancelRentRequest(id: string): Promise<void> {
  const res = await fetchWithAuth(`/rent-requests/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to cancel rent request');
  }
}

export async function managerUpdateRentRequestStatus(
  id: string,
  status: 'Approved' | 'Rejected',
  rejectReason?: string
): Promise<RentRequest> {
  const res = await fetchWithAuth(`/rent-requests/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, rejectReason }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update rent request status');
  }
  const response = data as RentRequestSingleResponse;
  return mapBackendToRentRequest(response.data);
}

// --- Draft contract from warehouse + count + date range (system picks shelves) ---

export interface WarehouseOption {
  id: string;
  name: string;
  address: string;
  status: string;
}

interface BackendWarehouseListItem {
  warehouse_id: string;
  name: string;
  address: string;
  status: string;
}

interface WarehousesApiResponse {
  message: string;
  data: {
    warehouses: BackendWarehouseListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

/** List warehouses for customer to choose when requesting rental (ACTIVE only). */
export async function listWarehousesForRent(): Promise<WarehouseOption[]> {
  const res = await fetchWithAuth('/warehouses?status=ACTIVE&limit=100');
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load warehouses');
  }
  const result = data as WarehousesApiResponse;
  return result.data.warehouses.map((w) => ({
    id: w.warehouse_id,
    name: w.name,
    address: w.address,
    status: w.status,
  }));
}

export interface ZoneOption {
  id: string;
  zoneCode: string;
  name: string;
  warehouseId: string;
  status?: string;
}

interface ZoneListApiResponse {
  message: string;
  data: ZoneOption[] | { zone_id: string; zone_code: string; name: string; warehouse_id: string; status: string }[];
}

/** List zones in a warehouse (for customer to choose zone when requesting draft). */
export async function listZonesByWarehouse(warehouseId: string): Promise<ZoneOption[]> {
  const res = await fetchWithAuth(`/warehouses/${warehouseId}/zones`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load zones');
  }
  const list = Array.isArray(data.data) ? data.data : [];
  return list.map((z: any) => ({
    id: z.zone_id ?? z.id,
    zoneCode: z.zone_code ?? z.zoneCode ?? '',
    name: z.name ?? '',
    warehouseId: z.warehouse_id ?? z.warehouseId ?? warehouseId,
    status: z.status,
  }));
}

interface BackendContractResponse {
  contract_id: string;
  contract_code: string;
  customer_id: string;
  customer_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  rented_zones: {
    zone_id: string;
    zone_code?: string;
    zone_name?: string;
    start_date: string;
    end_date: string;
    price: number;
  }[];
  requested_zone_id?: string;
  requested_start_date?: string;
  requested_end_date?: string;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  created_by: string;
  created_at: string;
  updated_at: string;
}

function mapBackendContractToContract(c: BackendContractResponse): Contract {
  return {
    id: c.contract_id,
    code: c.contract_code,
    customerId: c.customer_id,
    customerName: c.customer_name,
    warehouseId: c.warehouse_id,
    rentedZones: (c.rented_zones || []).map((rz) => ({
      zoneId: rz.zone_id,
      zoneCode: rz.zone_code,
      zoneName: rz.zone_name,
      startDate: typeof rz.start_date === 'string' ? rz.start_date : new Date(rz.start_date).toISOString(),
      endDate: typeof rz.end_date === 'string' ? rz.end_date : new Date(rz.end_date).toISOString(),
      price: rz.price,
    })),
    requestedZoneId: c.requested_zone_id,
    requestedStartDate: c.requested_start_date ? (typeof c.requested_start_date === 'string' ? c.requested_start_date : new Date(c.requested_start_date).toISOString()) : undefined,
    requestedEndDate: c.requested_end_date ? (typeof c.requested_end_date === 'string' ? c.requested_end_date : new Date(c.requested_end_date).toISOString()) : undefined,
    status: c.status,
    createdBy: c.created_by,
    createdAt: typeof c.created_at === 'string' ? c.created_at : new Date(c.created_at).toISOString(),
    updatedAt: typeof c.updated_at === 'string' ? c.updated_at : new Date(c.updated_at).toISOString(),
  };
}

export interface CreateDraftContractPayload {
  warehouseId: string;
  startDate: string;
  endDate: string;
}

/** Customer requests draft contract (warehouse + period). Zone is auto-assigned when manager approves. */
export async function createDraftContractRequest(payload: CreateDraftContractPayload): Promise<Contract> {
  const res = await fetchWithAuth('/contracts/request-draft', {
    method: 'POST',
    body: JSON.stringify({
      warehouseId: payload.warehouseId,
      startDate: payload.startDate,
      endDate: payload.endDate,
    }),
  });
  let data: { message?: string; data?: BackendContractResponse } = {};
  try {
    data = await res.json();
  } catch {
    throw new Error(res.status === 401 ? 'Please log in again' : 'Failed to create draft contract');
  }
  if (!res.ok) {
    const msg = data.message || (res.status === 401 ? 'Please log in again' : res.status === 403 ? 'You do not have permission' : res.status === 400 ? 'Invalid request' : 'Failed to create draft contract');
    throw new Error(msg);
  }
  const raw = data.data ?? data;
  if (!raw || typeof raw !== 'object' || !('contract_id' in raw) && !('contract_code' in raw)) {
    throw new Error('Invalid response from server');
  }
  return mapBackendContractToContract(raw as BackendContractResponse);
}

