import { Request, Response } from "express";
import {
  createInboundRequest,
  CreateInboundRequestDTO,
  InboundRequestItem
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
    const { contractId, items } = req.body;

    // Validate contractId
    if (!contractId) {
      return res.status(400).json({ message: "Contract ID is required" });
    }

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Items array is required and must not be empty"
      });
    }

    // Transform items to DTO format
    const itemsDTO: InboundRequestItem[] = items.map((item: any) => ({
      shelfId: item.shelfId,
      itemName: item.itemName,
      quantity: Number(item.quantity),
      unit: item.unit || "pcs"
    }));

    // Prepare DTO
    const createRequest: CreateInboundRequestDTO = {
      contractId,
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
