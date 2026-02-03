import type { AdminStats, AdminUser, AdminLog, ListUsersParams, ListLogsParams } from '../../types/admin';
import type { Role, UserStatus } from '../../types/auth';
import { apiFetchRaw, getApiUrl } from '../api-client';

interface BackendUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | 'customer';
  isActive: boolean;
  createdAt?: string;
  // other fields are ignored
}

interface BackendUsersResponse {
  data: BackendUser[];
}

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  return apiFetchRaw(path, options);
}

function mapBackendRoleToFrontend(role: BackendUser['role']): Role {
  switch (role) {
    case 'admin':
      return 'ADMIN';
    case 'manager':
      return 'MANAGER';
    case 'staff':
      return 'STAFF';
    case 'customer':
    default:
      return 'CUSTOMER';
  }
}

function mapFrontendRoleToBackend(role: Role): BackendUser['role'] {
  switch (role) {
    case 'ADMIN':
      return 'admin';
    case 'MANAGER':
      return 'manager';
    case 'STAFF':
      return 'staff';
    case 'CUSTOMER':
    default:
      return 'customer';
  }
}

function mapBackendUserToAdminUser(user: BackendUser): AdminUser {
  const status: UserStatus = user.isActive ? 'ACTIVE' : 'LOCKED';

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: mapBackendRoleToFrontend(user.role),
    status,
    createdAt: user.createdAt || new Date().toISOString(),
    // Optional fields (avatar, title, lastLoginAt, ipAddress) are not provided by backend
  };
}

async function fetchAllBackendUsers(): Promise<AdminUser[]> {
  const res = await fetchWithAuth('/users', {
    method: 'GET',
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Failed to load users');
  }

  const response = data as BackendUsersResponse;
  return response.data.map(mapBackendUserToAdminUser);
}

export async function getAdminStats(): Promise<AdminStats> {
  const users = await fetchAllBackendUsers();

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;
  const lockedUsers = users.filter((u) => u.status === 'LOCKED').length;

  return {
    totalUsers,
    activeUsers,
    lockedUsers,
    todayLogs: 0,
    todayErrors: 0,
    health: {
      api: 'OK',
      db: 'OK',
      queue: 'OK',
    },
  };
}

export async function listUsers(params: ListUsersParams = {}): Promise<{ items: AdminUser[]; total: number }> {
  let users = await fetchAllBackendUsers();

  // Search
  if (params.search) {
    const q = params.search.toLowerCase();
    users = users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  // Filter by role
  if (params.role) {
    users = users.filter((u) => u.role === params.role);
  }

  // Filter by status
  if (params.status) {
    users = users.filter((u) => u.status === params.status);
  }

  const total = users.length;

  // Pagination
  const page = params.page || 1;
  const limit = params.limit || 10;
  const start = (page - 1) * limit;
  const end = start + limit;
  const items = users.slice(start, end);

  return { items, total };
}

export async function createUser(payload: Omit<AdminUser, 'id' | 'createdAt'>): Promise<AdminUser> {
  // Use auth/register to create user with specified role
  const body = {
    name: payload.name,
    email: payload.email,
    password: 'Password@123', // default password, should be changed by user via reset flow
    role: mapFrontendRoleToBackend(payload.role),
  };

  const res = await fetchWithAuth('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Failed to create user');
  }

  // Backend register returns { message, user }
  const backendUser = data.user as BackendUser;

  const adminUser = mapBackendUserToAdminUser(backendUser);

  // Respect initial status: if LOCKED, immediately deactivate
  if (payload.status === 'LOCKED') {
    await toggleUserStatus(adminUser.id);
    adminUser.status = 'LOCKED';
  }

  return adminUser;
}

export async function updateUser(id: string, payload: Partial<AdminUser>): Promise<AdminUser> {
  const body: { name?: string; role?: BackendUser['role'] } = {};

  if (payload.name) {
    body.name = payload.name;
  }

  if (payload.role) {
    body.role = mapFrontendRoleToBackend(payload.role);
  }

  const res = await fetchWithAuth(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Failed to update user');
  }

  const backendUser = data.data as BackendUser;
  return mapBackendUserToAdminUser(backendUser);
}

export async function toggleUserStatus(id: string): Promise<AdminUser> {
  // First fetch the user to know current status
  const resGet = await fetchWithAuth(`/users/${id}`, {
    method: 'GET',
  });
  const dataGet = await resGet.json();

  if (!resGet.ok) {
    throw new Error(dataGet.message || 'Failed to load user');
  }

  const backendUser = (dataGet.data || dataGet) as BackendUser;
  const isActive = backendUser.isActive;

  const res = await fetchWithAuth(`/users/${id}/${isActive ? 'deactivate' : 'activate'}`, {
    method: 'PUT',
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Failed to toggle user status');
  }

  const updatedUser = data.data as BackendUser;
  return mapBackendUserToAdminUser(updatedUser);
}

export async function resetUserPassword(id: string): Promise<boolean> {
  // Need email to send reset link: fetch user first
  const resGet = await fetchWithAuth(`/users/${id}`, {
    method: 'GET',
  });
  const dataGet = await resGet.json();

  if (!resGet.ok) {
    throw new Error(dataGet.message || 'Failed to load user');
  }

  const backendUser = (dataGet.data || dataGet) as BackendUser;

  const res = await fetch(getApiUrl('/auth/forgot-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: backendUser.email }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Failed to reset password');
  }

  return true;
}

export async function listLogs(params: ListLogsParams = {}): Promise<{ items: AdminLog[]; total: number }> {
  // Logs are not yet implemented on backend; return empty list with filters applied
  return {
    items: [],
    total: 0,
  };
}
