import { Request, Response } from "express";
import {
  createWarehouse,
  CreateWarehouseRequest,
  searchAndFilterWarehouses,
  SearchFilterWarehouseParams,
  updateWarehouseStatus
} from "../services/warehouse.service";

/**
 * Create a new warehouse
 * Only users with role "manager" can access this endpoint
 */
export async function createWarehouseController(req: Request, res: Response) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Extract request data
    const { name, address, length, width, description } = req.body;

    // Prepare DTO
    const createRequest: CreateWarehouseRequest = {
      name,
      address,
      length: Number(length),
      width: Number(width),
      description
    };

    // Get creator user ID from authenticated user
    const createdBy = req.user.userId;

    // Create warehouse using service
    const warehouse = await createWarehouse(createRequest, createdBy);

    // Return success response
    res.status(201).json({
      message: "Warehouse created successfully",
      data: warehouse
    });
  } catch (error: any) {
    // Handle validation errors
    if (error.message.includes("required") || 
        error.message.includes("must be") || 
        error.message.includes("already exists")) {
      return res.status(400).json({ message: error.message });
    }

    // Handle other errors
    res.status(500).json({ 
      message: error.message || "Internal server error" 
    });
  }
}

/**
 * Search and filter warehouses
 * Authorization: Manager, Staff, Admin
 */
export async function searchAndFilterWarehousesController(
  req: Request,
  res: Response
) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Extract query parameters
    const { search, status, page, limit } = req.query;

    // Prepare DTO
    const params: SearchFilterWarehouseParams = {
      search: search as string,
      status: status as "ACTIVE" | "INACTIVE" | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    };

    // Search and filter warehouses
    const result = await searchAndFilterWarehouses(params);

    // Return success response
    res.json({
      message: "Warehouses retrieved successfully",
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

/**
 * Update warehouse status
 * Authorization: Manager only
 */
export async function updateWarehouseStatusController(
  req: Request,
  res: Response
) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Extract parameters
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!status || (status !== "ACTIVE" && status !== "INACTIVE")) {
      return res.status(400).json({
        message: "Status is required and must be either ACTIVE or INACTIVE"
      });
    }

    // Update warehouse status
    const warehouse = await updateWarehouseStatus(id, status);

    // Return success response
    res.json({
      message: "Warehouse status updated successfully",
      data: warehouse
    });
  } catch (error: any) {
    // Handle validation errors
    if (
      error.message.includes("Invalid") ||
      error.message.includes("not found") ||
      error.message.includes("must be")
    ) {
      return res.status(400).json({ message: error.message });
    }

    // Handle other errors
    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}
