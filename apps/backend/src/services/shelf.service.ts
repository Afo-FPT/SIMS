import Shelf from "../models/Shelf";
import Warehouse from "../models/Warehouse";
import Zone from "../models/Zone";
import StoredItem from "../models/StoredItem";
import Contract from "../models/Contract";
import { Types } from "mongoose";
import { getOrCreateSpaceLimits } from "./system-setting.service";

/**
 * DTO for creating a single shelf
 */
export interface CreateShelfItem {
  shelfCode: string;
  tierCount: number;
  tierDimensions: Array<{
    height: number;
    width: number;
    depth: number;
  }>;
}

/**
 * DTO for batch shelf creation request
 */
export interface CreateShelfRequest {
  shelves: CreateShelfItem[];
}

/**
 * DTO for shelf response
 */
export interface ShelfResponse {
  shelf_id: string;
  shelf_code: string;
  tier_count: number;
  tier_dimensions: Array<{
    height: number;
    width: number;
    depth: number;
  }>;
  width: number;
  depth: number;
  max_capacity: number;
  status: "AVAILABLE" | "RENTED" | "MAINTENANCE";
  created_at: Date;
  updated_at: Date;
}

export interface ShelfViewDTO {
  shelf_id: string;
  shelf_code: string;
  zone_id: string;
  zone_code?: string;
  status: "AVAILABLE" | "RENTED" | "MAINTENANCE";
}

export interface WarehouseShelfViewDTO extends ShelfViewDTO {
  warehouse_id: string;
  contract_id?: string;
  contract_code?: string;
  tier_count: number;
  tier_dimensions: Array<{
    height: number;
    width: number;
    depth: number;
  }>;
  width: number;
  depth: number;
  max_capacity: number;
}

export async function listShelvesByWarehouse(
  warehouseId: string
): Promise<WarehouseShelfViewDTO[]> {
  if (!Types.ObjectId.isValid(warehouseId)) throw new Error("Invalid warehouse ID");

  // Ensure warehouse exists
  const wh = await Warehouse.findById(warehouseId).select("_id");
  if (!wh) throw new Error("Warehouse not found");

  const zones = await Zone.find({ warehouseId: new Types.ObjectId(warehouseId) })
    .select("_id zoneCode")
    .lean();
  if (zones.length === 0) return [];

  const zoneIds = zones.map((z: any) => z._id);
  const zoneCodeById = new Map(zones.map((z: any) => [z._id.toString(), z.zoneCode]));

  const shelves = await Shelf.find({ zoneId: { $in: zoneIds } })
    .select("_id shelfCode status zoneId tierCount tierDimensions width depth maxCapacity")
    .sort({ shelfCode: 1 })
    .lean();

  // Determine "current" active contract for each zone (if any) at now
  const now = new Date();
  const activeContracts = await Contract.find({
    status: "active",
    rentedZones: {
      $elemMatch: {
        zoneId: { $in: zoneIds },
        startDate: { $lte: now },
        endDate: { $gte: now }
      }
    }
  })
    .select("_id contractCode rentedZones")
    .lean();

  const contractByZoneId = new Map<string, { contract_id: string; contract_code: string }>();
  for (const c of activeContracts as any[]) {
    for (const rz of c.rentedZones || []) {
      const zid = rz.zoneId?.toString?.() ?? rz.zoneId;
      if (!zid) continue;
      // Only map zones that match and are active "now"
      const start = new Date(rz.startDate);
      const end = new Date(rz.endDate);
      if (start <= now && now <= end) {
        contractByZoneId.set(String(zid), {
          contract_id: c._id.toString(),
          contract_code: c.contractCode
        });
      }
    }
  }

  return shelves.map((s: any) => {
    const zid = s.zoneId?.toString?.() ?? s.zoneId;
    const assigned = zid ? contractByZoneId.get(String(zid)) : undefined;
    return {
      warehouse_id: warehouseId,
      shelf_id: s._id.toString(),
      shelf_code: s.shelfCode,
      zone_id: zid?.toString?.() ?? String(zid),
      zone_code: zid ? zoneCodeById.get(String(zid)) : undefined,
      status: s.status,
      contract_id: assigned?.contract_id,
      contract_code: assigned?.contract_code,
      tier_count: s.tierCount,
      tier_dimensions: (s.tierDimensions || []).map((t: any) => ({
        height: t.height,
        width: t.width,
        depth: t.depth,
      })),
      width: s.width,
      depth: s.depth,
      max_capacity: s.maxCapacity,
    } satisfies WarehouseShelfViewDTO;
  });
}

export interface UpdateShelfInfoRequest {
  shelfCode: string;
  tierCount: number;
  tierDimensions: Array<{
    height: number;
    width: number;
    depth: number;
  }>;
  status?: "AVAILABLE" | "RENTED" | "MAINTENANCE";
}

export async function listAvailableShelvesByZone(
  zoneId: string
): Promise<ShelfViewDTO[]> {
  if (!Types.ObjectId.isValid(zoneId)) {
    throw new Error("Invalid zone ID");
  }
  const zone = await Zone.findById(zoneId).select("_id zoneCode warehouseId status");
  if (!zone) {
    throw new Error("Zone not found");
  }
  const shelves = await Shelf.find({
    zoneId: zone._id,
    status: "AVAILABLE"
  })
    .select("_id shelfCode status zoneId")
    .sort({ shelfCode: 1 })
    .lean();

  return shelves.map((s: any) => ({
    shelf_id: s._id.toString(),
    shelf_code: s.shelfCode,
    zone_id: zone._id.toString(),
    zone_code: zone.zoneCode,
    status: s.status
  }));
}

export async function listShelvesForContract(
  contractId: string,
  userId: string,
  userRole: string
): Promise<ShelfViewDTO[]> {
  if (!Types.ObjectId.isValid(contractId)) throw new Error("Invalid contract ID");
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID");

  const contract = await Contract.findById(contractId).select("customerId rentedZones");
  if (!contract) throw new Error("Contract not found");

  if (userRole === "customer" && contract.customerId.toString() !== userId) {
    throw new Error("Access denied. You can only view your own contract shelves.");
  }

  const zoneIds = (contract.rentedZones || []).map((rz: any) => rz.zoneId);
  if (zoneIds.length === 0) return [];

  const shelves = await Shelf.find({ zoneId: { $in: zoneIds } })
    .populate("zoneId", "zoneCode")
    .select("_id shelfCode status zoneId")
    .sort({ shelfCode: 1 })
    .lean();

  return shelves.map((s: any) => ({
    shelf_id: s._id.toString(),
    shelf_code: s.shelfCode,
    zone_id: s.zoneId?._id?.toString?.() ?? s.zoneId.toString(),
    zone_code: s.zoneId?.zoneCode,
    status: s.status
  }));
}

async function validateWarehouseExists(warehouseId: string): Promise<void> {
  if (!Types.ObjectId.isValid(warehouseId)) {
    throw new Error("Invalid warehouse ID");
  }
  const warehouse = await Warehouse.findById(warehouseId);
  if (!warehouse) {
    throw new Error("Warehouse not found");
  }
}

async function validateZoneExists(zoneId: string, warehouseId: string): Promise<void> {
  if (!Types.ObjectId.isValid(zoneId)) {
    throw new Error("Invalid zone ID");
  }
  const zone = await Zone.findById(zoneId);
  if (!zone) {
    throw new Error("Zone not found");
  }
  if (zone.warehouseId.toString() !== warehouseId) {
    throw new Error("Zone does not belong to this warehouse");
  }
}

function getShelfFootprintArea(item: CreateShelfItem): number {
  if (!Array.isArray(item.tierDimensions) || item.tierDimensions.length === 0) return 0;
  const first = item.tierDimensions[0];
  return Number(first.width) * Number(first.depth);
}

async function validateShelfAreaLimitInZone(zoneId: string, incomingArea: number, excludeShelfId?: string): Promise<void> {
  const zone = await Zone.findById(zoneId).select("area");
  if (!zone) {
    throw new Error("Zone not found");
  }
  const limits = await getOrCreateSpaceLimits();
  const maxAllowed = (zone.area * limits.shelf_area_percent_of_zone) / 100;

  const match: any = { zoneId: new Types.ObjectId(zoneId) };
  if (excludeShelfId && Types.ObjectId.isValid(excludeShelfId)) {
    match._id = { $ne: new Types.ObjectId(excludeShelfId) };
  }
  const rows = await Shelf.aggregate([
    { $match: match },
    { $project: { footprint: { $multiply: ["$width", "$depth"] } } },
    { $group: { _id: null, total: { $sum: "$footprint" } } }
  ]);
  const used = rows?.[0]?.total ?? 0;
  const nextTotal = used + incomingArea;
  if (nextTotal > maxAllowed) {
    throw new Error(
      `Shelf area exceeds limit: max ${maxAllowed.toFixed(2)} m2 (${limits.shelf_area_percent_of_zone}% zone), current ${used.toFixed(2)} m2, requested ${incomingArea.toFixed(2)} m2`
    );
  }
}

/**
 * Validate a single shelf item
 */
function validateShelfItem(item: CreateShelfItem, index?: number): void {
  const prefix = index !== undefined ? `Shelf ${index + 1}: ` : "";

  // Validate shelfCode
  if (!item.shelfCode || item.shelfCode.trim().length === 0) {
    throw new Error(`${prefix}Shelf code is required`);
  }

  // Validate tierCount
  if (!item.tierCount || item.tierCount <= 0) {
    throw new Error(`${prefix}Tier count must be greater than 0`);
  }

  if (typeof item.tierCount !== "number" || isNaN(item.tierCount)) {
    throw new Error(`${prefix}Tier count must be a valid number`);
  }

  if (!Array.isArray(item.tierDimensions) || item.tierDimensions.length === 0) {
    throw new Error(`${prefix}tierDimensions is required and must not be empty`);
  }
  if (item.tierDimensions.length !== item.tierCount) {
    throw new Error(`${prefix}tierDimensions length must equal tierCount`);
  }

  item.tierDimensions.forEach((tier, tierIdx) => {
    if (typeof tier.height !== "number" || isNaN(tier.height) || tier.height <= 0) {
      throw new Error(`${prefix}tierDimensions[${tierIdx}].height must be a valid number > 0`);
    }
    if (typeof tier.width !== "number" || isNaN(tier.width) || tier.width <= 0) {
      throw new Error(`${prefix}tierDimensions[${tierIdx}].width must be a valid number > 0`);
    }
    if (typeof tier.depth !== "number" || isNaN(tier.depth) || tier.depth <= 0) {
      throw new Error(`${prefix}tierDimensions[${tierIdx}].depth must be a valid number > 0`);
    }
  });
}

function calculateShelfMaxCapacity(
  tierDimensions: Array<{ height: number; width: number; depth: number }>
): number {
  const total = tierDimensions.reduce((sum, tier) => sum + tier.height * tier.width * tier.depth, 0);
  return Math.round(total * 1_000_000) / 1_000_000;
}

function normalizeTierDimensions(
  tierDimensions: Array<{ height: number; width: number; depth: number }>
): Array<{ height: number; width: number; depth: number }> {
  return tierDimensions.map((tier) => ({
    height: Number(tier.height),
    width: Number(tier.width),
    depth: Number(tier.depth)
  }));
}

function getRepresentativeWidthDepth(
  tierDimensions: Array<{ height: number; width: number; depth: number }>
): { width: number; depth: number } {
  if (tierDimensions.length === 0) return { width: 0, depth: 0 };
  return {
    width: tierDimensions[0].width,
    depth: tierDimensions[0].depth
  };
}

async function calculateCurrentShelfUsedVolume(
  shelfId: Types.ObjectId
): Promise<number> {
  const rows = await StoredItem.aggregate([
    { $match: { shelfId } },
    {
      $project: {
        lineVolume: {
          $multiply: ["$quantity", { $ifNull: ["$volumePerUnitM3", 0] }]
        }
      }
    },
    { $group: { _id: null, total: { $sum: "$lineVolume" } } }
  ]);

  return rows?.[0]?.total ?? 0;
}

async function countStoredRowsByShelf(shelfId: Types.ObjectId): Promise<number> {
  return StoredItem.countDocuments({ shelfId });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function mapShelfResponse(shelf: any): ShelfResponse {
  const dimensions = (shelf.tierDimensions || []).map((tier: any) => ({
    height: tier.height,
    width: tier.width,
    depth: tier.depth
  }));
  return {
    shelf_id: shelf._id.toString(),
    shelf_code: shelf.shelfCode,
    tier_count: shelf.tierCount,
    tier_dimensions: dimensions,
    width: shelf.width,
    depth: shelf.depth,
    max_capacity: shelf.maxCapacity,
    status: shelf.status,
    created_at: shelf.createdAt,
    updated_at: shelf.updatedAt
  }
}

/**
 * Check if shelf codes are unique within the request
 */
function validateUniqueShelfCodesInRequest(shelves: CreateShelfItem[]): void {
  const codes = shelves.map(s => s.shelfCode.trim().toUpperCase());
  const uniqueCodes = new Set(codes);

  if (codes.length !== uniqueCodes.size) {
    throw new Error("Duplicate shelf codes found in the request. Each shelf code must be unique.");
  }
}

/**
 * Check if shelf codes already exist in the zone
 */
async function validateShelfCodesNotExist(
  zoneId: string,
  shelfCodes: string[]
): Promise<void> {
  const existingShelves = await Shelf.find({
    zoneId: new Types.ObjectId(zoneId),
    shelfCode: { $in: shelfCodes.map(code => code.trim()) }
  });

  if (existingShelves.length > 0) {
    const existingCodes = existingShelves.map(s => s.shelfCode).join(", ");
    throw new Error(
      `Shelf code(s) already exist in this zone: ${existingCodes}`
    );
  }
}

/**
 * Create shelves in a zone (batch creation with transaction)
 */
export async function createShelves(
  warehouseId: string,
  zoneId: string,
  data: CreateShelfRequest
): Promise<ShelfResponse[]> {
  await validateWarehouseExists(warehouseId);
  await validateZoneExists(zoneId, warehouseId);

  if (!data.shelves || !Array.isArray(data.shelves) || data.shelves.length === 0) {
    throw new Error("At least one shelf is required");
  }

  data.shelves.forEach((item, index) => {
    validateShelfItem(item, index);
  });
  const incomingArea = data.shelves.reduce((sum, item) => sum + getShelfFootprintArea(item), 0);
  await validateShelfAreaLimitInZone(zoneId, incomingArea);
  validateUniqueShelfCodesInRequest(data.shelves);
  const shelfCodes = data.shelves.map(s => s.shelfCode.trim());
  await validateShelfCodesNotExist(zoneId, shelfCodes);

  const session = await Shelf.startSession();
  session.startTransaction();

  try {
    const createdShelves = await Shelf.insertMany(
      data.shelves.map(item => ({
        ...(() => {
          const normalizedTierDimensions = normalizeTierDimensions(item.tierDimensions);
          const { width, depth } = getRepresentativeWidthDepth(normalizedTierDimensions);
          const maxCapacity = calculateShelfMaxCapacity(normalizedTierDimensions);
          return {
            tierDimensions: normalizedTierDimensions,
            width,
            depth,
            maxCapacity
          };
        })(),
        warehouseId: new Types.ObjectId(warehouseId),
        zoneId: new Types.ObjectId(zoneId),
        shelfCode: item.shelfCode.trim(),
        tierCount: item.tierCount,
        status: "AVAILABLE"
      })),
      { session }
    );

    await session.commitTransaction();

    // Map to response DTO
    return createdShelves.map((shelf) => mapShelfResponse(shelf));
  } catch (error: any) {
    await session.abortTransaction();

    // Handle duplicate key error (in case of race condition)
    if (error.code === 11000) {
      throw new Error(
        "Duplicate shelf code detected. Please ensure all shelf codes are unique within the warehouse."
      );
    }

    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * DTO for rack utilization response
 */
export interface RackUtilizationResponse {
  shelf_id: string;
  shelf_code: string;
  warehouse_id: string;
  max_capacity: number;
  current_utilization: number;
  utilization_percentage: number;
  status: "AVAILABLE" | "RENTED" | "MAINTENANCE";
  items_count: number;
}

/**
 * Get rack utilization by shelf ID
 */
export async function getRackUtilization(
  shelfId: string
): Promise<RackUtilizationResponse> {
  // Validate shelf ID
  if (!Types.ObjectId.isValid(shelfId)) {
    throw new Error("Invalid shelf ID");
  }

  // Find shelf
  const shelf = await Shelf.findById(shelfId).populate("warehouseId", "name");
  if (!shelf) {
    throw new Error("Shelf not found");
  }

  // Calculate current utilization from StoredItem
  const currentUtilization = await calculateCurrentShelfUsedVolume(shelf._id);
  const itemsCount = await countStoredRowsByShelf(shelf._id);

  // Calculate utilization percentage
  const utilizationPercentage =
    shelf.maxCapacity > 0
      ? Math.min(100, (currentUtilization / shelf.maxCapacity) * 100)
      : 0;

  return {
    shelf_id: shelf._id.toString(),
    shelf_code: shelf.shelfCode,
    warehouse_id: shelf.warehouseId.toString(),
    max_capacity: shelf.maxCapacity,
    current_utilization: currentUtilization,
    utilization_percentage: round2(utilizationPercentage),
    status: shelf.status,
    items_count: itemsCount
  };
}

/**
 * Update rack (shelf) status
 */
export async function updateRackStatus(
  shelfId: string,
  status: "AVAILABLE" | "RENTED" | "MAINTENANCE"
): Promise<ShelfResponse> {
  // Validate shelf ID
  if (!Types.ObjectId.isValid(shelfId)) {
    throw new Error("Invalid shelf ID");
  }

  // Validate status
  if (
    status !== "AVAILABLE" &&
    status !== "RENTED" &&
    status !== "MAINTENANCE"
  ) {
    throw new Error("Status must be AVAILABLE, RENTED, or MAINTENANCE");
  }

  // Find and update shelf
  const shelf = await Shelf.findByIdAndUpdate(
    shelfId,
    { status },
    { new: true, runValidators: true }
  );

  if (!shelf) {
    throw new Error("Shelf not found");
  }

  // Return response DTO
  return mapShelfResponse(shelf);
}

/**
 * Update shelf metadata (shelfCode + tier dimensions + derived capacity).
 * Authorization: Manager only (enforced in route/middleware).
 */
export async function updateShelfInfo(
  shelfId: string,
  payload: UpdateShelfInfoRequest
): Promise<ShelfResponse> {
  // Validate shelf ID
  if (!Types.ObjectId.isValid(shelfId)) {
    throw new Error("Invalid shelf ID");
  }

  const nextShelfCode = payload.shelfCode?.trim();
  if (!nextShelfCode) {
    throw new Error("shelfCode is required");
  }

  if (!payload.tierCount || typeof payload.tierCount !== "number" || isNaN(payload.tierCount) || payload.tierCount < 1) {
    throw new Error("tierCount must be a valid number >= 1");
  }

  if (!Array.isArray(payload.tierDimensions) || payload.tierDimensions.length === 0) {
    throw new Error("tierDimensions is required and must not be empty");
  }
  if (payload.tierDimensions.length !== payload.tierCount) {
    throw new Error("tierDimensions length must equal tierCount");
  }

  // Validate tierDimensions using existing validator
  validateShelfItem({
    shelfCode: nextShelfCode,
    tierCount: payload.tierCount,
    tierDimensions: payload.tierDimensions,
  });

  // Find shelf
  const shelf = await Shelf.findById(shelfId);
  if (!shelf) {
    throw new Error("Shelf not found");
  }

  // Unique shelf code within the same zone (exclude current shelf)
  const duplicated = await Shelf.findOne({
    zoneId: shelf.zoneId,
    shelfCode: nextShelfCode,
    _id: { $ne: shelf._id },
  });
  if (duplicated) {
    throw new Error("Shelf code already exists in this zone");
  }

  const normalizedTierDimensions = normalizeTierDimensions(payload.tierDimensions);
  const { width, depth } = getRepresentativeWidthDepth(normalizedTierDimensions);
  const maxCapacity = calculateShelfMaxCapacity(normalizedTierDimensions);
  await validateShelfAreaLimitInZone(shelf.zoneId.toString(), width * depth, shelfId);

  shelf.shelfCode = nextShelfCode;
  shelf.tierCount = payload.tierCount;
  shelf.tierDimensions = normalizedTierDimensions;
  shelf.width = width;
  shelf.depth = depth;
  shelf.maxCapacity = maxCapacity;

  if (payload.status) {
    shelf.status = payload.status;
  }

  await shelf.save();
  return mapShelfResponse(shelf);
}
