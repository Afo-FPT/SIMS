import { getAuthState } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const state = getAuthState();
  return state.token;
}

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  return fetch(getApiUrl(path), { ...options, headers });
}

export interface StoredItemOption {
  stored_item_id: string;
  contract_id: string;
  shelf_id: string;
  shelf_code?: string;
  item_name: string;
  quantity: number;
  unit: string;
  updated_at: string;
}

export async function listMyStoredItems(contractId?: string): Promise<StoredItemOption[]> {
  const qs = new URLSearchParams();
  if (contractId) qs.set('contractId', contractId);
  const res = await fetchWithAuth(`/stored-items/my${qs.toString() ? `?${qs}` : ''}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to load stored items');
  return (data.data ?? data) as StoredItemOption[];
}

