import type { RentRequest, Contract } from './customer-types';
import { apiFetchRaw, apiJson } from './api-client';

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
  const list = await apiJson<BackendRentRequest[]>('/rent-requests', { method: 'GET' });
  return list.map(mapBackendToRentRequest);
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
  const created = await apiJson<BackendRentRequest>('/rent-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapBackendToRentRequest(created);
}

export async function submitRentRequest(id: string): Promise<RentRequest> {
  const updated = await apiJson<BackendRentRequest>(`/rent-requests/${id}/submit`, { method: 'PATCH' });
  return mapBackendToRentRequest(updated);
}

export async function cancelRentRequest(id: string): Promise<void> {
  await apiJson(`/rent-requests/${id}`, { method: 'DELETE' });
}

export async function managerUpdateRentRequestStatus(
  id: string,
  status: 'Approved' | 'Rejected',
  rejectReason?: string
): Promise<RentRequest> {
  const updated = await apiJson<BackendRentRequest>(`/rent-requests/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, rejectReason }),
  });
  return mapBackendToRentRequest(updated);
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
  const result = await apiJson<WarehousesApiResponse['data']>('/warehouses?status=ACTIVE&limit=100', { method: 'GET' });
  return result.warehouses.map((w) => ({
    id: w.warehouse_id,
    name: w.name,
    address: w.address,
    status: w.status,
  }));
}

// --- Contract packages (manager-defined rental time packages) ---

export type ContractPackageUnit = 'day' | 'month' | 'year';

export interface ContractPackageOption {
  id: string;
  name: string;
  warehouseId: string;
  duration: number;
  unit: ContractPackageUnit;
  pricePerM2: number;
  pricePerDay: number;
  isActive?: boolean;
  description?: string;
}

interface BackendContractPackage {
  _id: string;
  name: string;
  warehouseId: string;
  duration: number;
  unit: ContractPackageUnit;
  pricePerM2: number;
  pricePerDay: number;
  isActive?: boolean;
  description?: string;
}

/**
 * List contract packages defined by manager.
 * Customer uses these as suggested rental durations.
 * Note: apiJson unwraps { data } so we may receive the array directly.
 */
export async function listContractPackages(warehouseId?: string): Promise<ContractPackageOption[]> {
  const query = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : '';
  const res = await apiJson<BackendContractPackage[] | { data: BackendContractPackage[] }>(`/contract-packages${query}`, { method: 'GET' });
  const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
  return list.map((p) => ({
    id: typeof p._id === 'string' ? p._id : String(p._id),
    name: p.name,
    warehouseId: p.warehouseId,
    duration: p.duration,
    unit: p.unit,
    pricePerM2: Number((p as any).pricePerM2 ?? 0),
    pricePerDay: Number((p as any).pricePerDay ?? 0),
    isActive: Boolean((p as any).isActive ?? true),
    description: p.description,
  }));
}

export type ZoneRentalStatus = 'AVAILABLE' | 'RENTED';

export interface ZoneOption {
  id: string;
  zoneCode: string;
  name: string;
  area?: number;
  warehouseId: string;
  description?: string;
  status?: string;
  /** From contracts: zone has an active / pending_payment lease covering today */
  rentalStatus?: ZoneRentalStatus;
  leaseEndDate?: string;
  /** Whole days until lease ends (when rented) */
  daysUntilAvailable?: number;
}

interface ZoneListApiResponse {
  message: string;
  data: ZoneOption[] | { zone_id: string; zone_code: string; name: string; warehouse_id: string; status: string }[];
}

/** List zones in a warehouse (for customer to choose zone when requesting draft). */
export async function listZonesByWarehouse(warehouseId: string): Promise<ZoneOption[]> {
  const data = await apiJson<any>(`/warehouses/${warehouseId}/zones`, { method: 'GET' });
  const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return list.map((z: any) => ({
    // Ensure every zone has a stable id; some backends may not return `id` consistently.
    // If `id` is missing, fall back to other common fields to avoid treating many zones as one.
    id: (() => {
      const idRaw =
        z.zone_id ??
        z.id ??
        z._id ??
        z.zoneId ??
        z.zone_code ??
        z.zoneCode;
      return idRaw != null ? String(idRaw) : '';
    })(),
    zoneCode: z.zone_code ?? z.zoneCode ?? '',
    name: z.name ?? '',
    area: Number(z.area ?? 0),
    warehouseId: z.warehouse_id ?? z.warehouseId ?? warehouseId,
    description: z.description,
    status: z.status ?? z.zone_status ?? z.state,
    rentalStatus: (z.rental_status ?? z.rentalStatus) as ZoneRentalStatus | undefined,
    leaseEndDate: z.lease_end_date ?? z.leaseEndDate,
    daysUntilAvailable:
      z.days_until_available != null ? Number(z.days_until_available) : z.daysUntilAvailable != null ? Number(z.daysUntilAvailable) : undefined,
  }));
}

export interface ShelfOptionForRent {
  id: string;
  code: string;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE';
  zoneId: string;
}

interface BackendShelfForZone {
  shelf_id: string;
  shelf_code: string;
  zone_id: string;
  zone_code?: string;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE';
}

/** List AVAILABLE shelves in a specific zone for customer rent flow. */
export async function listAvailableShelvesByZone(zoneId: string): Promise<ShelfOptionForRent[]> {
  const data = await apiJson<{ data?: BackendShelfForZone[] } | BackendShelfForZone[]>(`/zones/${zoneId}/shelves`, {
    method: 'GET',
  });
  const list = Array.isArray((data as any)?.data) ? (data as any).data : Array.isArray(data) ? (data as any) : [];
  return (list as BackendShelfForZone[]).map((s) => ({
    id: s.shelf_id,
    code: s.shelf_code,
    status: s.status,
    zoneId: s.zone_id,
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
  packageId?: string;
  /** Optional preferred zone chosen by customer */
  zoneId?: string;
  /** Optional multiple zones chosen by customer */
  zoneIds?: string[];
  /** Optional price per zone (e.g. from selected package) */
  pricePerZone?: number;
}

/** Customer requests draft contract (warehouse + period). Zone is auto-assigned when manager approves. */
export async function createDraftContractRequest(payload: CreateDraftContractPayload): Promise<Contract> {
  const res = await apiFetchRaw('/contracts/request-draft', {
    method: 'POST',
    body: JSON.stringify({
      warehouseId: payload.warehouseId,
      startDate: payload.startDate,
      endDate: payload.endDate,
      packageId: payload.packageId,
      requestedZoneId: payload.zoneId,
      zoneIds: payload.zoneIds,
      pricePerZone: payload.pricePerZone,
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

