import {
  ContractPackage,
  IContractPackage,
  ContractPackageUnit
} from "../models/ContractPackage";

export interface CreateContractPackageDTO {
  name: string;
  duration: number;
  unit: ContractPackageUnit;
  price: number;
  description?: string;
}

export interface UpdateContractPackageDTO {
  name?: string;
  duration?: number;
  unit?: ContractPackageUnit;
  price?: number;
  description?: string;
}

export async function listContractPackages(): Promise<IContractPackage[]> {
  return ContractPackage.find().sort({ createdAt: -1 }).exec();
}

export async function createContractPackage(
  payload: CreateContractPackageDTO
): Promise<IContractPackage> {
  const pkg = new ContractPackage(payload);
  return pkg.save();
}

export async function updateContractPackage(
  id: string,
  payload: UpdateContractPackageDTO
): Promise<IContractPackage | null> {
  return ContractPackage.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true
  }).exec();
}

