import type { Contract, ServiceRequest, CustomerInventoryItem, AdjustmentRequest } from '../customer-types';
import type { StaffTask, TaskItem } from '../../types/staff';
import type { CreateContractPayload, CreateTaskFromServiceRequestPayload, ManagerDashboardStats, Shelf, ManagerWarehouse } from '../../types/manager';
import {
  MOCK_CONTRACTS,
  MOCK_SERVICE_REQUESTS,
  MOCK_INVENTORY,
  MOCK_ADJUSTMENTS,
} from '../customer-mock';
import { mockStaffTasks } from '../mock/staff.mock';
import { MOCK_SHELVES, MOCK_STAFF_USERS } from '../mock/manager.mock';
import { getAuthState } from '../auth';

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

// --- Zones (within warehouse) ---

export interface ManagerZoneOption {
  id: string;
  zoneCode: string;
  name: string;
  warehouseId: string;
  description?: string;
  status?: string;
}

interface BackendZoneResponse {
  zone_id: string;
  zone_code: string;
  name: string;
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
    warehouseId: z.warehouse_id ?? z.warehouseId ?? warehouseId,
    description: z.description,
    status: z.status,
  }));
}

export async function createZone(
  warehouseId: string,
  payload: { zoneCode: string; name: string; description?: string }
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
    warehouseId: z.warehouse_id,
    description: z.description,
    status: z.status,
  };
}

interface BackendShelfResponse {
  shelf_id: string;
  shelf_code: string;
  tier_count: number;
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
  width: number;
  depth: number;
  maxCapacity: number;
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
  };
}

export async function createShelvesForWarehouse(
  warehouseId: string,
  zoneId: string,
  shelves: {
    shelfCode: string;
    tierCount: number;
    width: number;
    depth: number;
    maxCapacity: number;
  }[],
  zoneDisplay?: string,
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

/**
 * Backend Contract Response interface (snake_case) - matches backend ContractResponse
 */
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
  const rentedZones = (c.rented_zones || []).map((rz) => ({
    zoneId: rz.zone_id,
    zoneCode: rz.zone_code,
    zoneName: rz.zone_name,
    startDate: typeof rz.start_date === 'string' ? rz.start_date : new Date(rz.start_date).toISOString(),
    endDate: typeof rz.end_date === 'string' ? rz.end_date : new Date(rz.end_date).toISOString(),
    price: rz.price,
  }));

  return {
    id: c.contract_id,
    code: c.contract_code,
    customerId: c.customer_id,
    customerName: c.customer_name,
    warehouseId: c.warehouse_id,
    rentedZones,
    requestedZoneId: c.requested_zone_id,
    requestedStartDate: c.requested_start_date ? (typeof c.requested_start_date === 'string' ? c.requested_start_date : new Date(c.requested_start_date).toISOString()) : undefined,
    requestedEndDate: c.requested_end_date ? (typeof c.requested_end_date === 'string' ? c.requested_end_date : new Date(c.requested_end_date).toISOString()) : undefined,
    status: c.status,
    createdBy: c.created_by,
    createdAt: typeof c.created_at === 'string' ? c.created_at : new Date(c.created_at).toISOString(),
    updatedAt: typeof c.updated_at === 'string' ? c.updated_at : new Date(c.updated_at).toISOString(),
  };
}

/**
 * Status display mapping for UI
 */
function getStatusDisplay(status: Contract['status']): string {
  const statusMap: Record<string, string> = {
    draft: 'Draft',
    active: 'Active',
    expired: 'Expired',
    terminated: 'Terminated',
  };
  return statusMap[status] || status;
}

/**
 * Format date for display
 */
function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN');
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function shouldError() {
  return Math.random() < 0.1;
}

export async function createContract(payload: CreateContractPayload): Promise<Contract> {
  const backendPayload = {
    customerId: payload.customerId,
    warehouseId: payload.warehouseId,
    rentedZones: payload.rentedZones.map(rz => ({
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

export async function updateContractStatus(
  id: string,
  status: Contract['status']
): Promise<Contract> {
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

export async function listServiceRequests(): Promise<ServiceRequest[]> {
  await delay(400 + Math.random() * 300);
  if (shouldError()) throw new Error('Failed to fetch service requests');
  return [...MOCK_SERVICE_REQUESTS];
}

export async function approveServiceRequest(id: string): Promise<ServiceRequest> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) throw new Error('Failed to approve service request');
  const i = MOCK_SERVICE_REQUESTS.findIndex((r) => r.id === id);
  if (i === -1) throw new Error('Service request not found');
  MOCK_SERVICE_REQUESTS[i].status = 'Processing';
  return MOCK_SERVICE_REQUESTS[i];
}

export async function rejectServiceRequest(id: string, _reason?: string): Promise<ServiceRequest> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) throw new Error('Failed to reject service request');
  const i = MOCK_SERVICE_REQUESTS.findIndex((r) => r.id === id);
  if (i === -1) throw new Error('Service request not found');
  MOCK_SERVICE_REQUESTS[i].status = 'Rejected';
  return MOCK_SERVICE_REQUESTS[i];
}

function toTaskItems(
  items: { sku: string; productName?: string; expectedQty?: number; requiredQty?: number; currentQty?: number }[],
  type: ServiceRequest['type']
): TaskItem[] {
  return items.map((it) => {
    const t: TaskItem = {
      sku: it.sku,
      productName: it.productName ?? '',
      notes: undefined,
    };
    if (type === 'Inbound') {
      t.expectedQty = it.expectedQty ?? 0;
      t.countedQty = 0;
    } else if (type === 'Outbound') {
      t.requiredQty = it.requiredQty ?? it.expectedQty ?? 0;
      t.pickedQty = 0;
    } else {
      t.currentQty = it.currentQty ?? 0;
      t.countedQty = 0;
    }
    return t;
  });
}

export async function createTaskFromServiceRequest(
  payload: CreateTaskFromServiceRequestPayload
): Promise<StaffTask> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) throw new Error('Failed to create task');
  const taskCode = `TASK-2025-${String(mockStaffTasks.length + 1).padStart(3, '0')}`;
  const items = toTaskItems(payload.items, payload.type);
  // Get contract code asynchronously
  const contract = await getContractById(payload.contractId);
  const task: StaffTask = {
    id: `task-${Date.now()}`,
    taskCode,
    type: payload.type,
    status: 'ASSIGNED',
    priority: 'Medium',
    contractCode: contract?.code ?? payload.contractId,
    customerName: payload.customerName,
    assignedBy: 'Sarah Miller',
    assignedAt: new Date().toISOString(),
    preferredExecutionTime: payload.preferredExecutionTime,
    dueDate: payload.dueDate,
    inboundRef: payload.inboundRef,
    outboundRef: payload.outboundRef,
    items,
    fullCheckRequired: payload.fullCheckRequired,
    serviceRequestId: payload.serviceRequestId,
  };
  mockStaffTasks.push(task);
  const si = MOCK_SERVICE_REQUESTS.findIndex((r) => r.id === payload.serviceRequestId);
  if (si >= 0) MOCK_SERVICE_REQUESTS[si].status = 'Processing';
  return task;
}

export async function listTasks(): Promise<StaffTask[]> {
  await delay(400 + Math.random() * 300);
  if (shouldError()) throw new Error('Failed to fetch tasks');
  return [...mockStaffTasks];
}

export async function assignStaffToTask(taskId: string, staffId: string): Promise<StaffTask> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) throw new Error('Failed to assign staff');
  const ti = mockStaffTasks.findIndex((t) => t.id === taskId);
  if (ti === -1) throw new Error('Task not found');
  const staff = MOCK_STAFF_USERS.find((s) => s.id === staffId);
  if (!staff) throw new Error('Staff not found');
  mockStaffTasks[ti].assignedToStaffId = staffId;
  mockStaffTasks[ti].assignedToStaffName = staff.name;
  return mockStaffTasks[ti];
}

export async function cancelTask(taskId: string): Promise<StaffTask> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) throw new Error('Failed to cancel task');
  const ti = mockStaffTasks.findIndex((t) => t.id === taskId);
  if (ti === -1) throw new Error('Task not found');
  mockStaffTasks[ti].status = 'CANCELLED';
  return mockStaffTasks[ti];
}

export async function listInventory(): Promise<CustomerInventoryItem[]> {
  await delay(400 + Math.random() * 300);
  if (shouldError()) throw new Error('Failed to fetch inventory');
  return [...MOCK_INVENTORY];
}

export async function listPendingAdjustments(): Promise<AdjustmentRequest[]> {
  await delay(300 + Math.random() * 200);
  if (shouldError()) throw new Error('Failed to fetch adjustments');
  return MOCK_ADJUSTMENTS.filter((a) => a.status === 'Pending');
}

export async function approveInventoryAdjustment(id: string): Promise<AdjustmentRequest> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) throw new Error('Failed to approve adjustment');
  const adj = MOCK_ADJUSTMENTS.find((a) => a.id === id);
  if (!adj) throw new Error('Adjustment not found');
  if (adj.fullCheckRequired && adj.fullCheckTaskId) {
    const t = mockStaffTasks.find((x) => x.id === adj.fullCheckTaskId);
    if (!t || t.status !== 'COMPLETED') {
      throw new Error('Full inventory check must be completed before approving this adjustment');
    }
  }
  adj.status = 'Approved';
  const inv = MOCK_INVENTORY.find((i) => i.sku === adj.sku);
  if (inv) inv.quantity = adj.requestedQty;
  return adj;
}

export async function rejectInventoryAdjustment(id: string): Promise<AdjustmentRequest> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) throw new Error('Failed to reject adjustment');
  const adj = MOCK_ADJUSTMENTS.find((a) => a.id === id);
  if (!adj) throw new Error('Adjustment not found');
  adj.status = 'Rejected';
  return adj;
}

export async function listShelvesByWarehouse(warehouseId: string): Promise<Shelf[]> {
  // TODO: Replace with real backend shelves listing API when available
  // Currently still using mock shelves data (no warehouse association in mock)
  await delay(400 + Math.random() * 300);
  if (shouldError()) throw new Error('Failed to fetch shelves');
  return [...MOCK_SHELVES];
}

export async function assignShelf(contractId: string, shelfId: string): Promise<Shelf> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) throw new Error('Failed to assign shelf');
  const c = await getContractById(contractId);
  if (!c) throw new Error('Contract not found');
  const si = MOCK_SHELVES.findIndex((s) => s.id === shelfId);
  if (si === -1) throw new Error('Shelf not found');
  if (MOCK_SHELVES[si].status === 'Occupied') throw new Error('Shelf is already occupied');
  MOCK_SHELVES[si].status = 'Occupied';
  MOCK_SHELVES[si].contractId = contractId;
  MOCK_SHELVES[si].contractCode = c.code;
  return MOCK_SHELVES[si];
}

export async function releaseShelf(shelfId: string): Promise<Shelf> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) throw new Error('Failed to release shelf');
  const si = MOCK_SHELVES.findIndex((s) => s.id === shelfId);
  if (si === -1) throw new Error('Shelf not found');
  MOCK_SHELVES[si].status = 'Available';
  MOCK_SHELVES[si].contractId = undefined;
  MOCK_SHELVES[si].contractCode = undefined;
  return MOCK_SHELVES[si];
}

export async function getManagerDashboardStats(): Promise<ManagerDashboardStats> {
  await delay(400 + Math.random() * 300);
  if (shouldError()) throw new Error('Failed to fetch dashboard stats');
  const contractsActive = MOCK_CONTRACTS.filter((c) => c.status === 'active').length;
  const occupied = MOCK_SHELVES.filter((s) => s.status === 'Occupied').length;
  const available = MOCK_SHELVES.filter((s) => s.status === 'Available').length;
  const servicePending = MOCK_SERVICE_REQUESTS.filter((r) => r.status === 'Pending').length;
  const tasksInProgress = mockStaffTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const discrepanciesPending = MOCK_ADJUSTMENTS.filter((a) => a.status === 'Pending').length;
  return {
    contractsActive,
    shelvesOccupied: occupied,
    shelvesAvailable: available,
    serviceRequestsPending: servicePending,
    tasksInProgress,
    discrepanciesPendingApproval: discrepanciesPending,
  };
}

export function getStaffUsers() {
  return MOCK_STAFF_USERS;
}
