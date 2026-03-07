import { apiJson } from './api-client';

export interface StoredItemOption {
  stored_item_id: string;
  contract_id: string;
  shelf_id: string;
  shelf_code?: string;
  item_name: string;
  quantity: number;
  unit: string;
  quantity_per_unit?: number;
  updated_at: string;
}

export async function listMyStoredItems(contractId?: string): Promise<StoredItemOption[]> {
  const qs = new URLSearchParams();
  if (contractId) qs.set('contractId', contractId);
  return await apiJson<StoredItemOption[]>(
    `/stored-items/my${qs.toString() ? `?${qs}` : ''}`,
    { method: 'GET' }
  );
}

