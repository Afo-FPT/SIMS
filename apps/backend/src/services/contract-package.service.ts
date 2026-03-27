import {
  ContractPackage,
  IContractPackage,
  ContractPackageUnit
} from "../models/ContractPackage";
import { Types } from "mongoose";
import Warehouse from "../models/Warehouse";

export interface CreateContractPackageDTO {
  name: string;
  warehouseId: string;
  duration: number;
  unit: ContractPackageUnit;
  pricePerM2: number;
  pricePerDay: number;
  isActive?: boolean;
  description?: string;
}

export interface UpdateContractPackageDTO {
  name?: string;
  warehouseId?: string;
  duration?: number;
  unit?: ContractPackageUnit;
  pricePerM2?: number;
  pricePerDay?: number;
  isActive?: boolean;
  description?: string;
}

async function validateWarehouseAndPrices(warehouseId: string, pricePerM2: number, pricePerDay: number): Promise<void> {
  if (!Types.ObjectId.isValid(warehouseId)) throw new Error("Invalid warehouseId");
  const wh = await Warehouse.findById(warehouseId).select("_id");
  if (!wh) throw new Error("Warehouse not found");
  if (!Number.isFinite(pricePerM2) || pricePerM2 < 0) throw new Error("pricePerM2 must be >= 0");
  if (!Number.isFinite(pricePerDay) || pricePerDay < 0) throw new Error("pricePerDay must be >= 0");
}

export async function listContractPackages(warehouseId?: string, includeInactive = true): Promise<IContractPackage[]> {
  const query: any = {};
  if (warehouseId) {
    if (!Types.ObjectId.isValid(warehouseId)) throw new Error("Invalid warehouseId");
    query.warehouseId = new Types.ObjectId(warehouseId);
  }
  if (!includeInactive) {
    query.isActive = true;
  }
  return ContractPackage.find(query).sort({ createdAt: -1 }).exec();
}

export async function createContractPackage(
  payload: CreateContractPackageDTO
): Promise<IContractPackage> {
  await validateWarehouseAndPrices(payload.warehouseId, payload.pricePerM2, payload.pricePerDay);
  const pkg = new ContractPackage({
    name: payload.name,
    warehouseId: new Types.ObjectId(payload.warehouseId),
    duration: payload.duration,
    unit: payload.unit,
    pricePerM2: payload.pricePerM2,
    pricePerDay: payload.pricePerDay,
    isActive: payload.isActive ?? true,
    description: payload.description
  });
  return pkg.save();
}

export async function updateContractPackage(
  id: string,
  payload: UpdateContractPackageDTO
): Promise<IContractPackage | null> {
  if (!Types.ObjectId.isValid(id)) throw new Error("Invalid package id");
  const current = await ContractPackage.findById(id).select("warehouseId pricePerM2 pricePerDay");
  if (!current) return null;

  const nextWarehouseId = payload.warehouseId ?? current.warehouseId.toString();
  const nextPricePerM2 = payload.pricePerM2 ?? current.pricePerM2;
  const nextPricePerDay = payload.pricePerDay ?? current.pricePerDay;
  if (payload.pricePerM2 != null || payload.pricePerDay != null || payload.warehouseId) {
    await validateWarehouseAndPrices(nextWarehouseId, nextPricePerM2, nextPricePerDay);
  }

  const updateDoc: any = { ...payload };
  if (payload.warehouseId) updateDoc.warehouseId = new Types.ObjectId(payload.warehouseId);

  return ContractPackage.findByIdAndUpdate(id, updateDoc, {
    new: true,
    runValidators: true
  }).exec();
}

