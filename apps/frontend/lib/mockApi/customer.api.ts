import type { Contract } from '../customer-types';
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
 * Get all contracts for the current customer
 */
export async function getCustomerContracts(): Promise<Contract[]> {
  const res = await fetchWithAuth('/contracts', {
    method: 'GET',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load contracts');
  }

  const contracts = data.data || data;
  if (Array.isArray(contracts)) {
    return contracts.map(mapBackendContractToContract);
  }
  return [];
}

/**
 * Get contract by ID for customer
 */
export async function getCustomerContractById(contractId: string): Promise<Contract | null> {
  const res = await fetchWithAuth(`/contracts/${contractId}`, {
    method: 'GET',
  });

  if (!res.ok) {
    if (res.status === 404) {
      return null;
    }
    const data = await res.json();
    throw new Error(data.message || 'Failed to load contract');
  }

  const data = await res.json();
  const contract = data.data || data;
  return mapBackendContractToContract(contract);
}
