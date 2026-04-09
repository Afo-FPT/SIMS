import type { Contract } from './customer-types';
import { apiFetchRaw, apiJson } from './api-client';

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * Backend can return snake_case (ContractResponse) or Mongoose-style (_id, camelCase).
 * Support both so list and get-by-id work regardless of response shape.
 */
function normalizeContractId(c: any): string {
  if (!c) return '';
  const id = c.contract_id ?? c._id ?? c.id;
  return typeof id === 'string' ? id : (id?.toString?.() ?? '');
}

function mapBackendContractToContract(c: any): Contract {
  const rentedZones = (c.rented_zones ?? c.rentedZones ?? []).map((rz: any) => ({
    zoneId: rz.zone_id ?? rz.zoneId ?? '',
    zoneCode: rz.zone_code ?? rz.zoneCode,
    zoneName: rz.zone_name ?? rz.zoneName,
    startDate:
      typeof (rz.start_date ?? rz.startDate) === 'string'
        ? (rz.start_date ?? rz.startDate)
        : new Date(rz.start_date ?? rz.startDate).toISOString(),
    endDate:
      typeof (rz.end_date ?? rz.endDate) === 'string'
        ? (rz.end_date ?? rz.endDate)
        : new Date(rz.end_date ?? rz.endDate).toISOString(),
    price: rz.price ?? 0,
  }));

  const createdAt = c.created_at ?? c.createdAt;
  const updatedAt = c.updated_at ?? c.updatedAt;

  return {
    id: normalizeContractId(c),
    code: c.contract_code ?? c.contractCode ?? '',
    customerId: (c.customer_id ?? c.customerId)?.toString?.() ?? String(c.customer_id ?? c.customerId ?? ''),
    customerName: c.customer_name ?? c.customerId?.name,
    warehouseId: (c.warehouse_id ?? c.warehouseId)?.toString?.() ?? String(c.warehouse_id ?? c.warehouseId ?? ''),
    warehouseName: c.warehouse_name ?? c.warehouseId?.name,
    warehouseAddress: c.warehouse_address ?? c.warehouseId?.address,
    rentedZones,
    requestedZoneId:
      (c.requested_zone_id ?? c.requestedZoneId)?.toString?.() ?? c.requested_zone_id ?? c.requestedZoneId,
    requestedStartDate:
      c.requested_start_date != null
        ? (typeof c.requested_start_date === 'string'
            ? c.requested_start_date
            : new Date(c.requested_start_date).toISOString())
        : c.requestedStartDate != null
          ? (typeof c.requestedStartDate === 'string'
              ? c.requestedStartDate
              : new Date(c.requestedStartDate).toISOString())
          : undefined,
    requestedEndDate:
      c.requested_end_date != null
        ? (typeof c.requested_end_date === 'string'
            ? c.requested_end_date
            : new Date(c.requested_end_date).toISOString())
        : c.requestedEndDate != null
          ? (typeof c.requestedEndDate === 'string'
              ? c.requestedEndDate
              : new Date(c.requestedEndDate).toISOString())
          : undefined,
    status: c.status ?? 'draft',
    createdBy: (c.created_by ?? c.createdBy)?.toString?.() ?? String(c.created_by ?? c.createdBy ?? ''),
    createdAt:
      typeof createdAt === 'string'
        ? createdAt
        : createdAt
          ? new Date(createdAt).toISOString()
          : new Date().toISOString(),
    updatedAt:
      typeof updatedAt === 'string'
        ? updatedAt
        : updatedAt
          ? new Date(updatedAt).toISOString()
          : new Date().toISOString(),
  };
}

/** Get all contracts for the current customer */
export async function getCustomerContracts(): Promise<Contract[]> {
  const contracts = await apiJson<any>('/contracts', { method: 'GET' });
  if (Array.isArray(contracts)) {
    return contracts.map(mapBackendContractToContract);
  }
  return [];
}

/** Get contract by ID for customer */
export async function getCustomerContractById(contractId: string): Promise<Contract | null> {
  if (!contractId || contractId === 'undefined' || contractId === 'null') {
    return null;
  }
  const res = await apiFetchRaw(`/contracts/${contractId}`, { method: 'GET' });
  const data = await safeJson(res);
  if (res.status === 404) {
    try {
      const list = await getCustomerContracts();
      const found = list.find((c) => c.id === contractId);
      if (found) {
        return found;
      }
    } catch {
      // ignore
    }
    return null;
  }
  if (!res.ok) {
    throw new Error(data?.message || 'Failed to load contract');
  }
  const raw = data?.data ?? data;
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const contract = mapBackendContractToContract(raw);
  return { ...contract, id: contract.id || contractId };
}

