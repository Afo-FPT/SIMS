import { apiJson } from './api-client';

export interface SpaceLimits {
  zone_area_percent_of_warehouse: number;
  shelf_area_percent_of_zone: number;
}

export async function getSpaceLimits(): Promise<SpaceLimits> {
  const res = await apiJson<{ data?: SpaceLimits } | SpaceLimits>('/system-settings/space-limits', {
    method: 'GET',
  });
  return ((res as any).data ?? res) as SpaceLimits;
}

export async function updateSpaceLimits(payload: SpaceLimits): Promise<SpaceLimits> {
  const res = await apiJson<{ data?: SpaceLimits } | SpaceLimits>('/system-settings/space-limits', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return ((res as any).data ?? res) as SpaceLimits;
}
