import { apiJson } from './api-client';

export interface StoredItemOption {
  stored_item_id: string;
  contract_id: string;
  contract_code?: string;
  shelf_id: string;
  shelf_code?: string;
  item_name: string;
  quantity: number;
  unit: string;
  quantity_per_unit?: number;
  /** Volume of one unit in m³ (if recorded) */
  volume_per_unit_m3?: number;
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

export interface StoredProductOverview {
  product_id: string;
  sku: string;
  contract_id: string;
  contract_code?: string;
  total_quantity: number;
  unit: string;
  quantity_per_unit?: number;
  last_updated: string;
}

export interface StoredProductShelfRow {
  shelf: string;
  quantity: number;
  unit: string;
  quantity_per_unit?: number;
  last_updated: string;
  contract_id: string;
  contract_code?: string;
}

export async function listMyStoredProducts(contractId?: string): Promise<StoredProductOverview[]> {
  const qs = new URLSearchParams();
  if (contractId) qs.set('contractId', contractId);
  return await apiJson<StoredProductOverview[]>(
    `/stored-items/my/products${qs.toString() ? `?${qs}` : ''}`,
    { method: 'GET' }
  );
}

export async function getMyStoredProductShelves(sku: string, contractId?: string): Promise<StoredProductShelfRow[]> {
  const qs = new URLSearchParams();
  if (contractId) qs.set('contractId', contractId);
  return await apiJson<StoredProductShelfRow[]>(
    `/stored-items/my/products/${encodeURIComponent(sku)}${qs.toString() ? `?${qs}` : ''}`,
    { method: 'GET' }
  );
}

