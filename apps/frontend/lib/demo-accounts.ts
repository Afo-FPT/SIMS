
/**
 * Demo Accounts for Testing
 * In production, these would be fetched from a database
 */

export interface DemoAccount {
  email: string;
  password: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER';
  name: string;
  avatar?: string;
  title: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'admin@swsms.ai',
    password: 'admin123',
    role: 'ADMIN',
    name: 'John Doe',
    avatar: 'https://picsum.photos/seed/admin/100/100',
    title: 'System Architect'
  },
  {
    email: 'manager@swsms.ai',
    password: 'manager123',
    role: 'MANAGER',
    name: 'Sarah Miller',
    avatar: 'https://picsum.photos/seed/manager/100/100',
    title: 'Regional Ops Manager'
  },
  {
    email: 'staff@swsms.ai',
    password: 'staff123',
    role: 'STAFF',
    name: 'Mike Sterling',
    avatar: 'https://picsum.photos/seed/staff/100/100',
    title: 'Warehouse Lead'
  },
  {
    email: 'customer@swsms.ai',
    password: 'customer123',
    role: 'CUSTOMER',
    name: 'Alex Sterling',
    avatar: 'https://picsum.photos/seed/customer/100/100',
    title: 'Account Owner'
  }
];

/**
 * Find demo account by email
 */
export function findDemoAccount(email: string): DemoAccount | undefined {
  return DEMO_ACCOUNTS.find(account => account.email.toLowerCase() === email.toLowerCase());
}

/**
 * Verify demo account credentials
 */
export function verifyDemoAccount(email: string, password: string): DemoAccount | null {
  const account = findDemoAccount(email);
  if (account && account.password === password) {
    return account;
  }
  return null;
}
