import { Request, Response } from "express";
import {
  createShelves,
  CreateShelfRequest,
  getRackUtilization,
  updateRackStatus,
  updateShelfInfo,
  type UpdateShelfInfoRequest,
  listShelvesForContract,
  listShelvesByWarehouse
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

    const { warehouseId } = req.params;
    const { zoneId, shelves } = req.body;

    if (!zoneId) {
      return res.status(400).json({
        message: "zoneId is required (zone where shelves will be created)"
      });
    }
    if (!shelves || !Array.isArray(shelves)) {
      return res.status(400).json({
        message: "Request body must contain 'shelves' array"
      });
    }

    const createRequest: CreateShelfRequest = {
      shelves: shelves.map((item: any) => ({
        shelfCode: item.shelfCode,
        tierCount: Number(item.tierCount),
        tierDimensions: Array.isArray(item.tierDimensions) && item.tierDimensions.length > 0
          ? item.tierDimensions.map((tier: any) => ({
              height: Number(tier.height),
              width: Number(tier.width),
              depth: Number(tier.depth)
            }))
          : Array.from({ length: Number(item.tierCount) }, () => ({
              height: Number(item.tierHeight ?? item.heightPerTier ?? item.height),
              width: Number(item.width),
              depth: Number(item.depth)
            }))
      }))
    };

    const createdShelves = await createShelves(warehouseId, zoneId, createRequest);

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

/**
 * Update shelf metadata (shelfCode + tier dimensions + optionally status)
 * Authorization: Manager only
 */
export async function updateShelfInfoController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { shelfCode, tierCount, tierDimensions, status } = req.body;

    const payload: UpdateShelfInfoRequest = {
      shelfCode,
      tierCount: Number(tierCount),
      tierDimensions: Array.isArray(tierDimensions) ? tierDimensions : [],
      status,
    } as any;

    if (!payload.shelfCode || !payload.tierCount || !payload.tierDimensions.length) {
      return res.status(400).json({
        message: "shelfCode, tierCount, and tierDimensions are required",
      });
    }

    const shelf = await updateShelfInfo(String(id), payload);

    return res.json({
      message: "Shelf updated successfully",
      data: shelf,
    });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";
    if (msg.includes("Invalid") || msg.includes("required") || msg.includes("already exists") || msg.includes("not found") || msg.includes("must be")) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: msg });
  }
}

/**
 * GET /api/contracts/:contractId/shelves
 * List shelves inside zones rented by a contract
 * Authorization: Customer (own), Manager, Staff
 */
export async function listContractShelvesController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { contractId } = req.params;
    const data = await listShelvesForContract(contractId, req.user.userId, req.user.role);
    return res.json({ message: "Contract shelves retrieved successfully", data });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";
    if (msg.includes("Invalid") || msg.includes("not found") || msg.includes("Access denied")) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: msg });
  }
}

/**
 * GET /api/warehouses/:warehouseId/shelves
 * List shelves in a warehouse (via zones)
 * Authorization: Manager, Staff, Admin
 */
export async function listShelvesByWarehouseController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { warehouseId } = req.params;
    const data = await listShelvesByWarehouse(warehouseId);
    return res.json({ message: "Warehouse shelves retrieved successfully", data });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";
    if (msg.includes("Invalid") || msg.includes("not found")) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: msg });
  }
}
