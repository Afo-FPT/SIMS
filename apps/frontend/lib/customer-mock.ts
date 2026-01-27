
import type {
  RentRequest,
  Contract,
  ServiceRequest,
  CustomerInventoryItem,
  ActivityItem,
  AdjustmentRequest,
} from './customer-types';

export const MOCK_RENT_REQUESTS: RentRequest[] = [
  {
    id: 'RR-001',
    shelves: 12,
    startDate: '2025-02-01',
    durationMonths: 6,
    zonePreference: 'Zone A',
    goodsCategory: ['electronics'],
    handlingNotes: ['fragile', 'keep dry'],
    countingUnit: 'box',
    conversionRule: { boxToPiece: 24 },
    status: 'Approved',
    customerName: 'Alex Sterling',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-20T14:00:00Z',
  },
  {
    id: 'RR-002',
    shelves: 6,
    startDate: '2025-03-01',
    durationMonths: 3,
    goodsCategory: ['cosmetics'],
    handlingNotes: [],
    specialNotes: 'Climate-controlled preferred',
    countingUnit: 'piece',
    status: 'Submitted',
    customerName: 'Jane Smith',
    createdAt: '2025-01-25T09:00:00Z',
  },
  {
    id: 'RR-003',
    shelves: 4,
    startDate: '2025-04-01',
    durationMonths: 12,
    zonePreference: 'No preference',
    goodsCategory: ['documents'],
    handlingNotes: ['do not stack'],
    countingUnit: 'carton',
    conversionRule: { cartonToBox: 12, boxToPiece: 50 },
    status: 'Draft',
    customerName: 'Bob Wilson',
    createdAt: '2025-01-28T11:00:00Z',
  },
];

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'C-001',
    code: 'SWS-CON-2025-001',
    rentRequestId: 'RR-001',
    shelvesRented: 12,
    startDate: '2025-02-01',
    endDate: '2025-08-01',
    status: 'Active',
    countingUnit: 'box',
    conversionRule: { boxToPiece: 24 },
    customerName: 'Alex Sterling',
    confirmedAt: '2025-01-22T10:00:00Z',
  },
  {
    id: 'C-002',
    code: 'SWS-CON-2025-002',
    rentRequestId: 'RR-002',
    shelvesRented: 6,
    startDate: '2025-03-01',
    endDate: '2025-06-01',
    status: 'Pending confirmation',
    countingUnit: 'piece',
    customerName: 'Jane Smith',
  },
];

export const MOCK_SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: 'SR-001',
    contractId: 'C-001',
    type: 'Inbound',
    preferredDate: '2025-02-05',
    preferredTime: '09:00',
    inboundRef: 'IN-2025-0025',
    items: [
      { sku: 'ELEC-001', name: 'Widget A', quantity: 100, note: 'Batch #1' },
      { sku: 'ELEC-002', name: 'Widget B', quantity: 50 },
    ],
    expectedArrival: '2025-02-05T09:00:00',
    status: 'Processing',
    customerName: 'Alex Sterling',
    createdAt: '2025-01-28T08:00:00Z',
  },
  {
    id: 'SR-002',
    contractId: 'C-001',
    type: 'Outbound',
    preferredDate: '2025-02-10',
    outboundRef: 'OUT-2025-0012',
    items: [{ sku: 'ELEC-001', quantity: 20 }],
    pickupDelivery: 'Pickup',
    status: 'Pending',
    customerName: 'Alex Sterling',
    createdAt: '2025-01-29T14:00:00Z',
  },
  {
    id: 'SR-003',
    contractId: 'C-001',
    type: 'Inventory Checking',
    preferredDate: '2025-02-15',
    scope: 'Full inventory',
    status: 'Pending',
    customerName: 'Alex Sterling',
    createdAt: '2025-01-29T16:00:00Z',
  },
];

export const MOCK_INVENTORY: CustomerInventoryItem[] = [
  {
    id: 'inv-1',
    sku: 'ELEC-001',
    name: 'Widget A',
    quantity: 80,
    unit: 'box',
    shelf: 'A-12-03',
    lastUpdated: '2025-01-28T16:00:00Z',
    history: [
      { date: '2025-01-28', action: 'Inbound', qty: 100, note: 'IN-2025-0025' },
      { date: '2025-01-25', action: 'Adjustment', qty: 0, note: 'Count correction' },
    ],
  },
  {
    id: 'inv-2',
    sku: 'ELEC-002',
    name: 'Widget B',
    quantity: 50,
    unit: 'box',
    shelf: 'A-12-04',
    lastUpdated: '2025-01-28T16:00:00Z',
    history: [{ date: '2025-01-28', action: 'Inbound', qty: 50, note: 'IN-2025-0025' }],
  },
  {
    id: 'inv-3',
    sku: 'COSM-001',
    name: 'Sample Cosmetics',
    quantity: 200,
    unit: 'piece',
    shelf: 'B-05-01',
    lastUpdated: '2025-01-27T10:00:00Z',
  },
];

export const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: 'a1', date: '2025-01-29T14:00', type: 'service', title: 'Outbound request created', detail: 'OUT-2025-0012' },
  { id: 'a2', date: '2025-01-28T16:00', type: 'inventory', title: 'Inbound processed', detail: 'IN-2025-0025 • 150 units' },
  { id: 'a3', date: '2025-01-28T08:00', type: 'service', title: 'Inbound request submitted', detail: 'IN-2025-0025' },
  { id: 'a4', date: '2025-01-25T09:00', type: 'rent_request', title: 'Rent request submitted', detail: 'RR-002 • 6 shelves' },
  { id: 'a5', date: '2025-01-22T10:00', type: 'contract', title: 'Contract confirmed', detail: 'SWS-CON-2025-001' },
];

export const MOCK_ADJUSTMENTS: AdjustmentRequest[] = [
  {
    id: 'ADJ-001',
    contractId: 'C-001',
    sku: 'ELEC-001',
    currentQty: 80,
    requestedQty: 78,
    reason: 'Count correction',
    fullCheckRequired: true,
    preferredDate: '2025-02-01',
    status: 'Pending',
    fullCheckTaskId: 'task-3',
    createdAt: '2025-01-29T11:00:00Z',
  },
];

export function getActiveContract(contracts: Contract[]): Contract | undefined {
  return contracts.find((c) => c.status === 'Active');
}

export function getContractById(id: string): Contract | undefined {
  return MOCK_CONTRACTS.find((c) => c.id === id);
}

const CONFIRMED_KEY = 'sws_confirmed_contract_ids';

export function getConfirmedContractIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const v = localStorage.getItem(CONFIRMED_KEY);
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

/** Active = status Active OR (Pending confirmation + user confirmed) */
export function getActiveContractsForCustomer(): Contract[] {
  const confirmed = getConfirmedContractIds();
  return MOCK_CONTRACTS.filter(
    (c) =>
      c.status === 'Active' ||
      (c.status === 'Pending confirmation' && confirmed.includes(c.id))
  );
}
