import type { AdminStats, AdminUser, AdminLog } from '../../types/admin';
import type { Role, UserStatus } from '../../types/auth';

export const mockStats: AdminStats = {
  totalUsers: 47,
  activeUsers: 42,
  lockedUsers: 5,
  todayLogs: 1247,
  todayErrors: 3,
  health: {
    api: 'OK',
    db: 'OK',
    queue: 'OK',
  },
};

export const mockUsers: AdminUser[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'admin@swsms.ai',
    role: 'ADMIN',
    status: 'ACTIVE',
    avatar: 'https://picsum.photos/seed/admin/100/100',
    title: 'System Architect',
    createdAt: '2024-01-15T10:00:00Z',
    lastLoginAt: '2025-01-28T14:30:00Z',
    ipAddress: '192.168.1.100',
  },
  {
    id: '2',
    name: 'Sarah Miller',
    email: 'manager@swsms.ai',
    role: 'MANAGER',
    status: 'ACTIVE',
    avatar: 'https://picsum.photos/seed/manager/100/100',
    title: 'Regional Ops Manager',
    createdAt: '2024-02-20T09:00:00Z',
    lastLoginAt: '2025-01-28T12:15:00Z',
    ipAddress: '192.168.1.101',
  },
  {
    id: '3',
    name: 'Mike Sterling',
    email: 'staff@swsms.ai',
    role: 'STAFF',
    status: 'ACTIVE',
    avatar: 'https://picsum.photos/seed/staff/100/100',
    title: 'Warehouse Lead',
    createdAt: '2024-03-10T11:00:00Z',
    lastLoginAt: '2025-01-28T08:00:00Z',
    ipAddress: '192.168.1.102',
  },
  {
    id: '4',
    name: 'Alex Sterling',
    email: 'customer@swsms.ai',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    avatar: 'https://picsum.photos/seed/customer/100/100',
    title: 'Account Owner',
    createdAt: '2024-04-05T14:00:00Z',
    lastLoginAt: '2025-01-28T16:45:00Z',
    ipAddress: '192.168.1.103',
  },
  {
    id: '5',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'CUSTOMER',
    status: 'LOCKED',
    avatar: 'https://picsum.photos/seed/jane/100/100',
    title: 'Account Owner',
    createdAt: '2024-05-12T10:00:00Z',
    lastLoginAt: '2025-01-20T10:00:00Z',
    ipAddress: '192.168.1.104',
  },
  {
    id: '6',
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    role: 'STAFF',
    status: 'ACTIVE',
    avatar: 'https://picsum.photos/seed/bob/100/100',
    title: 'Warehouse Operator',
    createdAt: '2024-06-18T09:00:00Z',
    lastLoginAt: '2025-01-28T07:30:00Z',
    ipAddress: '192.168.1.105',
  },
  {
    id: '7',
    name: 'Alice Brown',
    email: 'alice.brown@example.com',
    role: 'MANAGER',
    status: 'LOCKED',
    avatar: 'https://picsum.photos/seed/alice/100/100',
    title: 'Operations Manager',
    createdAt: '2024-07-22T11:00:00Z',
    lastLoginAt: '2025-01-15T13:20:00Z',
    ipAddress: '192.168.1.106',
  },
];

const actionTypes = [
  'LOGIN',
  'LOGOUT',
  'USER_UPDATE',
  'ROLE_CHANGE',
  'USER_CREATE',
  'USER_LOCK',
  'USER_UNLOCK',
  'PASSWORD_RESET',
  'API_ERROR',
  'SYSTEM_ERROR',
  'CONFIG_UPDATE',
  'WAREHOUSE_ACCESS',
];

const generateLog = (id: string, level: 'INFO' | 'WARN' | 'ERROR', daysAgo: number): AdminLog => {
  const timestamp = new Date();
  timestamp.setDate(timestamp.getDate() - daysAgo);
  timestamp.setHours(Math.floor(Math.random() * 24));
  timestamp.setMinutes(Math.floor(Math.random() * 60));

  const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
  const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];

  return {
    id,
    level,
    actionType,
    actorEmail: user.email,
    action: `${actionType} by ${user.name}`,
    ip: `192.168.1.${100 + Math.floor(Math.random() * 10)}`,
    metadata: {
      userId: user.id,
      userRole: user.role,
      ...(actionType.includes('ERROR') && { errorCode: `ERR-${Math.floor(Math.random() * 1000)}` }),
    },
    timestamp: timestamp.toISOString(),
  };
};

export const mockLogs: AdminLog[] = [
  ...Array.from({ length: 30 }, (_, i) => generateLog(`log-${i + 1}`, 'INFO', Math.floor(i / 3))),
  ...Array.from({ length: 10 }, (_, i) => generateLog(`log-warn-${i + 1}`, 'WARN', Math.floor(i / 2))),
  ...Array.from({ length: 5 }, (_, i) => generateLog(`log-err-${i + 1}`, 'ERROR', i)),
];
