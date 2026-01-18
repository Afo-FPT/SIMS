import Warehouse from "../models/Warehouse";
import { Types } from "mongoose";

/**
 * DTO for creating a warehouse
 */
export interface CreateWarehouseRequest {
  name: string;
  address: string;
  length: number;
  width: number;
  description?: string;
}

/**
 * DTO for warehouse response
 */
export interface WarehouseResponse {
  warehouse_id: string;
  name: string;
  address: string;
  length: number;
  width: number;
  area: number;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Validate warehouse creation request
 */
function validateCreateWarehouseRequest(data: CreateWarehouseRequest): void {
  // Validate name
  if (!data.name || data.name.trim().length === 0) {
    throw new Error("Warehouse name is required");
  }

  // Validate address
  if (!data.address || data.address.trim().length === 0) {
    throw new Error("Warehouse address is required");
  }

  // Validate length
  if (!data.length || data.length <= 0) {
    throw new Error("Warehouse length must be greater than 0");
  }

  // Validate width
  if (!data.width || data.width <= 0) {
    throw new Error("Warehouse width must be greater than 0");
  }

  // Validate numeric types
  if (typeof data.length !== "number" || isNaN(data.length)) {
    throw new Error("Warehouse length must be a valid number");
  }

  if (typeof data.width !== "number" || isNaN(data.width)) {
    throw new Error("Warehouse width must be a valid number");
  }
}

/**
 * Calculate warehouse area from length and width
 */
function calculateArea(length: number, width: number): number {
  return length * width;
}

/**
 * Check if warehouse name already exists
 */
async function checkWarehouseNameExists(name: string, excludeId?: string): Promise<boolean> {
  const query: any = { name: name.trim() };
  
  if (excludeId) {
    query._id = { $ne: new Types.ObjectId(excludeId) };
  }

  const existingWarehouse = await Warehouse.findOne(query);
  return !!existingWarehouse;
}

/**
 * Create a new warehouse
 */
export async function createWarehouse(
  data: CreateWarehouseRequest,
  createdBy: string
): Promise<WarehouseResponse> {
  // Validate request data
  validateCreateWarehouseRequest(data);

  // Check if warehouse name is unique
  const nameExists = await checkWarehouseNameExists(data.name);
  if (nameExists) {
    throw new Error("Warehouse name already exists");
  }

  // Validate createdBy is a valid ObjectId
  if (!Types.ObjectId.isValid(createdBy)) {
    throw new Error("Invalid creator user ID");
  }

  // Calculate area
  const area = calculateArea(data.length, data.width);

  // Create warehouse
  const warehouse = await Warehouse.create({
    name: data.name.trim(),
    address: data.address.trim(),
    length: data.length,
    width: data.width,
    area: area,
    description: data.description?.trim(),
    status: "ACTIVE",
    createdBy: new Types.ObjectId(createdBy)
  });

  // Populate creator info
  await warehouse.populate("createdBy", "name email role");

  // Return response DTO
  return {
    warehouse_id: warehouse._id.toString(),
    name: warehouse.name,
    address: warehouse.address,
    length: warehouse.length,
    width: warehouse.width,
    area: warehouse.area,
    description: warehouse.description,
    status: warehouse.status,
    created_by: warehouse.createdBy.toString(),
    created_at: warehouse.createdAt,
    updated_at: warehouse.updatedAt
  };
}
