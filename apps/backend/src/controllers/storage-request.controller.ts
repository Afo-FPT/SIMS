import { Request, Response } from "express";
import {
  createInboundRequest,
  CreateInboundRequestDTO,
  InboundRequestItem,
  createOutboundRequest,
  CreateOutboundRequestDTO,
  OutboundRequestItem,
  assignStorageRequest
} from "../services/storage-request.service";

/**
 * Create inbound request
 * Only CUSTOMER can access this endpoint
 */
export async function createInboundRequestController(
  req: Request,
  res: Response
) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Extract request data
    const { contractId, reference, items } = req.body;

    if (!contractId) {
      return res.status(400).json({ message: "Contract ID is required" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Items array is required and must not be empty"
      });
    }

    const itemsDTO: InboundRequestItem[] = items.map((item: any) => ({
      itemName: item.itemName,
      quantity: Number(item.quantity),
      unit: item.unit || "pcs",
      quantityPerUnit: item.quantityPerUnit != null ? Number(item.quantityPerUnit) : undefined
    }));

    const createRequest: CreateInboundRequestDTO = {
      contractId,
      reference: reference != null ? String(reference).trim() : undefined,
      items: itemsDTO
    };

    // Get customer ID from authenticated user
    const customerId = req.user.userId;

    // Create inbound request using service
    const inboundRequest = await createInboundRequest(
      createRequest,
      customerId
    );

    // Return success response
    res.status(201).json({
      message: "Inbound request created successfully",
      data: inboundRequest
    });
  } catch (error: any) {
    // Handle validation errors
    if (
      error.message.includes("required") ||
      error.message.includes("must be") ||
      error.message.includes("Invalid") ||
      error.message.includes("not found") ||
      error.message.includes("does not belong") ||
      error.message.includes("not active") ||
      error.message.includes("empty")
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
 * Create outbound request
 * Only CUSTOMER can access this endpoint
 */
export async function createOutboundRequestController(
  req: Request,
  res: Response
) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Extract request data
    const { contractId, reference, items } = req.body;

    if (!contractId) {
      return res.status(400).json({ message: "Contract ID is required" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Items array is required and must not be empty"
      });
    }

    const itemsDTO: OutboundRequestItem[] = items.map((item: any) => ({
      shelfId: item.shelfId,
      itemName: item.itemName,
      quantity: Number(item.quantity),
      unit: item.unit || "pcs"
    }));

    const createRequest: CreateOutboundRequestDTO = {
      contractId,
      reference: reference != null ? String(reference).trim() : undefined,
      items: itemsDTO
    };

    const customerId = req.user.userId;
    const outboundRequest = await createOutboundRequest(
      createRequest,
      customerId
    );

    res.status(201).json({
      message: "Outbound request created successfully",
      data: outboundRequest
    });
  } catch (error: any) {
    if (
      error.message.includes("required") ||
      error.message.includes("must be") ||
      error.message.includes("Invalid") ||
      error.message.includes("not found") ||
      error.message.includes("does not belong") ||
      error.message.includes("not active") ||
      error.message.includes("empty")
    ) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}

/**
 * Assign a PENDING storage request to staff (manager only)
 * PATCH /storage-requests/:id/assign  body: { staffIds: string[] }
 */
export async function assignStorageRequestController(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { staffIds } = req.body;
    if (!staffIds || !Array.isArray(staffIds)) {
      return res.status(400).json({ message: "staffIds array is required" });
    }

    const data = await assignStorageRequest(id, staffIds, req.user.userId);
    return res.json({ message: "Request assigned to staff successfully", data });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";
    if (
      msg.includes("Invalid") ||
      msg.includes("required") ||
      msg.includes("not found") ||
      msg.includes("Only PENDING") ||
      msg.includes("not an active staff")
    ) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: msg });
  }
}
