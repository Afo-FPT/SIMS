import { Request, Response } from "express";
import {
  createShelves,
  CreateShelfRequest,
  getRackUtilization,
  updateRackStatus
} from "../services/shelf.service";

/**
 * Create shelves for a warehouse
 * Only users with role "manager" can access this endpoint
 * 
 * POST /api/warehouses/:warehouseId/shelves
 */
export async function createShelvesController(req: Request, res: Response) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Extract warehouseId from URL params
    const { warehouseId } = req.params;

    // Extract request data
    const { shelves } = req.body;

    // Validate request structure
    if (!shelves || !Array.isArray(shelves)) {
      return res.status(400).json({
        message: "Request body must contain 'shelves' array"
      });
    }

    // Prepare DTO
    const createRequest: CreateShelfRequest = {
      shelves: shelves.map((item: any) => ({
        shelfCode: item.shelfCode,
        tierCount: Number(item.tierCount),
        width: Number(item.width),
        depth: Number(item.depth),
        maxCapacity: Number(item.maxCapacity)
      }))
    };

    // Create shelves using service
    const createdShelves = await createShelves(warehouseId, createRequest);

    // Return success response
    res.status(201).json({
      message: `${createdShelves.length} shelf(s) created successfully`,
      data: createdShelves
    });
  } catch (error: any) {
    // Handle validation errors
    if (
      error.message.includes("required") ||
      error.message.includes("must be") ||
      error.message.includes("not found") ||
      error.message.includes("already exist") ||
      error.message.includes("Duplicate") ||
      error.message.includes("Invalid")
    ) {
      return res.status(400).json({ message: error.message });
    }

    // Handle other errors
    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

/**
 * Get rack utilization by shelf ID
 * Authorization: Manager, Staff, Admin
 */
export async function getRackUtilizationController(
  req: Request,
  res: Response
) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Extract shelf ID from URL params
    const { id } = req.params;

    // Get rack utilization
    const utilization = await getRackUtilization(id);

    // Return success response
    res.json({
      message: "Rack utilization retrieved successfully",
      data: utilization
    });
  } catch (error: any) {
    // Handle validation errors
    if (
      error.message.includes("Invalid") ||
      error.message.includes("not found")
    ) {
      return res.status(400).json({ message: error.message });
    }

    // Handle other errors
    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

/**
 * Update rack (shelf) status
 * Authorization: Manager only
 */
export async function updateRackStatusController(
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
    if (
      !status ||
      (status !== "AVAILABLE" && status !== "RENTED" && status !== "MAINTENANCE")
    ) {
      return res.status(400).json({
        message: "Status is required and must be AVAILABLE, RENTED, or MAINTENANCE"
      });
    }

    // Update rack status
    const shelf = await updateRackStatus(id, status);

    // Return success response
    res.json({
      message: "Rack status updated successfully",
      data: shelf
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
