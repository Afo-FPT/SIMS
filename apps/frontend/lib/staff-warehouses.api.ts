import { apiJson } from './api-client';

export interface StaffWithWarehouse {
  user_id: string;
  name: string;
  email: string;
  warehouse_id: string | null;
  warehouse_name: string | null;
}

export interface TransferStaffWarehouseResponse {
  user_id: string;
  warehouse_id: string;
  warehouse_name: string;
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
  staffId: string,
  warehouseId: string
): Promise<TransferStaffWarehouseResponse> {
  return apiJson<TransferStaffWarehouseResponse>(`/staff-warehouses/staffs/${staffId}/warehouse`, {
    method: 'PATCH',
    body: JSON.stringify({ warehouseId }),
  });
}

