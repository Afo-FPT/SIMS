import { Request, Response } from "express";
import {
  createContract,
  createDraftContractFromRequest,
  getContracts,
  getContractById,
  updateContractStatus,
  CreateContractRequest,
  RequestDraftContractRequest
} from "../services/contract.service";

/**
 * Create a new contract
 * POST /api/contracts
 * Authorization: Manager only
 */
export async function createContractController(req: Request, res: Response) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Extract request data
    const { customerId, warehouseId, rentedZones } = req.body;

    if (!customerId || !warehouseId || !rentedZones) {
      return res.status(400).json({
        message: "Missing required fields: customerId, warehouseId, rentedZones"
      });
    }

    if (!Array.isArray(rentedZones) || rentedZones.length === 0) {
      return res.status(400).json({
        message: "rentedZones must be a non-empty array"
      });
    }

    const createRequest: CreateContractRequest = {
      customerId,
      warehouseId,
      rentedZones: rentedZones.map((rz: any) => ({
        zoneId: rz.zoneId,
        startDate: rz.startDate,
        endDate: rz.endDate,
        price: Number(rz.price)
      }))
    };

    // Get creator user ID from authenticated user
    const createdBy = req.user.userId;

    // Create contract using service
    const contract = await createContract(createRequest, createdBy);

    // Return success response
    res.status(201).json({
      message: "Contract created successfully",
      data: contract
    });
  } catch (error: any) {
    // Handle validation errors
    if (
      error.message.includes("required") ||
      error.message.includes("must be") ||
      error.message.includes("not found") ||
      error.message.includes("already rented") ||
      error.message.includes("Invalid") ||
      error.message.includes("does not belong") ||
      error.message.includes("cannot be")
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
 * Customer request draft contract: choose warehouse + date range.
 * Zone is auto-assigned when manager approves (no overlap with other contracts).
 * POST /api/contracts/request-draft
 * Authorization: Customer only
 */
export async function requestDraftContractController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { warehouseId, startDate, endDate, pricePerZone, requestedZoneId } = req.body;

    if (!warehouseId || !startDate || !endDate) {
      return res.status(400).json({
        message: "Missing required fields: warehouseId, startDate, endDate"
      });
    }

    const payload: RequestDraftContractRequest = {
      warehouseId,
      startDate,
      endDate,
      pricePerZone: pricePerZone != null ? Number(pricePerZone) : undefined,
      requestedZoneId,
      zoneIds: Array.isArray(req.body.zoneIds) ? req.body.zoneIds : undefined,
    };

    const customerId = req.user.userId;
    const contract = await createDraftContractFromRequest(payload, customerId);

    res.status(201).json({
      message: "Draft contract created; manager will approve to assign a zone automatically.",
      data: contract
    });
  } catch (error: any) {
    if (
      error.message.includes("required") ||
      error.message.includes("not found") ||
      error.message.includes("Invalid") ||
      error.message.includes("must be") ||
      error.message.includes("cannot be") ||
      error.message.includes("Not enough")
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

/**
 * Get all contracts (role-based filtering)
 * GET /api/contracts
 * Authorization: Manager (all contracts), Customer (own contracts)
 */
export async function getContractsController(req: Request, res: Response) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.userId;
    const userRole = req.user.role;

    // Get contracts using service
    const contracts = await getContracts(userId, userRole);

    // Return success response
    res.json({
      message: "Contracts retrieved successfully",
      data: contracts
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

/**
 * Get contract by ID
 * GET /api/contracts/:id
 * Authorization: Manager (any contract), Customer (own contracts only)
 */
export async function getContractByIdController(req: Request, res: Response) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Get contract using service
    const contract = await getContractById(id, userId, userRole);

    // Return success response
    res.json({
      message: "Contract retrieved successfully",
      data: contract
    });
  } catch (error: any) {
    // Handle not found or access denied
    if (
      error.message.includes("not found") ||
      error.message.includes("Access denied") ||
      error.message.includes("Invalid")
    ) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

/**
 * Update contract status
 * PATCH /api/contracts/:id/status
 * Authorization: Manager only
 */
export async function updateContractStatusController(
  req: Request,
  res: Response
) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Validate status
    const validStatuses = ["draft", "pending_payment", "active", "expired", "terminated"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${validStatuses.join(", ")}`
      });
    }

    // Update contract status using service
    const contract = await updateContractStatus(
      id,
      status,
      userId,
      userRole
    );

    // Return success response
    res.json({
      message: "Contract status updated successfully",
      data: contract
    });
  } catch (error: any) {
    // Handle validation errors
    if (
      error.message.includes("not found") ||
      error.message.includes("Invalid") ||
      error.message.includes("Only managers") ||
      error.message.includes("Invalid status transition")
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}
