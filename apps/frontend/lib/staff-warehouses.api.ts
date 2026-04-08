import { apiJson } from './api-client';

export interface StaffWithWarehouse {
  user_id: string;
  name: string;
  email: string;
  warehouse_id: string | null;
  warehouse_name: string | null;
}

export interface TransferStaffWarehouseResponse {
  warehouse_id: string;
  warehouse_name: string;
  staff_id: string;
  staff_name: string;
  staff_email: string;
}

export interface WarehouseWithAssignedStaff {
  warehouse_id: string;
  warehouse_name: string;
  staff_id: string | null;
  staff_name: string | null;
  staff_email: string | null;
}

export async function listStaffWithWarehouse(params?: {
  search?: string;
  warehouseId?: string;
}): Promise<StaffWithWarehouse[]> {
  const qs = new URLSearchParams();
  if (params?.search?.trim()) qs.set('search', params.search.trim());
  if (params?.warehouseId?.trim()) qs.set('warehouseId', params.warehouseId.trim());
  const query = qs.toString();
  return apiJson<StaffWithWarehouse[]>(`/staff-warehouses/staffs${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

export async function transferStaffWarehouse(
  warehouseId: string,
  staffId: string
): Promise<TransferStaffWarehouseResponse> {
  return apiJson<TransferStaffWarehouseResponse>(`/staff-warehouses/warehouses/${warehouseId}/staff`, {
    method: 'PATCH',
    body: JSON.stringify({ staffId }),
  });
}

export async function listWarehousesWithAssignedStaff(params?: {
  search?: string;
}): Promise<WarehouseWithAssignedStaff[]> {
  const qs = new URLSearchParams();
  if (params?.search?.trim()) qs.set('search', params.search.trim());
  const query = qs.toString();
  return apiJson<WarehouseWithAssignedStaff[]>(`/staff-warehouses/warehouses${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

export async function unassignStaffFromWarehouse(warehouseId: string): Promise<{
  warehouse_id: string;
  warehouse_name: string;
}> {
  return apiJson(`/staff-warehouses/warehouses/${warehouseId}/staff`, {
    method: 'DELETE',
  });
}

