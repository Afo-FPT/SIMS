import { apiJson } from './api-client';

export type ContractPackageUnit = 'day' | 'month' | 'year';

export interface ContractPackage {
  _id: string;
  name: string;
  warehouseId: string;
  duration: number;
  unit: ContractPackageUnit;
  pricePerM2: number;
  pricePerDay: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveContractPackagePayload {
  name: string;
  warehouseId: string;
  duration: number;
  unit: ContractPackageUnit;
  pricePerM2: number;
  pricePerDay: number;
  description?: string;
  isActive?: boolean;
}

export async function listContractPackages(): Promise<ContractPackage[]> {
  return apiJson<ContractPackage[]>('/contract-packages', {
    method: 'GET',
  });
}

export async function createContractPackage(
  payload: SaveContractPackagePayload,
): Promise<ContractPackage> {
  return apiJson<ContractPackage>('/contract-packages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateContractPackage(
  id: string,
  payload: Partial<SaveContractPackagePayload>,
): Promise<ContractPackage> {
  return apiJson<ContractPackage>(`/contract-packages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

