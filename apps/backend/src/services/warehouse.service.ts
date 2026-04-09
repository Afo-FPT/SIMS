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

export interface UpdateWarehouseRequest {
  name?: string;
  address?: string;
  length?: number;
  width?: number;
  description?: string;
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

function validateUpdateWarehouseRequest(data: UpdateWarehouseRequest): void {
  if (data.name !== undefined && data.name.trim().length === 0) {
    throw new Error("Warehouse name is required");
  }
  if (data.address !== undefined && data.address.trim().length === 0) {
    throw new Error("Warehouse address is required");
  }
  if (data.length !== undefined) {
    if (data.length <= 0 || typeof data.length !== "number" || isNaN(data.length)) {
      throw new Error("Warehouse length must be a valid number greater than 0");
    }
  }
  if (data.width !== undefined) {
    if (data.width <= 0 || typeof data.width !== "number" || isNaN(data.width)) {
      throw new Error("Warehouse width must be a valid number greater than 0");
    }
  }
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
    status: "INACTIVE",
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

/**
 * DTO for search and filter parameters
 */
export interface SearchFilterWarehouseParams {
  search?: string;
  status?: "ACTIVE" | "INACTIVE";
  page?: number;
  limit?: number;
}

/**
 * DTO for paginated warehouse response
 */
export interface PaginatedWarehouseResponse {
  warehouses: WarehouseResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Search and filter warehouses
 */
export async function searchAndFilterWarehouses(
  params: SearchFilterWarehouseParams
): Promise<PaginatedWarehouseResponse> {
  const { search, status, page = 1, limit = 10 } = params;

  // Build query
  const query: any = {};

  // Search by name or address
  if (search && search.trim().length > 0) {
    query.$or = [
      { name: { $regex: search.trim(), $options: "i" } },
      { address: { $regex: search.trim(), $options: "i" } }
    ];
  }

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Validate pagination
  const pageNumber = Math.max(1, Number(page) || 1);
  const limitNumber = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (pageNumber - 1) * limitNumber;

  // Execute query with pagination
  const [warehouses, total] = await Promise.all([
    Warehouse.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),
    Warehouse.countDocuments(query)
  ]);

  // Map to response DTO
  const warehousesResponse: WarehouseResponse[] = warehouses.map((warehouse) => ({
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
  }));

  return {
    warehouses: warehousesResponse,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber)
    }
  };
}

/**
 * Update warehouse status
 */
export async function updateWarehouseStatus(
  warehouseId: string,
  status: "ACTIVE" | "INACTIVE"
): Promise<WarehouseResponse> {
  // Validate warehouse ID
  if (!Types.ObjectId.isValid(warehouseId)) {
    throw new Error("Invalid warehouse ID");
  }

  // Validate status
  if (status !== "ACTIVE" && status !== "INACTIVE") {
    throw new Error("Status must be either ACTIVE or INACTIVE");
  }

  // Find and update warehouse
  const warehouse = await Warehouse.findByIdAndUpdate(
    warehouseId,
    { status },
    { new: true, runValidators: true }
  ).populate("createdBy", "name email");

  if (!warehouse) {
    throw new Error("Warehouse not found");
  }

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

/**
 * Update warehouse information (name, address, dimensions, description)
 */
export async function updateWarehouseInfo(
  warehouseId: string,
  data: UpdateWarehouseRequest
): Promise<WarehouseResponse> {
  if (!Types.ObjectId.isValid(warehouseId)) {
    throw new Error("Invalid warehouse ID");
  }

  // Ensure there is at least one field to update
  if (
    data.name === undefined &&
    data.address === undefined &&
    data.length === undefined &&
    data.width === undefined &&
    data.description === undefined
  ) {
    throw new Error("No fields provided for update");
  }

  validateUpdateWarehouseRequest(data);

  const warehouse = await Warehouse.findById(warehouseId);
  if (!warehouse) {
    throw new Error("Warehouse not found");
  }

  // Check unique name if changed
  if (data.name && data.name.trim() !== warehouse.name) {
    const nameExists = await checkWarehouseNameExists(data.name, warehouseId);
    if (nameExists) {
      throw new Error("Warehouse name already exists");
    }
    warehouse.name = data.name.trim();
  }

  if (data.address !== undefined) {
    warehouse.address = data.address.trim();
  }
  if (data.length !== undefined) {
    warehouse.length = data.length;
  }
  if (data.width !== undefined) {
    warehouse.width = data.width;
  }
  if (data.description !== undefined) {
    warehouse.description = data.description.trim();
  }

  // Recalculate area if dimensions changed
  warehouse.area = calculateArea(warehouse.length, warehouse.width);

  await warehouse.save();
  await warehouse.populate("createdBy", "name email");

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
