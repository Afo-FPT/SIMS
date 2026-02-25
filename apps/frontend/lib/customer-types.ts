
export type RentRequestStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
export type ContractStatus = 'draft' | 'pending_payment' | 'active' | 'expired' | 'terminated';
export type CountingUnit = 'piece' | 'box' | 'carton' | 'pallet';
export type StorageZone = 'Zone A' | 'Zone B' | 'Zone C' | 'No preference';
export type GoodsCategory = 'electronics' | 'cosmetics' | 'food' | 'documents' | 'apparel' | 'other';
export type ServiceRequestType = 'Inbound' | 'Outbound' | 'Inventory Checking';
export type PickupDelivery = 'Pickup' | 'Delivery';
export type AdjustmentReason = 'Count correction' | 'Damage' | 'Lost' | 'Other';

export interface ConversionRule {
  boxToPiece?: number;
  cartonToBox?: number;
  palletToCarton?: number;
}

export interface RentRequest {
  id: string;
  shelves: number;
  startDate: string;
  durationMonths: number;
  zonePreference?: StorageZone;
  goodsCategory: GoodsCategory[];
  handlingNotes: ('fragile' | 'keep dry' | 'do not stack')[];
  specialNotes?: string;
  countingUnit: CountingUnit;
  conversionRule?: ConversionRule;
  status: RentRequestStatus;
  customerName?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Contract {
  id: string;
  code: string;
  customerId: string;
  customerName?: string;
  warehouseId: string;
  /** Contract rents Zone(s); each zone contains shelves for location tracking */
  rentedZones: RentedZone[];
  /** Draft from customer: single zone request; assigned when manager activates */
  requestedZoneId?: string;
  requestedStartDate?: string;
  requestedEndDate?: string;
  status: ContractStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentedZone {
  zoneId: string;
  zoneCode?: string;
  zoneName?: string;
  startDate: string;
  endDate: string;
  price: number;
}

/** @deprecated Use RentedZone; kept for backward compatibility */
export interface RentedShelf {
  shelfId: string;
  shelfCode?: string;
  area?: number;
  capacity?: number;
  startDate: string;
  endDate: string;
  price: number;
}

export interface ServiceRequestItem {
  sku: string;
  name?: string;
  quantity: number;
  note?: string;
}

export interface ServiceRequest {
  id: string;
  contractId: string;
  type: ServiceRequestType;
  preferredDate: string;
  preferredTime?: string;
  notes?: string;
  inboundRef?: string;
  items?: ServiceRequestItem[];
  expectedArrival?: string;
  outboundRef?: string;
  pickupDelivery?: PickupDelivery;
  destination?: string;
  scope?: 'Full inventory' | 'By SKU list';
  skuList?: string[];
  status: 'Pending' | 'Processing' | 'Completed' | 'Rejected';
  customerName?: string;
  createdAt: string;
}

export interface CustomerInventoryItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unit: CountingUnit;
  shelf: string;
  lastUpdated: string;
  history?: { date: string; action: string; qty: number; note?: string }[];
}

export interface AdjustmentRequest {
  id: string;
  contractId: string;
  sku: string;
  currentQty: number;
  requestedQty: number;
  reason: AdjustmentReason;
  evidenceUrl?: string;
  fullCheckRequired: boolean;
  preferredDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  fullCheckTaskId?: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  date: string;
  type: 'contract' | 'rent_request' | 'service' | 'inventory' | 'adjustment';
  title: string;
  detail?: string;
}
