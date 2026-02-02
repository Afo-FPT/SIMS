import type { Contract, RentRequest, ServiceRequest, CustomerInventoryItem, AdjustmentRequest } from '../lib/customer-types';
import type { StaffTask } from './staff';

export type ShelfStatus = 'Available' | 'Occupied';

export interface Shelf {
  id: string;
  code: string;
  zone: string;
  status: ShelfStatus;
  contractId?: string;
  contractCode?: string;
}

export interface CheckingResult {
  taskId: string;
  taskCode: string;
  sku: string;
  productName: string;
  beforeQty: number;
  countedQty: number;
  discrepancyReason?: string;
  fullCheckDone: boolean;
  completedAt: string;
}

export interface RentedShelfPayload {
  shelfId: string;
  area?: number;
  capacity?: number;
  startDate: string;
  endDate: string;
  price: number;
}

/** One zone rented in a contract (manager creates contract by assigning zones). */
export interface RentedZonePayload {
  zoneId: string;
  startDate: string;
  endDate: string;
  price: number;
}

export interface CreateContractPayload {
  customerId: string;
  warehouseId: string;
  rentedZones: RentedZonePayload[];
}

export interface CreateTaskFromServiceRequestPayload {
  serviceRequestId: string;
  contractId: string;
  type: ServiceRequest['type'];
  preferredExecutionTime: string;
  dueDate: string;
  inboundRef?: string;
  outboundRef?: string;
  items: { sku: string; productName?: string; expectedQty?: number; requiredQty?: number; currentQty?: number }[];
  fullCheckRequired?: boolean;
  customerName: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
}

export interface ManagerDashboardStats {
  contractsActive: number;
  shelvesOccupied: number;
  shelvesAvailable: number;
  serviceRequestsPending: number;
  tasksInProgress: number;
  discrepanciesPendingApproval: number;
}

export type WarehouseStatus = 'ACTIVE' | 'INACTIVE';

export interface ManagerWarehouse {
  id: string;
  name: string;
  address: string;
  length: number;
  width: number;
  area: number;
  status: WarehouseStatus;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
