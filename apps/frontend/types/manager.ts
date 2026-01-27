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

export interface CreateContractPayload {
  rentRequestId: string;
  shelvesRented: number;
  startDate: string;
  endDate: string;
  countingUnit: RentRequest['countingUnit'];
  conversionRule?: RentRequest['conversionRule'];
  customerName: string;
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
