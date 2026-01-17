import { Request, Response } from "express";
import { createWarehouse, CreateWarehouseRequest } from "../services/warehouse.service";

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
