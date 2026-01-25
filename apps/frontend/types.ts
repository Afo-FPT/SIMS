
export type Persona = 'ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Persona;
  avatar?: string;
  title?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  location: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Reordering';
  lastUpdated: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  user: string;
  message: string;
  category: 'AI Events' | 'Security' | 'Operations';
  status: 'Success' | 'Warning' | 'Failed';
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  totalShelves: number;
  occupancy: number;
  status: 'Active' | 'Inactive';
}

export interface Task {
  id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'In Progress' | 'Completed';
  assignee: string;
  deadline: string;
}
