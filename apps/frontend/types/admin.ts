
import type { Role, UserStatus } from './auth';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  todayLogs: number;
  todayErrors: number;
  health?: {
    api: 'OK' | 'WARN' | 'ERROR';
    db: 'OK' | 'WARN' | 'ERROR';
    queue: 'OK' | 'WARN' | 'ERROR';
  };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  avatar?: string;
  title?: string;
  createdAt: string;
  lastLoginAt?: string;
  ipAddress?: string;
}

export interface AdminLog {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  actionType: string;
  actorEmail: string;
  action: string;
  ip?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface ListUsersParams {
  search?: string;
  role?: Role;
  status?: UserStatus;
  page?: number;
  limit?: number;
}

export interface ListLogsParams {
  level?: 'INFO' | 'WARN' | 'ERROR';
  actionType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
