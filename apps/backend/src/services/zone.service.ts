import Zone from "../models/Zone";
import Warehouse from "../models/Warehouse";
import Contract from "../models/Contract";
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

export type ZoneRentalStatus = "AVAILABLE" | "RENTED";

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
  /** Occupied by an active / pending_payment contract for the current calendar day */
  rental_status: ZoneRentalStatus;
  /** ISO date when current lease ends (latest end if multiple rows) */
  lease_end_date?: string;
  /** Whole days from today until lease_end_date (only set when rented) */
  days_until_available?: number;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isInclusiveInLeasePeriod(start: Date, end: Date, now: Date): boolean {
  const t = startOfDay(now).getTime();
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  return t >= s && t <= e;
}

function wholeDaysFromTodayToEnd(end: Date): number {
  const diff = startOfDay(end).getTime() - startOfDay(new Date()).getTime();
  return Math.round(diff / 86400000);
}

/**
 * Map zoneId -> latest lease end among overlapping active/pending_payment contracts.
 */
async function getZoneLeaseEndsByWarehouse(
  warehouseId: string
): Promise<Map<string, Date>> {
  const contracts = await Contract.find({
    warehouseId: new Types.ObjectId(warehouseId),
    status: { $in: ["active", "pending_payment"] }
  })
    .select("rentedZones")
    .lean();

  const now = new Date();
  const map = new Map<string, Date>();

  for (const c of contracts) {
    const rows = (c as any).rentedZones as { zoneId: Types.ObjectId; startDate: Date; endDate: Date }[] | undefined;
    if (!rows?.length) continue;
    for (const rz of rows) {
      if (!rz.zoneId || !rz.startDate || !rz.endDate) continue;
      const start = new Date(rz.startDate);
      const end = new Date(rz.endDate);
      if (!isInclusiveInLeasePeriod(start, end, now)) continue;
      const zid = rz.zoneId.toString();
      const prev = map.get(zid);
      if (!prev || end.getTime() > prev.getTime()) {
        map.set(zid, end);
      }
    }
  }
  return map;
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
    updated_at: zone.updatedAt,
    rental_status: "AVAILABLE"
  };
}

function mapZoneLeanToResponse(z: any, leaseEnds: Map<string, Date>): ZoneResponse {
  const zid = z._id.toString();
  const leaseEnd = leaseEnds.get(zid);
  const rented = Boolean(leaseEnd);
  let daysUntil: number | undefined;
  if (leaseEnd) {
    daysUntil = wholeDaysFromTodayToEnd(leaseEnd);
    if (daysUntil < 0) daysUntil = 0;
  }
  return {
    zone_id: zid,
    zone_code: z.zoneCode,
    name: z.name,
    area: z.area,
    warehouse_id: z.warehouseId.toString(),
    description: z.description,
    status: z.status,
    created_by: z.createdBy.toString(),
    created_at: z.createdAt,
    updated_at: z.updatedAt,
    rental_status: rented ? "RENTED" : "AVAILABLE",
    ...(rented && leaseEnd
      ? {
          lease_end_date: leaseEnd.toISOString(),
          days_until_available: daysUntil
        }
      : {})
  };
}

export async function listZonesByWarehouse(warehouseId: string): Promise<ZoneResponse[]> {
  await validateWarehouse(warehouseId);

  const zones = await Zone.find({ warehouseId: new Types.ObjectId(warehouseId) })
    .sort({ zoneCode: 1 })
    .lean();

  const leaseEnds = await getZoneLeaseEndsByWarehouse(warehouseId);

  return zones.map((z: any) => mapZoneLeanToResponse(z, leaseEnds));
}

export async function getZoneById(zoneId: string): Promise<ZoneResponse | null> {
  if (!Types.ObjectId.isValid(zoneId)) {
    return null;
  }
  const zone = await Zone.findById(zoneId).lean();
  if (!zone) return null;
  const z = zone as any;
  const wid = z.warehouseId.toString();
  const leaseEnds = await getZoneLeaseEndsByWarehouse(wid);
  return mapZoneLeanToResponse(z, leaseEnds);
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

  const leaseEnds = await getZoneLeaseEndsByWarehouse(warehouseId);
  const z = await Zone.findById(zone._id).lean();
  if (!z) throw new Error("Zone not found");
  return mapZoneLeanToResponse(z as any, leaseEnds);
}
