import type { Contract } from '../customer-types';
import { apiFetchRaw, apiJson } from '../api-client';

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
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
  const contracts = await apiJson<any>('/contracts', { method: 'GET' });
  if (Array.isArray(contracts)) {
    return contracts.map(mapBackendContractToContract);
  }
  return [];
}

/**
 * Get contract by ID for customer
 */
export async function getCustomerContractById(contractId: string): Promise<Contract | null> {
  const res = await apiFetchRaw(`/contracts/${contractId}`, { method: 'GET' });
  if (res.status === 404) return null;
  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data?.message || 'Failed to load contract');
  }
  const contract = data.data || data;
  return mapBackendContractToContract(contract);
}
