import type { Shelf } from '../../types/manager';

export const MOCK_SHELVES: Shelf[] = [
  { id: 'sh-1', code: 'A-12-01', zone: 'Zone A', status: 'Occupied', contractId: 'C-001', contractCode: 'SWS-CON-2025-001' },
  { id: 'sh-2', code: 'A-12-02', zone: 'Zone A', status: 'Occupied', contractId: 'C-001', contractCode: 'SWS-CON-2025-001' },
  { id: 'sh-3', code: 'A-12-03', zone: 'Zone A', status: 'Occupied', contractId: 'C-001', contractCode: 'SWS-CON-2025-001' },
  { id: 'sh-4', code: 'A-12-04', zone: 'Zone A', status: 'Available' },
  { id: 'sh-5', code: 'A-12-05', zone: 'Zone A', status: 'Available' },
  { id: 'sh-6', code: 'B-05-01', zone: 'Zone B', status: 'Occupied', contractId: 'C-001', contractCode: 'SWS-CON-2025-001' },
  { id: 'sh-7', code: 'B-05-02', zone: 'Zone B', status: 'Available' },
  { id: 'sh-8', code: 'C-01-01', zone: 'Zone C', status: 'Available' },
];

export const MOCK_STAFF_USERS = [
  { id: 'staff-1', name: 'Mike Sterling', email: 'staff@swsms.ai' },
  { id: 'staff-2', name: 'Bob Johnson', email: 'bob.johnson@example.com' },
];
