import { Types } from "mongoose";
import StorageRequest from "../models/StorageRequest";
import StorageRequestDetail from "../models/StorageRequestDetail";
import Contract from "../models/Contract";
import Shelf from "../models/Shelf";
import { notifyStorageRequestEvent } from "./notification.service";
import { getAllowedStaffIdsForWarehouse } from "./staff-warehouse.service";
import {
  assertCustomerMayCreateStorageRequest,
  assertManagerMayAssignStorageRequest
} from "./contract-rules.service";

function normalizeObjectIdString(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const exact = value.trim();
    if (Types.ObjectId.isValid(exact)) return new Types.ObjectId(exact).toString();
    const matched = exact.match(/[a-fA-F0-9]{24}/);
    if (matched && Types.ObjectId.isValid(matched[0])) {
      return new Types.ObjectId(matched[0]).toString();
    }
    return null;
  }
  if (value instanceof Types.ObjectId) return value.toString();
  if (typeof value === "object") {
    if (value._id) return normalizeObjectIdString(value._id);
    if (value.id) return normalizeObjectIdString(value.id);
    if (typeof value.toString === "function") return normalizeObjectIdString(value.toString());
  }
  return null;
}

/**
 * DTO for inbound request item
 */
export interface InboundRequestItem {
  itemName: string;
  quantity: number;
  unit: string;
  quantityPerUnit?: number;
  volumePerUnitM3: number;
}

/**
 * DTO for creating inbound request
 */
export interface CreateInboundRequestDTO {
  contractId: string;
  zoneId: string;
  /** Customer-provided inbound reference (e.g. IN-2025-0025) */
  reference?: string;
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
  /** Customer-provided outbound reference (e.g. OUT-2025-0012) */
  reference?: string;
  items: OutboundRequestItem[];
}

/**
 * DTO for request detail response
 */
export interface RequestDetailResponse {
  requestDetailId: string;
  shelfId?: string;
  itemName: string;
  unit: string;
  quantityPerUnit?: number;
  volumePerUnitM3?: number;
  quantityRequested: number;
  quantityActual?: number;
}

/**
 * DTO for inbound request response
 */
export interface InboundRequestResponse {
  requestId: string;
  contractId: string;
  requestedZoneId: string;
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
  if (!data.zoneId || data.zoneId.trim().length === 0) {
    throw new Error("Zone ID is required");
  }
  if (!normalizeObjectIdString(data.zoneId)) {
    throw new Error("Invalid zone ID");
  }

  // Validate items array
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("Items array is required and must not be empty");
  }

  // Validate each item
  data.items.forEach((item, index) => {
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

    if (item.quantityPerUnit != null) {
      const qpu = Number(item.quantityPerUnit);
      if (isNaN(qpu) || qpu < 0) {
        throw new Error(`Item ${index + 1}: quantityPerUnit must be a valid number >= 0`);
      }
    }
    if (item.volumePerUnitM3 == null) {
      throw new Error(`Item ${index + 1}: volumePerUnitM3 is required`);
    }
    const volumePerUnitM3 = Number(item.volumePerUnitM3);
    if (isNaN(volumePerUnitM3) || volumePerUnitM3 <= 0) {
      throw new Error(`Item ${index + 1}: volumePerUnitM3 must be a valid number > 0`);
    }
  });
}

/**
 * Validate contract ownership and whether this request type is allowed for current contract status.
 */
async function validateContractOwnership(
  contractId: string,
  customerId: string,
  forRequestType: "IN" | "OUT"
) {
  const contract = await Contract.findById(contractId);

  if (!contract) {
    throw new Error("Contract not found");
  }

  if (contract.customerId.toString() !== customerId) {
    throw new Error("Contract does not belong to the authenticated customer");
  }

  assertCustomerMayCreateStorageRequest(contract, forRequestType);
  return contract;
}

async function validateZoneBelongsToContract(
  contractId: string,
  zoneId: string
): Promise<void> {
  const contract = await Contract.findById(contractId).select("rentedZones");
  if (!contract) {
    throw new Error("Contract not found");
  }
  const normalizedZoneId = normalizeObjectIdString(zoneId);
  if (!normalizedZoneId) {
    throw new Error("Invalid zone ID");
  }

  const rentedZoneIds = (contract.rentedZones || [])
    .map((rz: any) => normalizeObjectIdString(rz.zoneId))
    .filter((v): v is string => !!v);

  if (!rentedZoneIds.includes(normalizedZoneId)) {
    throw new Error("Zone does not belong to the selected contract");
  }
}

/**
 * Validate shelf belongs to contract (shelf's zone must be in contract's rentedZones)
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

  const zoneIds = (contract.rentedZones || []).map((rz) => rz.zoneId.toString());
  if (!zoneIds.includes(shelf.zoneId.toString())) {
    throw new Error("Shelf does not belong to the contract (shelf's zone is not rented by this contract)");
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
  await validateContractOwnership(data.contractId, customerId, "IN");
  const normalizedZoneId = normalizeObjectIdString(data.zoneId);
  if (!normalizedZoneId) {
    throw new Error("Invalid zone ID");
  }
  await validateZoneBelongsToContract(data.contractId, normalizedZoneId);

  const request = await StorageRequest.create({
    contractId: new Types.ObjectId(data.contractId),
    customerId: new Types.ObjectId(customerId),
    requestedZoneId: new Types.ObjectId(normalizedZoneId),
    requestType: "IN",
    reference: data.reference?.trim() || undefined,
    status: "PENDING"
  });

  // Create request details
  const requestDetails = await Promise.all(
    data.items.map((item) =>
      StorageRequestDetail.create({
        requestId: request._id,
        itemName: item.itemName.trim(),
        unit: item.unit?.trim() || "pcs",
        quantityPerUnit: item.quantityPerUnit != null ? Number(item.quantityPerUnit) : undefined,
        volumePerUnitM3: Number(item.volumePerUnitM3),
        quantityRequested: item.quantity,
        quantityActual: undefined // Not set at creation time
      })
    )
  );

  // Build response
  const itemsResponse: RequestDetailResponse[] = requestDetails.map((detail) => ({
    requestDetailId: detail._id.toString(),
    shelfId: detail.shelfId ? detail.shelfId.toString() : undefined,
    itemName: detail.itemName,
    unit: (detail as any).unit || "pcs",
    quantityPerUnit: (detail as any).quantityPerUnit,
    volumePerUnitM3: (detail as any).volumePerUnitM3,
    quantityRequested: detail.quantityRequested,
    quantityActual: detail.quantityActual
  }));

  const response = {
    requestId: request._id.toString(),
    contractId: request.contractId.toString(),
    requestedZoneId: request.requestedZoneId!.toString(),
    status: request.status,
    requestType: request.requestType as "IN",
    items: itemsResponse,
    createdAt: request.createdAt
  };

  // Notifications (best-effort)
  notifyStorageRequestEvent({ eventType: "REQUEST_CREATED", requestId: request._id.toString(), actorUserId: customerId });

  return response;
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
  await validateContractOwnership(data.contractId, customerId, "OUT");

  // Validate all shelves belong to the contract
  for (const item of data.items) {
    await validateShelfBelongsToContract(item.shelfId, data.contractId);
  }

  const request = await StorageRequest.create({
    contractId: new Types.ObjectId(data.contractId),
    customerId: new Types.ObjectId(customerId),
    requestType: "OUT",
    reference: data.reference?.trim() || undefined,
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
    shelfId: detail.shelfId!.toString(),
    itemName: detail.itemName,
    unit: (detail as any).unit || "pcs",
    volumePerUnitM3: (detail as any).volumePerUnitM3,
    quantityRequested: detail.quantityRequested,
    quantityActual: detail.quantityActual
  }));

  const response = {
    requestId: request._id.toString(),
    contractId: request.contractId.toString(),
    status: request.status,
    requestType: request.requestType as "OUT",
    items: itemsResponse,
    createdAt: request.createdAt
  };

  // Notifications (best-effort)
  notifyStorageRequestEvent({ eventType: "REQUEST_CREATED", requestId: request._id.toString(), actorUserId: customerId });

  return response;
}

/**
 * Manager assigns a PENDING storage request to one or more staff.
 * Sets status to APPROVED, approvedBy, approvedAt, assignedStaffIds.
 */
export async function assignStorageRequest(
  requestId: string,
  staffIds: string[],
  managerId: string
): Promise<{ request_id: string; status: string; assigned_staff_ids: string[] }> {
  if (!Types.ObjectId.isValid(requestId)) throw new Error("Invalid request id");
  if (!Types.ObjectId.isValid(managerId)) throw new Error("Invalid manager id");
  if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
    throw new Error("staffIds is required and must be a non-empty array");
  }

  const request = await StorageRequest.findById(requestId);
  if (!request) throw new Error("Storage request not found");
  if (request.status !== "PENDING") {
    throw new Error("Only PENDING requests can be assigned. Current status: " + request.status);
  }

  const User = (await import("../models/User")).default;
  const objectIds = staffIds.map((id) => {
    if (!Types.ObjectId.isValid(id)) throw new Error("Invalid staff id: " + id);
    return new Types.ObjectId(id);
  });
  const staffUsers = await User.find({
    _id: { $in: objectIds },
    role: "staff",
    isActive: true
  })
    .select("_id")
    .lean();
  const foundIds = new Set(staffUsers.map((u: any) => u._id.toString()));
  for (const id of staffIds) {
    if (!foundIds.has(id)) throw new Error("User is not an active staff: " + id);
  }

  // Enforce warehouse-scoped staffing: staff assigned by manager must be configured for
  // the warehouse of this request's contract.
  const contract = await Contract.findById(request.contractId).select("warehouseId status").lean();
  if (!contract) throw new Error("Contract not found");
  assertManagerMayAssignStorageRequest(contract as any, request.requestType as "IN" | "OUT");
  const allowed = await getAllowedStaffIdsForWarehouse(contract.warehouseId.toString(), staffIds);
  const missing = staffIds.filter((id) => !allowed.has(id));
  if (missing.length > 0) {
    throw new Error("not allowed: One or more staff members are not permitted to handle tasks for this warehouse");
  }

  request.status = "APPROVED";
  request.approvedBy = new Types.ObjectId(managerId);
  request.approvedAt = new Date();
  request.assignedStaffIds = objectIds;
  await request.save();

  // Notifications (best-effort)
  notifyStorageRequestEvent({ eventType: "REQUEST_ASSIGNED", requestId: request._id.toString(), actorUserId: managerId });

  return {
    request_id: request._id.toString(),
    status: request.status,
    assigned_staff_ids: (request.assignedStaffIds || []).map((id) => id.toString())
  };
}
