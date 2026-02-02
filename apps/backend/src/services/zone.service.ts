import Zone from "../models/Zone";
import Warehouse from "../models/Warehouse";
import { Types } from "mongoose";

export interface CreateZoneRequest {
  zoneCode: string;
  name: string;
  description?: string;
}

export interface ZoneResponse {
  zone_id: string;
  zone_code: string;
  name: string;
  warehouse_id: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

async function validateWarehouse(warehouseId: string): Promise<void> {
  if (!Types.ObjectId.isValid(warehouseId)) {
    throw new Error("Invalid warehouse ID");
  }
  const warehouse = await Warehouse.findById(warehouseId);
  if (!warehouse) {
    throw new Error("Warehouse not found");
  }
}

export async function createZone(
  warehouseId: string,
  data: CreateZoneRequest,
  createdBy: string
): Promise<ZoneResponse> {
  await validateWarehouse(warehouseId);

  if (!data.zoneCode || !data.zoneCode.trim()) {
    throw new Error("Zone code is required");
  }
  if (!data.name || !data.name.trim()) {
    throw new Error("Zone name is required");
  }

  const zoneCode = data.zoneCode.trim().toUpperCase();
  const existing = await Zone.findOne({
    warehouseId: new Types.ObjectId(warehouseId),
    zoneCode
  });
  if (existing) {
    throw new Error("Zone code already exists in this warehouse");
  }

  const zone = await Zone.create({
    zoneCode,
    name: data.name.trim(),
    warehouseId: new Types.ObjectId(warehouseId),
    description: data.description?.trim(),
    status: "ACTIVE",
    createdBy: new Types.ObjectId(createdBy)
  });

  return {
    zone_id: zone._id.toString(),
    zone_code: zone.zoneCode,
    name: zone.name,
    warehouse_id: zone.warehouseId.toString(),
    description: zone.description,
    status: zone.status,
    created_by: zone.createdBy.toString(),
    created_at: zone.createdAt,
    updated_at: zone.updatedAt
  };
}

export async function listZonesByWarehouse(warehouseId: string): Promise<ZoneResponse[]> {
  await validateWarehouse(warehouseId);

  const zones = await Zone.find({ warehouseId: new Types.ObjectId(warehouseId) })
    .sort({ zoneCode: 1 })
    .lean();

  return zones.map((z: any) => ({
    zone_id: z._id.toString(),
    zone_code: z.zoneCode,
    name: z.name,
    warehouse_id: z.warehouseId.toString(),
    description: z.description,
    status: z.status,
    created_by: z.createdBy.toString(),
    created_at: z.createdAt,
    updated_at: z.updatedAt
  }));
}

export async function getZoneById(zoneId: string): Promise<ZoneResponse | null> {
  if (!Types.ObjectId.isValid(zoneId)) {
    return null;
  }
  const zone = await Zone.findById(zoneId).lean();
  if (!zone) return null;
  const z = zone as any;
  return {
    zone_id: z._id.toString(),
    zone_code: z.zoneCode,
    name: z.name,
    warehouse_id: z.warehouseId.toString(),
    description: z.description,
    status: z.status,
    created_by: z.createdBy.toString(),
    created_at: z.createdAt,
    updated_at: z.updatedAt
  };
}
