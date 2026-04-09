import { apiJson } from './api-client';

export interface SpaceLimits {
  zone_area_percent_of_warehouse: number;
  shelf_area_percent_of_zone: number;
}

export interface RequestCreditPricing {
  base_request_credit_price_vnd: number;
  expired_contract_penalty_per_day_vnd: number;
  weekly_free_request_limit: number;
}

export interface WarehouseCreationTerms {
  warehouse_creation_terms: string;
}

export interface RentalDraftTerms {
  rental_draft_terms_content: string;
  rental_draft_terms_agreement_label: string;
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

export async function getRequestCreditPricing(): Promise<RequestCreditPricing> {
  const res = await apiJson<{ data?: RequestCreditPricing } | RequestCreditPricing>('/system-settings/request-credit-pricing', {
    method: 'GET',
  });
  return ((res as any).data ?? res) as RequestCreditPricing;
}

export async function updateRequestCreditPricing(payload: RequestCreditPricing): Promise<RequestCreditPricing> {
  const res = await apiJson<{ data?: RequestCreditPricing } | RequestCreditPricing>('/system-settings/request-credit-pricing', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return ((res as any).data ?? res) as RequestCreditPricing;
}

export async function getWarehouseCreationTerms(): Promise<WarehouseCreationTerms> {
  const res = await apiJson<{ data?: WarehouseCreationTerms } | WarehouseCreationTerms>('/system-settings/warehouse-creation-terms', {
    method: 'GET',
  });
  return ((res as any).data ?? res) as WarehouseCreationTerms;
}

export async function updateWarehouseCreationTerms(payload: WarehouseCreationTerms): Promise<WarehouseCreationTerms> {
  const res = await apiJson<{ data?: WarehouseCreationTerms } | WarehouseCreationTerms>('/system-settings/warehouse-creation-terms', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return ((res as any).data ?? res) as WarehouseCreationTerms;
}

export async function getRentalDraftTerms(): Promise<RentalDraftTerms> {
  const res = await apiJson<{ data?: RentalDraftTerms } | RentalDraftTerms>('/system-settings/rental-draft-terms', {
    method: 'GET',
  });
  return ((res as any).data ?? res) as RentalDraftTerms;
}

export async function updateRentalDraftTerms(payload: RentalDraftTerms): Promise<RentalDraftTerms> {
  const res = await apiJson<{ data?: RentalDraftTerms } | RentalDraftTerms>('/system-settings/rental-draft-terms', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return ((res as any).data ?? res) as RentalDraftTerms;
}
