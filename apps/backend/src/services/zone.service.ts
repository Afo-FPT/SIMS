import Zone from "../models/Zone";
import Warehouse from "../models/Warehouse";
import { Types } from "mongoose";
import { getOrCreateSpaceLimits } from "./system-setting.service";

export interface CreateZoneRequest {
  zoneCode: string;
  name: string;
  area: number;
  description?: string;
}

export interface UpdateZoneRequest {
  zoneCode?: string;
  name?: string;
  area?: number;
  description?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface ZoneResponse {
  zone_id: string;
  zone_code: string;
  name: string;
  area: number;
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

async function validateZoneAreaLimit(warehouseId: string, nextZoneArea: number, excludeZoneId?: string): Promise<void> {
  if (!Number.isFinite(nextZoneArea) || nextZoneArea <= 0) {
    throw new Error("Zone area must be a valid number > 0");
  }
  const warehouse = await Warehouse.findById(warehouseId).select("area");
  if (!warehouse) {
    throw new Error("Warehouse not found");
  }
  const limits = await getOrCreateSpaceLimits();
  const maxAllowed = (warehouse.area * limits.zone_area_percent_of_warehouse) / 100;

  const match: any = { warehouseId: new Types.ObjectId(warehouseId) };
  if (excludeZoneId && Types.ObjectId.isValid(excludeZoneId)) {
    match._id = { $ne: new Types.ObjectId(excludeZoneId) };
  }
  const rows = await Zone.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$area" } } }
  ]);
  const used = rows?.[0]?.total ?? 0;
  const nextTotal = used + nextZoneArea;

  if (nextTotal > maxAllowed) {
    throw new Error(
      `Zone area exceeds limit: max ${maxAllowed.toFixed(2)} m2 (${limits.zone_area_percent_of_warehouse}% warehouse), current ${used.toFixed(2)} m2, requested ${nextZoneArea.toFixed(2)} m2`
    );
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
  await validateZoneAreaLimit(warehouseId, Number(data.area));

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
    area: Number(data.area),
    warehouseId: new Types.ObjectId(warehouseId),
    description: data.description?.trim(),
    status: "ACTIVE",
    createdBy: new Types.ObjectId(createdBy)
  });

  return {
    zone_id: zone._id.toString(),
    zone_code: zone.zoneCode,
    name: zone.name,
    area: zone.area,
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
    area: z.area,
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
    area: z.area,
    warehouse_id: z.warehouseId.toString(),
    description: z.description,
    status: z.status,
    created_by: z.createdBy.toString(),
    created_at: z.createdAt,
    updated_at: z.updatedAt
  };
}

export async function updateZone(
  warehouseId: string,
  zoneId: string,
  data: UpdateZoneRequest
): Promise<ZoneResponse> {
  await validateWarehouse(warehouseId);
  if (!Types.ObjectId.isValid(zoneId)) throw new Error("Invalid zone ID");

  const zone = await Zone.findById(zoneId);
  if (!zone) throw new Error("Zone not found");
  if (zone.warehouseId.toString() !== warehouseId) {
    throw new Error("Zone does not belong to this warehouse");
  }

  if (data.zoneCode != null) {
    const nextCode = data.zoneCode.trim().toUpperCase();
    if (!nextCode) throw new Error("Zone code is required");
    if (nextCode !== zone.zoneCode) {
      const duplicated = await Zone.findOne({
        warehouseId: new Types.ObjectId(warehouseId),
        zoneCode: nextCode,
        _id: { $ne: zone._id }
      });
      if (duplicated) throw new Error("Zone code already exists in this warehouse");
      zone.zoneCode = nextCode;
    }
  }

  if (data.name != null) {
    const nextName = data.name.trim();
    if (!nextName) throw new Error("Zone name is required");
    zone.name = nextName;
  }

  if (data.area != null) {
    const nextArea = Number(data.area);
    await validateZoneAreaLimit(warehouseId, nextArea, zoneId);
    zone.area = nextArea;
  }

  if (data.description != null) {
    const nextDescription = data.description.trim();
    zone.description = nextDescription || undefined;
  }

  if (data.status != null) {
    if (data.status !== "ACTIVE" && data.status !== "INACTIVE") {
      throw new Error("Invalid zone status");
    }
    zone.status = data.status;
  }

  await zone.save();

  return {
    zone_id: zone._id.toString(),
    zone_code: zone.zoneCode,
    name: zone.name,
    area: zone.area,
    warehouse_id: zone.warehouseId.toString(),
    description: zone.description,
    status: zone.status,
    created_by: zone.createdBy.toString(),
    created_at: zone.createdAt,
    updated_at: zone.updatedAt
  };
}
