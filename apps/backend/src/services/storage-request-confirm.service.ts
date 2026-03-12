import { Types } from "mongoose";
import StorageRequest from "../models/StorageRequest";
import { notifyStorageRequestEvent } from "./notification.service";

export interface CustomerConfirmStorageRequestResponseDTO {
  request_id: string;
  final_status: "COMPLETED";
  customer_confirmed_at: Date;
  updated_at: Date;
}

/**
 * CUSTOMER confirms a staff-completed request.
 * - Only DONE_BY_STAFF can be confirmed
 * - Only the request owner (customerId) can confirm
 * - Marks status: DONE_BY_STAFF -> COMPLETED and sets customerConfirmedAt
 */
export async function customerConfirmStorageRequest(
  requestId: string,
  customerId: string
): Promise<CustomerConfirmStorageRequestResponseDTO> {
  if (!Types.ObjectId.isValid(requestId)) {
    throw new Error("Invalid request id");
  }
  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer id");
  }

  const request = await StorageRequest.findById(requestId);
  if (!request) {
    throw new Error("Storage request not found");
  }

  if (request.customerId.toString() !== customerId) {
    throw new Error("Request does not belong to the authenticated customer");
  }

  if (request.status !== "DONE_BY_STAFF") {
    throw new Error("Only DONE_BY_STAFF requests can be confirmed by customer");
  }

  const now = new Date();
  request.status = "COMPLETED";
  request.customerConfirmedAt = now;
  await request.save();

  // Notifications (best-effort)
  notifyStorageRequestEvent({
    eventType: "REQUEST_COMPLETED",
    requestId: request._id.toString(),
    actorUserId: customerId
  });
  notifyStorageRequestEvent({
    eventType: "REQUEST_STATUS_CHANGED",
    requestId: request._id.toString(),
    actorUserId: customerId
  });

  return {
    request_id: request._id.toString(),
    final_status: "COMPLETED",
    customer_confirmed_at: now,
    updated_at: request.updatedAt
  };
}

