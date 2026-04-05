import { apiJson } from './api-client';

/** GET /api/shelves/:id/utilization — volumes in m³ */
export interface ShelfUtilization {
  shelf_id: string;
  shelf_code: string;
  warehouse_id: string;
  max_capacity: number;
  current_utilization: number;
  utilization_percentage: number;
  status: string;
  items_count: number;
}

export async function getShelfUtilization(shelfId: string): Promise<ShelfUtilization> {
  return await apiJson<ShelfUtilization>(`/shelves/${shelfId}/utilization`, { method: 'GET' });
}
