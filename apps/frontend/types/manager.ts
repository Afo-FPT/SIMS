import type { Contract, RentRequest, ServiceRequest, CustomerInventoryItem, AdjustmentRequest } from '../lib/customer-types';

export type ShelfStatus = 'Available' | 'Occupied';

export interface Shelf {
  id: string;
  code: string;
  zone: string;
  status: ShelfStatus;
  contractId?: string;
  contractCode?: string;
  tierCount?: number;
  tierDimensions?: Array<{ height: number; width: number; depth: number }>;
  width?: number;
  depth?: number;
  maxCapacity?: number;
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

/** Manager reports / operations analytics (from backend /api/reports) */
export interface ManagerReportStats {
  inbound: number;
  outbound: number;
  completion: number;
  discrepancies: number;
  totalRevenue: number;
  contractRevenue: number;
  serviceRevenue: number;
  paidTransactions: number;
}

export interface ManagerReportCapacitySlice {
  name: string;
  value: number;
}

export interface ManagerReportStockByCategory {
  name: string;
  qty: number;
}

/** Một điểm xu hướng Inbound/Outbound theo ngày hoặc tuần */
export interface ManagerReportTrendPoint {
  date: string;
  inbound: number;
  outbound: number;
}

/** Anomaly (unusually high/low volume vs trend) */
export interface ManagerReportAnomaly {
  date: string;
  type: 'inbound' | 'outbound';
  value: number;
  message: string;
  severity: 'high' | 'low';
}

/** Contract expiring soon (for list and Gantt) */
export interface ManagerReportExpiringContractItem {
  contractId: string;
  contractCode: string;
  customerName: string;
  startDate: string;
  endDate: string;
  status: string;
  expiresInDays: number;
}

/** Expiring contracts & capacity risk */
export interface ManagerReportExpiringAndCapacityKpis {
  expiringIn30: number;
  expiringIn60: number;
  expiringIn90: number;
  capacityUtilizationPercent: number;
}

export interface ManagerReportExpiringAndCapacity {
  kpis: ManagerReportExpiringAndCapacityKpis;
  expiringIn30: ManagerReportExpiringContractItem[];
  expiringIn60: ManagerReportExpiringContractItem[];
  expiringIn90: ManagerReportExpiringContractItem[];
  ganttContracts: ManagerReportExpiringContractItem[];
}

export interface ManagerReportResponse {
  stats: ManagerReportStats;
  capacityData: ManagerReportCapacitySlice[];
  inventoryData: ManagerReportStockByCategory[];
  trendData: ManagerReportTrendPoint[];
  anomalies: ManagerReportAnomaly[];
  expiringAndCapacity: ManagerReportExpiringAndCapacity;
}

/** Approval rate by manager (Inbound + Outbound) */
export interface ApprovalByManagerItem {
  managerId: string;
  managerName: string;
  inboundApproved: number;
  inboundRejected: number;
  outboundApproved: number;
  outboundRejected: number;
  totalApproved: number;
  totalRejected: number;
  totalDecisions: number;
  approvalRatePercent: number;
}

/** Top outbound product by quantity and frequency */
export interface TopOutboundProductItem {
  rank: number;
  itemName: string;
  totalQuantity: number;
  outboundCount: number;
  unit: string;
}

/** Processing time trend point (by week/month) */
export interface ProcessingTimeTrendPoint {
  period: string;
  inboundAvgHours: number;
  outboundAvgHours: number;
  inboundCount: number;
  outboundCount: number;
}

/** Box plot stats: min, Q1, median, Q3, max (hours) */
export interface ProcessingTimeBoxPlotItem {
  type: 'IN' | 'OUT';
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  count: number;
  avgHours: number;
}

/** Manager deep reports (stacked expiry, zone pricing combo, penalty top customers) */
export type ManagerDeepGranularity = 'daily' | 'monthly' | 'yearly';

export interface ExpiryContractAlertRow {
  contractId: string;
  contractCode: string;
  customerName: string;
  aggregateEndDate: string;
  tier: 'expired' | 'expiringSoon';
  contractStatus: string;
}

export interface ExpiryZoneLeaseAlertRow {
  contractId: string;
  contractCode: string;
  customerName: string;
  zoneId: string;
  zoneCode: string;
  leaseEndDate: string;
  tier: 'expired' | 'expiringSoon';
  shelfCodes: string[];
  contractStatus: string;
}

export interface ExpiryStackedBucket {
  label: string;
  contracts: { expired: number; expiringSoon: number; active: number };
  zoneLeases: { expired: number; expiringSoon: number; active: number };
  details?: {
    contractAlerts: ExpiryContractAlertRow[];
    zoneLeaseAlerts: ExpiryZoneLeaseAlertRow[];
  };
}

export interface ExpiryStackedReport {
  granularity: ManagerDeepGranularity;
  buckets: ExpiryStackedBucket[];
}

export interface ZonePricingComboRow {
  zoneCode: string;
  zoneId: string;
  warehouseId: string;
  warehouseName: string;
  occupancyPercent: number;
  avgMonthlyRentInRange: number;
  suggestedMonthlyPrice: number;
  shelfTotal: number;
  shelfRented: number;
}

export interface PenaltyTopCustomerRow {
  customerId: string;
  customerName: string;
  totalDamageUnits: number;
  affectedRequestCount: number;
  topDamagedItems: Array<{ itemName: string; damageUnits: number }>;
}

export interface RevenueTrendPoint {
  period: string;
  contractRevenue: number;
  serviceRevenue: number;
  totalRevenue: number;
  paidTransactions: number;
}

export interface ManagerRevenueReportResponse {
  summary: {
    totalRevenue: number;
    contractRevenue: number;
    serviceRevenue: number;
    paidTransactions: number;
  };
  trend: RevenueTrendPoint[];
  granularity: 'week' | 'month';
}