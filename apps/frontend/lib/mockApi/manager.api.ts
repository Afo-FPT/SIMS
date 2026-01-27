import type { RentRequest, Contract, ServiceRequest, CustomerInventoryItem, AdjustmentRequest } from '../customer-types';
import type { StaffTask, TaskItem } from '../../types/staff';
import type { CreateContractPayload, CreateTaskFromServiceRequestPayload, ManagerDashboardStats, Shelf } from '../../types/manager';
import {
  MOCK_RENT_REQUESTS,
  MOCK_CONTRACTS,
  MOCK_SERVICE_REQUESTS,
  MOCK_INVENTORY,
  MOCK_ADJUSTMENTS,
  getContractById,
} from '../customer-mock';
import { mockStaffTasks } from '../mock/staff.mock';
import { MOCK_SHELVES, MOCK_STAFF_USERS } from '../mock/manager.mock';

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function shouldError() {
  return Math.random() < 0.1;
}

export async function listRentRequests(): Promise<RentRequest[]> {
  await delay(400 + Math.random() * 300);
  if (shouldError()) throw new Error('Failed to fetch rent requests');
  return MOCK_RENT_REQUESTS.filter((r) => r.status !== 'Draft');
}

export async function approveRentRequest(id: string): Promise<RentRequest> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) throw new Error('Failed to approve rent request');
  const i = MOCK_RENT_REQUESTS.findIndex((r) => r.id === id);
  if (i === -1) throw new Error('Rent request not found');
  MOCK_RENT_REQUESTS[i].status = 'Approved';
  MOCK_RENT_REQUESTS[i].updatedAt = new Date().toISOString();
  return MOCK_RENT_REQUESTS[i];
}

export async function rejectRentRequest(id: string, reason: string): Promise<RentRequest> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) throw new Error('Failed to reject rent request');
  const i = MOCK_RENT_REQUESTS.findIndex((r) => r.id === id);
  if (i === -1) throw new Error('Rent request not found');
  MOCK_RENT_REQUESTS[i].status = 'Rejected';
  MOCK_RENT_REQUESTS[i].rejectReason = reason;
  MOCK_RENT_REQUESTS[i].updatedAt = new Date().toISOString();
  return MOCK_RENT_REQUESTS[i];
}

export async function createContract(payload: CreateContractPayload): Promise<Contract> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) throw new Error('Failed to create contract');
  const code = `SWS-CON-2025-${String(MOCK_CONTRACTS.length + 1).padStart(3, '0')}`;
  const c: Contract = {
    id: `C-${Date.now()}`,
    code,
    rentRequestId: payload.rentRequestId,
    shelvesRented: payload.shelvesRented,
    startDate: payload.startDate,
    endDate: payload.endDate,
    status: 'Pending confirmation',
    countingUnit: payload.countingUnit,
    conversionRule: payload.conversionRule,
    customerName: payload.customerName,
  };
  MOCK_CONTRACTS.push(c);
  const ri = MOCK_RENT_REQUESTS.findIndex((r) => r.id === payload.rentRequestId);
  if (ri >= 0) {
    MOCK_RENT_REQUESTS[ri].status = 'Approved';
    MOCK_RENT_REQUESTS[ri].updatedAt = new Date().toISOString();
  }
  return c;
}

export async function listContracts(): Promise<Contract[]> {
  await delay(400 + Math.random() * 300);
  if (shouldError()) throw new Error('Failed to fetch contracts');
  return [...MOCK_CONTRACTS];
}

export async function updateContractStatus(
  id: string,
  status: Contract['status']
): Promise<Contract> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) throw new Error('Failed to update contract status');
  const i = MOCK_CONTRACTS.findIndex((c) => c.id === id);
  if (i === -1) throw new Error('Contract not found');
  MOCK_CONTRACTS[i].status = status;
  if (status === 'Active') MOCK_CONTRACTS[i].confirmedAt = new Date().toISOString();
  return MOCK_CONTRACTS[i];
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
  const task: StaffTask = {
    id: `task-${Date.now()}`,
    taskCode,
    type: payload.type,
    status: 'ASSIGNED',
    priority: 'Medium',
    contractCode: getContractById(payload.contractId)?.code ?? payload.contractId,
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

export async function listShelves(): Promise<Shelf[]> {
  await delay(400 + Math.random() * 300);
  if (shouldError()) throw new Error('Failed to fetch shelves');
  return [...MOCK_SHELVES];
}

export async function assignShelf(contractId: string, shelfId: string): Promise<Shelf> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) throw new Error('Failed to assign shelf');
  const c = getContractById(contractId);
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
  const contractsActive = MOCK_CONTRACTS.filter((c) => c.status === 'Active').length;
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
