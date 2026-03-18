import { apiJson } from './api-client';

export type AppUserRole = 'admin' | 'manager' | 'staff' | 'customer';

export interface MyProfile {
  _id: string;
  name: string;
  email: string;
  role: AppUserRole;
  isActive: boolean;
  phone?: string | null;
  companyName?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export async function getMyProfile(): Promise<MyProfile> {
  return await apiJson<MyProfile>('/users/me', { method: 'GET' });
}

export async function updateMyProfile(payload: {
  name?: string;
  phone?: string;
  companyName?: string;
  avatarUrl?: string;
}): Promise<MyProfile> {
  return await apiJson<MyProfile>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

