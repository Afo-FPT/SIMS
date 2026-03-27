import { apiJson } from './api-client';

export interface StaffUserOption {
  user_id: string;
  name: string;
  email: string;
}

/**
 * Lấy danh sách staff (role=staff, isActive=true) cho manager/admin
 */
export async function listStaffUsers(): Promise<StaffUserOption[]> {
  return await apiJson<StaffUserOption[]>('/users/staff', { method: 'GET' });
}

