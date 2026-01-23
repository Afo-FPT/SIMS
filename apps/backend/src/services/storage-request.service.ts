import { Types } from "mongoose";
import StorageRequest from "../models/StorageRequest";
import StorageRequestDetail from "../models/StorageRequestDetail";
import Contract from "../models/Contract";
import Shelf from "../models/Shelf";

/**
 * DTO for inbound request item
 */
export interface InboundRequestItem {
  shelfId: string;
  itemName: string;
  quantity: number;
  unit: string;
}

/**
 * DTO for creating inbound request
 */
export interface CreateInboundRequestDTO {
  contractId: string;
  items: InboundRequestItem[];
}

/**
 * DTO for outbound request item (same structure as inbound)
 */
export interface OutboundRequestItem {
  shelfId: string;
  itemName: string;
  quantity: number;
  unit: string;
}

/**
 * DTO for creating outbound request
 */
export interface CreateOutboundRequestDTO {
  contractId: string;
  items: OutboundRequestItem[];
}

/**
 * DTO for request detail response
 */
export interface RequestDetailResponse {
  requestDetailId: string;
  shelfId: string;
  itemName: string;
  unit: string;
  quantityRequested: number;
  quantityActual?: number;
}

/**
 * DTO for inbound request response
 */
export interface InboundRequestResponse {
  requestId: string;
  contractId: string;
  status: "PENDING" | "APPROVED" | "DONE_BY_STAFF" | "COMPLETED" | "REJECTED";
  requestType: "IN";
  items: RequestDetailResponse[];
  createdAt: Date;
}

/**
 * DTO for outbound request response
 */
export interface OutboundRequestResponse {
  requestId: string;
  contractId: string;
  status: "PENDING" | "APPROVED" | "DONE_BY_STAFF" | "COMPLETED" | "REJECTED";
  requestType: "OUT";
  items: RequestDetailResponse[];
  createdAt: Date;
}

/**
 * Validate create outbound request DTO (same validation as inbound)
 */
function validateCreateOutboundRequest(data: CreateOutboundRequestDTO): void {
  // Validate contractId
  if (!data.contractId || data.contractId.trim().length === 0) {
    throw new Error("Contract ID is required");
  }

  if (!Types.ObjectId.isValid(data.contractId)) {
    throw new Error("Invalid contract ID");
  }

  // Validate items array
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("Items array is required and must not be empty");
  }

  // Validate each item
  data.items.forEach((item, index) => {
    // Validate shelfId
    if (!item.shelfId || item.shelfId.trim().length === 0) {
      throw new Error(`Item ${index + 1}: Shelf ID is required`);
    }

    if (!Types.ObjectId.isValid(item.shelfId)) {
      throw new Error(`Item ${index + 1}: Invalid shelf ID`);
    }

    // Validate itemName
    if (!item.itemName || item.itemName.trim().length === 0) {
      throw new Error(`Item ${index + 1}: Item name is required`);
    }

    // Validate quantity
    if (!item.quantity || item.quantity <= 0) {
      throw new Error(`Item ${index + 1}: Quantity must be greater than 0`);
    }

    if (typeof item.quantity !== "number" || isNaN(item.quantity)) {
      throw new Error(`Item ${index + 1}: Quantity must be a valid number`);
    }

    // Validate unit
    if (!item.unit || item.unit.trim().length === 0) {
      throw new Error(`Item ${index + 1}: Unit is required`);
    }
  });
}

/**
 * Validate create inbound request DTO
 */
function validateCreateInboundRequest(data: CreateInboundRequestDTO): void {
  // Validate contractId
  if (!data.contractId || data.contractId.trim().length === 0) {
    throw new Error("Contract ID is required");
  }

  if (!Types.ObjectId.isValid(data.contractId)) {
    throw new Error("Invalid contract ID");
  }

  // Validate items array
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("Items array is required and must not be empty");
  }

  // Validate each item
  data.items.forEach((item, index) => {
    // Validate shelfId
    if (!item.shelfId || item.shelfId.trim().length === 0) {
      throw new Error(`Item ${index + 1}: Shelf ID is required`);
    }

    if (!Types.ObjectId.isValid(item.shelfId)) {
      throw new Error(`Item ${index + 1}: Invalid shelf ID`);
    }

    // Validate itemName
    if (!item.itemName || item.itemName.trim().length === 0) {
      throw new Error(`Item ${index + 1}: Item name is required`);
    }

    // Validate quantity
    if (!item.quantity || item.quantity <= 0) {
      throw new Error(`Item ${index + 1}: Quantity must be greater than 0`);
    }

    if (typeof item.quantity !== "number" || isNaN(item.quantity)) {
      throw new Error(`Item ${index + 1}: Quantity must be a valid number`);
    }

    // Validate unit
    if (!item.unit || item.unit.trim().length === 0) {
      throw new Error(`Item ${index + 1}: Unit is required`);
    }
  });
}

/**
 * Validate contract ownership
 */
async function validateContractOwnership(
  contractId: string,
  customerId: string
): Promise<void> {
  const contract = await Contract.findById(contractId);

  if (!contract) {
    throw new Error("Contract not found");
  }

  if (contract.customerId.toString() !== customerId) {
    throw new Error("Contract does not belong to the authenticated customer");
  }

  // Contract status must be "active" (lowercase) to allow storage requests
  if (contract.status !== "active") {
    throw new Error("Contract is not active");
  }
}

/**
 * Validate shelf belongs to contract
 * Contract has rentedShelves array, so we check if shelfId exists in that array
 */
async function validateShelfBelongsToContract(
  shelfId: string,
  contractId: string
): Promise<void> {
  const contract = await Contract.findById(contractId);
  
  if (!contract) {
    throw new Error("Contract not found");
  }

  const shelf = await Shelf.findById(shelfId);
  
  if (!shelf) {
    throw new Error("Shelf not found");
  }

  // Check if shelfId exists in contract's rentedShelves array
  const shelfExistsInContract = contract.rentedShelves.some(
    (rentedShelf) => rentedShelf.shelfId.toString() === shelfId
  );

  if (!shelfExistsInContract) {
    throw new Error("Shelf does not belong to the contract");
  }
}

/**
 * Create inbound request
 * Only CUSTOMER can call this function
 */
export async function createInboundRequest(
  data: CreateInboundRequestDTO,
  customerId: string
): Promise<InboundRequestResponse> {
  // Validate request data
  validateCreateInboundRequest(data);

  // Validate customerId
  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID");
  }

  // Validate contract ownership
  await validateContractOwnership(data.contractId, customerId);

  // Validate all shelves belong to the contract
  for (const item of data.items) {
    await validateShelfBelongsToContract(item.shelfId, data.contractId);
  }

  // Start transaction-like operations (create request first, then details)
  const request = await StorageRequest.create({
    contractId: new Types.ObjectId(data.contractId),
    customerId: new Types.ObjectId(customerId),
    requestType: "IN",
    status: "PENDING"
  });

  // Create request details
  const requestDetails = await Promise.all(
    data.items.map((item) =>
      StorageRequestDetail.create({
        requestId: request._id,
        shelfId: new Types.ObjectId(item.shelfId),
        itemName: item.itemName.trim(),
        unit: item.unit?.trim() || "pcs",
        quantityRequested: item.quantity,
        quantityActual: undefined // Not set at creation time
      })
    )
  );

  // Build response
  const itemsResponse: RequestDetailResponse[] = requestDetails.map((detail) => ({
    requestDetailId: detail._id.toString(),
    shelfId: detail.shelfId.toString(),
    itemName: detail.itemName,
    unit: (detail as any).unit || "pcs",
    quantityRequested: detail.quantityRequested,
    quantityActual: detail.quantityActual
  }));

  return {
    requestId: request._id.toString(),
    contractId: request.contractId.toString(),
    status: request.status,
    requestType: request.requestType as "IN",
    items: itemsResponse,
    createdAt: request.createdAt
  };
}

/**
 * Create outbound request
 * Only CUSTOMER can call this function
 */
export async function createOutboundRequest(
  data: CreateOutboundRequestDTO,
  customerId: string
): Promise<OutboundRequestResponse> {
  // Validate request data
  validateCreateOutboundRequest(data);

  // Validate customerId
  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID");
  }

  // Validate contract ownership
  await validateContractOwnership(data.contractId, customerId);

  // Validate all shelves belong to the contract
  for (const item of data.items) {
    await validateShelfBelongsToContract(item.shelfId, data.contractId);
  }

  // Start transaction-like operations (create request first, then details)
  const request = await StorageRequest.create({
    contractId: new Types.ObjectId(data.contractId),
    customerId: new Types.ObjectId(customerId),
    requestType: "OUT",
    status: "PENDING"
  });

  // Create request details
  const requestDetails = await Promise.all(
    data.items.map((item) =>
      StorageRequestDetail.create({
        requestId: request._id,
        shelfId: new Types.ObjectId(item.shelfId),
        itemName: item.itemName.trim(),
        unit: item.unit?.trim() || "pcs",
        quantityRequested: item.quantity,
        quantityActual: undefined // Not set at creation time
      })
    )
  );

  // Build response
  const itemsResponse: RequestDetailResponse[] = requestDetails.map((detail) => ({
    requestDetailId: detail._id.toString(),
    shelfId: detail.shelfId.toString(),
    itemName: detail.itemName,
    unit: (detail as any).unit || "pcs",
    quantityRequested: detail.quantityRequested,
    quantityActual: detail.quantityActual
  }));

  return {
    requestId: request._id.toString(),
    contractId: request.contractId.toString(),
    status: request.status,
    requestType: request.requestType as "OUT",
    items: itemsResponse,
    createdAt: request.createdAt
  };
}
