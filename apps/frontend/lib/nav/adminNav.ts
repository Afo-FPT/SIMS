export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/admin/dashboard', icon: 'dashboard' },
  { label: 'Users', href: '/admin/users', icon: 'people' },
  { label: 'Logs', href: '/admin/logs', icon: 'description' },
];
