import type { Contract } from './customer-types';
import type { CreateContractPayload, Shelf, ManagerWarehouse } from '../types/manager';
import { apiFetchRaw, apiJson } from './api-client';

export type { ManagerWarehouse } from '../types/manager';

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  return apiFetchRaw(path, options);
}

interface BackendWarehouseResponse {
  warehouse_id: string;
  name: string;
  address: string;
  length: number;
  width: number;
  area: number;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface PaginatedWarehousesResponse {
  warehouses: BackendWarehouseResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SearchWarehousesResult {
  message: string;
  data: PaginatedWarehousesResponse;
}

function mapBackendWarehouseToManagerWarehouse(w: BackendWarehouseResponse): ManagerWarehouse {
  return {
    id: w.warehouse_id,
    name: w.name,
    address: w.address,
    length: w.length,
    width: w.width,
    area: w.area,
    description: w.description,
    status: w.status,
    createdBy: w.created_by,
    createdAt: typeof w.created_at === 'string' ? w.created_at : new Date(w.created_at).toISOString(),
    updatedAt: typeof w.updated_at === 'string' ? w.updated_at : new Date(w.updated_at).toISOString(),
  };
}

export async function listWarehouses(): Promise<ManagerWarehouse[]> {
  const res = await fetchWithAuth('/warehouses', {
    method: 'GET',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load warehouses');
  }

  const result = data as SearchWarehousesResult;
  return result.data.warehouses.map(mapBackendWarehouseToManagerWarehouse);
}

export async function createWarehouse(payload: {
  name: string;
  address: string;
  length: number;
  width: number;
  description?: string;
}): Promise<ManagerWarehouse> {
  const res = await fetchWithAuth('/warehouses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create warehouse');
  }

  const backendWarehouse = data.data as BackendWarehouseResponse;
  return mapBackendWarehouseToManagerWarehouse(backendWarehouse);
}

export async function updateWarehouse(
  warehouseId: string,
  payload: Partial<{
    name: string;
    address: string;
    length: number;
    width: number;
    description?: string;
  }>
): Promise<ManagerWarehouse> {
  const res = await apiJson<{ message?: string; data?: BackendWarehouseResponse } | BackendWarehouseResponse>(
    `/warehouses/${warehouseId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
  const backend = (res as any).warehouse_id ? (res as any) : (res as any).data;
  if (!backend) {
    throw new Error('Invalid response while updating warehouse');
  }
  return mapBackendWarehouseToManagerWarehouse(backend as BackendWarehouseResponse);
}

export async function updateWarehouseStatus(warehouseId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<ManagerWarehouse> {
  const res = await apiJson<{ message?: string; data?: BackendWarehouseResponse } | BackendWarehouseResponse>(
    `/warehouses/${warehouseId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
  const backend = (res as any).warehouse_id ? (res as any) : (res as any).data;
  if (!backend) {
    throw new Error('Invalid response while updating warehouse status');
  }
  return mapBackendWarehouseToManagerWarehouse(backend as BackendWarehouseResponse);
}

// --- Zones (within warehouse) ---

export interface ManagerZoneOption {
  id: string;
  zoneCode: string;
  name: string;
  area: number;
  warehouseId: string;
  description?: string;
  status?: string;
}

interface BackendZoneResponse {
  zone_id: string;
  zone_code: string;
  name: string;
  area: number;
  warehouse_id: string;
  description?: string;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export async function listZonesByWarehouse(warehouseId: string): Promise<ManagerZoneOption[]> {
  const res = await fetchWithAuth(`/warehouses/${warehouseId}/zones`, { method: 'GET' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load zones');
  }
  const list = Array.isArray(data.data) ? data.data : [];
  return list.map((z: BackendZoneResponse | any) => ({
    id: z.zone_id ?? z.id,
    zoneCode: z.zone_code ?? z.zoneCode ?? '',
    name: z.name ?? '',
    area: Number(z.area ?? 0),
    warehouseId: z.warehouse_id ?? z.warehouseId ?? warehouseId,
    description: z.description,
    status: z.status,
  }));
}

export async function createZone(
  warehouseId: string,
  payload: { zoneCode: string; name: string; area: number; description?: string }
): Promise<ManagerZoneOption> {
  const res = await fetchWithAuth(`/warehouses/${warehouseId}/zones`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create zone');
  }
  const z = data.data as BackendZoneResponse;
  return {
    id: z.zone_id,
    zoneCode: z.zone_code,
    name: z.name,
    area: Number(z.area ?? 0),
    warehouseId: z.warehouse_id,
    description: z.description,
    status: z.status,
  };
}

export async function updateZoneByWarehouse(
  warehouseId: string,
  zoneId: string,
  payload: { zoneCode?: string; name?: string; area?: number; description?: string; status?: 'ACTIVE' | 'INACTIVE' }
): Promise<ManagerZoneOption> {
  const res = await apiJson<{ message?: string; data?: BackendZoneResponse } | BackendZoneResponse>(
    `/warehouses/${warehouseId}/zones/${zoneId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
  const z = (res as any).zone_id ? (res as any) : (res as any).data;
  if (!z) {
    throw new Error('Invalid response while updating zone');
  }
  return {
    id: z.zone_id,
    zoneCode: z.zone_code,
    name: z.name,
    area: Number(z.area ?? 0),
    warehouseId: z.warehouse_id,
    description: z.description,
    status: z.status,
  };
}

interface BackendShelfResponse {
  shelf_id: string;
  shelf_code: string;
  tier_count: number;
  tier_dimensions?: Array<{ height: number; width: number; depth: number }>;
  width: number;
  depth: number;
  max_capacity: number;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE';
  zone_id?: string;
  created_at: string;
  updated_at: string;
}

interface CreateShelvesPayloadItem {
  shelfCode: string;
  tierCount: number;
  tierDimensions: Array<{ height: number; width: number; depth: number }>;
}

interface CreateShelvesPayload {
  zoneId: string;
  shelves: CreateShelvesPayloadItem[];
}

interface CreateShelvesResponse {
  message: string;
  data: BackendShelfResponse[];
}

function mapBackendShelfToShelf(s: BackendShelfResponse, zoneDisplay?: string): Shelf {
  return {
    id: s.shelf_id,
    code: s.shelf_code,
    zone: zoneDisplay ?? (s as any).zone_code ?? '',
    status: s.status === 'RENTED' ? 'Occupied' : 'Available',
    contractId: undefined,
    contractCode: undefined,
    tierCount: s.tier_count,
    tierDimensions: s.tier_dimensions ?? [],
    width: s.width,
    depth: s.depth,
    maxCapacity: s.max_capacity,
  };
}

export async function createShelvesForWarehouse(
  warehouseId: string,
  zoneId: string,
  shelves: {
    shelfCode: string;
    tierCount: number;
    tierDimensions: Array<{ height: number; width: number; depth: number }>;
  }[],
  zoneDisplay?: string
): Promise<Shelf[]> {
  const payload: CreateShelvesPayload = { zoneId, shelves };

  const res = await fetchWithAuth(`/warehouses/${warehouseId}/shelves`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create shelves');
  }

  const response = data as CreateShelvesResponse;
  return response.data.map((s) => mapBackendShelfToShelf(s, zoneDisplay));
}

export async function updateShelfStatus(shelfId: string, status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE'): Promise<Shelf> {
  const res = await apiJson<{ message?: string; data?: BackendShelfResponse } | BackendShelfResponse>(`/shelves/${shelfId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  const backend = (res as any).shelf_id ? (res as any) : (res as any).data;
  if (!backend) {
    throw new Error('Invalid response while updating shelf status');
  }
  return mapBackendShelfToShelf(backend as BackendShelfResponse);
}

export async function updateShelfInfo(
  shelfId: string,
  payload: {
    shelfCode: string;
    tierCount: number;
    tierDimensions: Array<{ height: number; width: number; depth: number }>;
    status?: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE';
  }
): Promise<Shelf> {
  const body: any = {
    shelfCode: payload.shelfCode,
    tierCount: payload.tierCount,
    tierDimensions: payload.tierDimensions,
  };
  if (payload.status) body.status = payload.status;

  const res = await apiJson<{ message?: string; data?: BackendShelfResponse } | BackendShelfResponse>(`/shelves/${shelfId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  const backend = (res as any).shelf_id ? (res as any) : (res as any).data;
  if (!backend) {
    throw new Error('Invalid response while updating shelf info');
  }

  return mapBackendShelfToShelf(backend as BackendShelfResponse);
}

// --- Contracts ---

interface BackendContractResponse {
  contract_id: string;
  contract_code: string;
  customer_id: string;
  customer_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  warehouse_address?: string;
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
  status: 'draft' | 'pending_payment' | 'active' | 'expired' | 'terminated';
  created_by: string;
  created_at: string;
  updated_at: string;
}

function mapBackendContractToContract(c: BackendContractResponse): Contract {
  const rentedZones = (c.rented_zones || []).map((rz) => ({
    zoneId: (rz as any).zone_id ?? (rz as any).zoneId,
    zoneCode: (rz as any).zone_code ?? (rz as any).zoneCode,
    zoneName: (rz as any).zone_name ?? (rz as any).zoneName,
    startDate: typeof rz.start_date === 'string' ? rz.start_date : new Date(rz.start_date).toISOString(),
    endDate: typeof rz.end_date === 'string' ? rz.end_date : new Date(rz.end_date).toISOString(),
    price: rz.price,
  }));

  const anyContract = c as any;

  return {
    id: c.contract_id,
    code: c.contract_code,
    customerId: c.customer_id,
    customerName: c.customer_name,
    warehouseId: anyContract.warehouse_id ?? anyContract.warehouseId,
    warehouseName: anyContract.warehouse_name ?? anyContract.warehouseName,
    warehouseAddress: anyContract.warehouse_address ?? anyContract.warehouseAddress,
    rentedZones,
    requestedZoneId: anyContract.requested_zone_id ?? anyContract.requestedZoneId,
    requestedStartDate: anyContract.requested_start_date
      ? typeof anyContract.requested_start_date === 'string'
        ? anyContract.requested_start_date
        : new Date(anyContract.requested_start_date).toISOString()
      : undefined,
    requestedEndDate: anyContract.requested_end_date
      ? typeof anyContract.requested_end_date === 'string'
        ? anyContract.requested_end_date
        : new Date(anyContract.requested_end_date).toISOString()
      : undefined,
    status: c.status,
    createdBy: c.created_by,
    createdAt: typeof c.created_at === 'string' ? c.created_at : new Date(c.created_at).toISOString(),
    updatedAt: typeof c.updated_at === 'string' ? c.updated_at : new Date(c.updated_at).toISOString(),
  };
}

export async function createContract(payload: CreateContractPayload): Promise<Contract> {
  const backendPayload = {
    customerId: payload.customerId,
    warehouseId: payload.warehouseId,
    rentedZones: payload.rentedZones.map((rz) => ({
      zoneId: rz.zoneId,
      startDate: rz.startDate,
      endDate: rz.endDate,
      price: rz.price,
    })),
  };

  const res = await fetchWithAuth('/contracts', {
    method: 'POST',
    body: JSON.stringify(backendPayload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create contract');
  }

  const contract = data.data || data;
  return mapBackendContractToContract(contract);
}

export async function listContracts(): Promise<Contract[]> {
  const res = await fetchWithAuth('/contracts', {
    method: 'GET',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch contracts');
  }

  const contracts = data.data || data;
  if (Array.isArray(contracts)) {
    return contracts.map(mapBackendContractToContract);
  }
  return [];
}

export async function getContractById(contractId: string): Promise<Contract | null> {
  const res = await fetchWithAuth(`/contracts/${contractId}`, {
    method: 'GET',
  });

  if (!res.ok) {
    if (res.status === 404) {
      return null;
    }
    const data = await res.json();
    throw new Error(data.message || 'Failed to fetch contract');
  }

  const data = await res.json();
  const contract = data.data || data;
  return mapBackendContractToContract(contract);
}

export async function updateContractStatus(id: string, status: Contract['status']): Promise<Contract> {
  const res = await fetchWithAuth(`/contracts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update contract status');
  }

  const contract = data.data || data;
  return mapBackendContractToContract(contract);
}

export async function listShelvesByWarehouse(warehouseId: string): Promise<Shelf[]> {
  const res = await fetchWithAuth(`/warehouses/${warehouseId}/shelves`, { method: 'GET' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch shelves');
  }
  const list = Array.isArray(data.data) ? data.data : [];
  return list.map((s: any) => ({
    id: s.shelf_id ?? s.id,
    code: s.shelf_code ?? s.code ?? '',
    zone: s.zone_code ?? s.zone ?? '',
    status: s.contract_code ? 'Occupied' : s.status === 'RENTED' ? 'Occupied' : 'Available',
    contractId: s.contract_id ?? undefined,
    contractCode: s.contract_code ?? undefined,
    tierCount: s.tier_count ?? s.tierCount ?? undefined,
    tierDimensions: s.tier_dimensions ?? s.tierDimensions ?? [],
    width: s.width ?? undefined,
    depth: s.depth ?? undefined,
    maxCapacity: s.max_capacity ?? s.maxCapacity ?? undefined,
  })) as Shelf[];
}

