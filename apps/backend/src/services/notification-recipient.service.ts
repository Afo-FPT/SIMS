import { Types } from "mongoose";
import User from "../models/User";
import StorageRequest from "../models/StorageRequest";

export type NotificationEventType =
  | "REQUEST_CREATED"
  | "REQUEST_UPDATED"
  | "REQUEST_STATUS_CHANGED"
  | "REQUEST_APPROVED"
  | "REQUEST_REJECTED"
  | "REQUEST_ASSIGNED"
  | "REQUEST_DONE_BY_STAFF"
  | "REQUEST_COMPLETED";

export type NotificationEventPayload = {
  requestId: string;
};

export async function resolveNotificationRecipients(
  eventType: NotificationEventType,
  payload: NotificationEventPayload
): Promise<{ event: NotificationEventType; recipients: string[]; request: any | null }> {
  if (!Types.ObjectId.isValid(payload.requestId)) {
    throw new Error("Invalid request id");
  }

  const request = await StorageRequest.findById(payload.requestId).lean();
  if (!request) {
    throw new Error("Storage request not found");
  }

  const recipients = new Set<string>();

  // Always notify the request owner (customer)
  recipients.add((request as any).customerId.toString());

  // Managers: the system currently doesn't map a request to a specific warehouse manager.
  // We notify all active managers (can be refined later).
  if (
    eventType === "REQUEST_CREATED" ||
    eventType === "REQUEST_STATUS_CHANGED" ||
    eventType === "REQUEST_ASSIGNED" ||
    eventType === "REQUEST_DONE_BY_STAFF" ||
    eventType === "REQUEST_COMPLETED"
  ) {
    const managers = await User.find({ role: "manager", isActive: true }).select("_id").lean();
    managers.forEach((m: any) => recipients.add(m._id.toString()));
  }

  // Assigned staff (if any)
  const assigned = (request as any).assignedStaffIds || [];
  if (
    eventType === "REQUEST_ASSIGNED" ||
    eventType === "REQUEST_UPDATED" ||
    eventType === "REQUEST_STATUS_CHANGED" ||
    eventType === "REQUEST_DONE_BY_STAFF" ||
    eventType === "REQUEST_COMPLETED"
  ) {
    assigned.forEach((id: any) => recipients.add(id.toString()));
  }

  // Approval/rejection: customer always, and managers are already included for status change events.
  if (eventType === "REQUEST_APPROVED" || eventType === "REQUEST_REJECTED") {
    // no-op (customer already)
  }

  return { event: eventType, recipients: Array.from(recipients), request };
}

