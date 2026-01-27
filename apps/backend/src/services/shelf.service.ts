import Shelf from "../models/Shelf";
import Warehouse from "../models/Warehouse";
import StoredItem from "../models/StoredItem";
import { Types } from "mongoose";

/**
 * DTO for creating a single shelf
 */
export interface CreateShelfItem {
  shelfCode: string;
  tierCount: number;
  width: number;
  depth: number;
  maxCapacity: number;
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
  width: number;
  depth: number;
  max_capacity: number;
  status: "AVAILABLE" | "RENTED" | "MAINTENANCE";
  created_at: Date;
  updated_at: Date;
}

/**
 * Validate warehouse exists
 */
async function validateWarehouseExists(warehouseId: string): Promise<void> {
  if (!Types.ObjectId.isValid(warehouseId)) {
    throw new Error("Invalid warehouse ID");
  }

  const warehouse = await Warehouse.findById(warehouseId);
  if (!warehouse) {
    throw new Error("Warehouse not found");
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

  // Validate width
  if (!item.width || item.width <= 0) {
    throw new Error(`${prefix}Width must be greater than 0`);
  }

  if (typeof item.width !== "number" || isNaN(item.width)) {
    throw new Error(`${prefix}Width must be a valid number`);
  }

  // Validate depth
  if (!item.depth || item.depth <= 0) {
    throw new Error(`${prefix}Depth must be greater than 0`);
  }

  if (typeof item.depth !== "number" || isNaN(item.depth)) {
    throw new Error(`${prefix}Depth must be a valid number`);
  }

  // Validate maxCapacity
  if (!item.maxCapacity || item.maxCapacity <= 0) {
    throw new Error(`${prefix}Max capacity must be greater than 0`);
  }

  if (typeof item.maxCapacity !== "number" || isNaN(item.maxCapacity)) {
    throw new Error(`${prefix}Max capacity must be a valid number`);
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
 * Check if shelf codes already exist in the warehouse
 */
async function validateShelfCodesNotExist(
  warehouseId: string,
  shelfCodes: string[]
): Promise<void> {
  const existingShelves = await Shelf.find({
    warehouseId: new Types.ObjectId(warehouseId),
    shelfCode: { $in: shelfCodes.map(code => code.trim()) }
  });

  if (existingShelves.length > 0) {
    const existingCodes = existingShelves.map(s => s.shelfCode).join(", ");
    throw new Error(
      `Shelf code(s) already exist in this warehouse: ${existingCodes}`
    );
  }
}

/**
 * Create shelves for a warehouse (batch creation with transaction)
 */
export async function createShelves(
  warehouseId: string,
  data: CreateShelfRequest
): Promise<ShelfResponse[]> {
  // Validate warehouse exists
  await validateWarehouseExists(warehouseId);

  // Validate request has shelves
  if (!data.shelves || !Array.isArray(data.shelves) || data.shelves.length === 0) {
    throw new Error("At least one shelf is required");
  }

  // Validate each shelf item
  data.shelves.forEach((item, index) => {
    validateShelfItem(item, index);
  });

  // Validate shelf codes are unique within the request
  validateUniqueShelfCodesInRequest(data.shelves);

  // Prepare shelf codes for duplicate check
  const shelfCodes = data.shelves.map(s => s.shelfCode.trim());

  // Check if any shelf codes already exist in the warehouse
  await validateShelfCodesNotExist(warehouseId, shelfCodes);

  // Use transaction for atomic batch creation
  const session = await Shelf.startSession();
  session.startTransaction();

  try {
    const createdShelves = await Shelf.insertMany(
      data.shelves.map(item => ({
        warehouseId: new Types.ObjectId(warehouseId),
        shelfCode: item.shelfCode.trim(),
        tierCount: item.tierCount,
        width: item.width,
        depth: item.depth,
        maxCapacity: item.maxCapacity,
        status: "AVAILABLE"
      })),
      { session }
    );

    await session.commitTransaction();

    // Map to response DTO
    return createdShelves.map(shelf => ({
      shelf_id: shelf._id.toString(),
      shelf_code: shelf.shelfCode,
      tier_count: shelf.tierCount,
      width: shelf.width,
      depth: shelf.depth,
      max_capacity: shelf.maxCapacity,
      status: shelf.status,
      created_at: shelf.createdAt,
      updated_at: shelf.updatedAt
    }));
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
  const storedItems = await StoredItem.find({ shelfId: shelf._id });
  const currentUtilization = storedItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

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
    utilization_percentage: Math.round(utilizationPercentage * 100) / 100, // Round to 2 decimal places
    status: shelf.status,
    items_count: storedItems.length
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
  return {
    shelf_id: shelf._id.toString(),
    shelf_code: shelf.shelfCode,
    tier_count: shelf.tierCount,
    width: shelf.width,
    depth: shelf.depth,
    max_capacity: shelf.maxCapacity,
    status: shelf.status,
    created_at: shelf.createdAt,
    updated_at: shelf.updatedAt
  };
}
