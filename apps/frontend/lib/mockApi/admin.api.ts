import type { AdminStats, AdminUser, AdminLog, ListUsersParams, ListLogsParams } from '../../types/admin';
import { mockStats, mockUsers, mockLogs } from '../mock/admin.mock';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldError() {
  return Math.random() < 0.1; // 10% chance
}

export async function getAdminStats(): Promise<AdminStats> {
  await delay(300 + Math.random() * 400);
  if (shouldError()) {
    throw new Error('Failed to fetch admin stats');
  }
  return mockStats;
}

export async function listUsers(params: ListUsersParams = {}): Promise<{ items: AdminUser[]; total: number }> {
  await delay(400 + Math.random() * 300);
  if (shouldError()) {
    throw new Error('Failed to fetch users');
  }

  let filtered = [...mockUsers];

  // Search
  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  // Filter by role
  if (params.role) {
    filtered = filtered.filter((u) => u.role === params.role);
  }

  // Filter by status
  if (params.status) {
    filtered = filtered.filter((u) => u.status === params.status);
  }

  // Pagination
  const page = params.page || 1;
  const limit = params.limit || 10;
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = filtered.slice(start, end);

  return {
    items: paginated,
    total: filtered.length,
  };
}

export async function createUser(payload: Omit<AdminUser, 'id' | 'createdAt'>): Promise<AdminUser> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) {
    throw new Error('Failed to create user');
  }

  const newUser: AdminUser = {
    id: String(mockUsers.length + 1),
    ...payload,
    createdAt: new Date().toISOString(),
  };

  mockUsers.push(newUser);
  return newUser;
}

export async function updateUser(id: string, payload: Partial<AdminUser>): Promise<AdminUser> {
  await delay(400 + Math.random() * 300);
  if (shouldError()) {
    throw new Error('Failed to update user');
  }

  const index = mockUsers.findIndex((u) => u.id === id);
  if (index === -1) {
    throw new Error('User not found');
  }

  mockUsers[index] = { ...mockUsers[index], ...payload };
  return mockUsers[index];
}

export async function toggleUserStatus(id: string): Promise<AdminUser> {
  await delay(300 + Math.random() * 200);
  if (shouldError()) {
    throw new Error('Failed to toggle user status');
  }

  const index = mockUsers.findIndex((u) => u.id === id);
  if (index === -1) {
    throw new Error('User not found');
  }

  mockUsers[index].status = mockUsers[index].status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
  return mockUsers[index];
}

export async function resetUserPassword(id: string): Promise<boolean> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) {
    throw new Error('Failed to reset password');
  }

  const index = mockUsers.findIndex((u) => u.id === id);
  if (index === -1) {
    throw new Error('User not found');
  }

  return true;
}

export async function listLogs(params: ListLogsParams = {}): Promise<{ items: AdminLog[]; total: number }> {
  await delay(400 + Math.random() * 300);
  if (shouldError()) {
    throw new Error('Failed to fetch logs');
  }

  let filtered = [...mockLogs];

  // Filter by level
  if (params.level) {
    filtered = filtered.filter((l) => l.level === params.level);
  }

  // Filter by action type
  if (params.actionType) {
    filtered = filtered.filter((l) => l.actionType === params.actionType);
  }

  // Search
  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.actorEmail.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.ip && l.ip.includes(q))
    );
  }

  // Date range
  if (params.startDate) {
    const start = new Date(params.startDate);
    filtered = filtered.filter((l) => new Date(l.timestamp) >= start);
  }
  if (params.endDate) {
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter((l) => new Date(l.timestamp) <= end);
  }

  // Sort by timestamp (newest first)
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Pagination
  const page = params.page || 1;
  const limit = params.limit || 10;
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = filtered.slice(start, end);

  return {
    items: paginated,
    total: filtered.length,
  };
}
