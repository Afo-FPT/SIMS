import { apiJson } from './api-client';

export type ContractPackageUnit = 'day' | 'month' | 'year';

export interface ContractPackage {
  _id: string;
  name: string;
  duration: number;
  unit: ContractPackageUnit;
  price: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveContractPackagePayload {
  name: string;
  duration: number;
  unit: ContractPackageUnit;
  price: number;
  description?: string;
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
  payload: SaveContractPackagePayload,
): Promise<ContractPackage> {
  return apiJson<ContractPackage>(`/contract-packages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

