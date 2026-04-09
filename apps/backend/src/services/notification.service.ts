import { Types } from "mongoose";
import Notification, { type NotificationType } from "../models/Notification";
import Contract from "../models/Contract";
import User from "../models/User";
import { emitToUser } from "../realtime/socket";
import { scheduleManagerReportsInvalidate } from "../realtime/manager-reports-invalidate";
import { enqueueEmail } from "../queues/email.queue";
import { resolveNotificationRecipients, type NotificationEventType } from "./notification-recipient.service";

function buildDedupeKey(params: {
  eventType: NotificationEventType;
  requestId: string;
  status?: string;
}): string {
  // Keyed by event + entity + current status (so status transitions can notify once per status)
  const status = params.status || "UNKNOWN";
  return `${params.eventType}:${params.requestId}:${status}`;
}

function buildRequestLink(params: { requestId: string; roleHint?: string }) {
  const base = process.env.FRONTEND_URL || "http://localhost:3000";
  // We navigate to role-specific service-requests page and let frontend open the modal by query param.
  const rolePrefix = params.roleHint ? params.roleHint.toLowerCase() : "customer";
  return `${base}/${rolePrefix}/service-requests?requestId=${encodeURIComponent(params.requestId)}`;
}

async function getContractCode(contractId: string): Promise<string | undefined> {
  if (!Types.ObjectId.isValid(contractId)) return undefined;
  const c = await Contract.findById(contractId).select("contractCode").lean();
  return c ? (c as any).contractCode : undefined;
}

function titleForEvent(event: NotificationEventType, req: any) {
  const kind = req?.requestType === "IN" ? "Inbound" : "Outbound";
  switch (event) {
    case "REQUEST_CREATED":
      return `New ${kind} request created`;
    case "REQUEST_ASSIGNED":
      return `${kind} request assigned to staff`;
    case "REQUEST_APPROVED":
      return `${kind} request approved`;
    case "REQUEST_REJECTED":
      return `${kind} request rejected`;
    case "REQUEST_DONE_BY_STAFF":
      return `${kind} request completed by staff`;
    case "REQUEST_COMPLETED":
      return `${kind} request confirmed by customer`;
    case "REQUEST_UPDATED":
      return `${kind} request updated`;
    case "REQUEST_STATUS_CHANGED":
      return `${kind} request status changed`;
    default:
      return `Request update`;
  }
}

function messageForEvent(event: NotificationEventType, req: any, contractCode?: string) {
  const ref = req?.reference ? ` (${req.reference})` : "";
  const cc = contractCode ? `Contract: ${contractCode}` : "Contract: Unknown";
  switch (event) {
    case "REQUEST_CREATED":
      return `A new request${ref} was created. ${cc}. Status: ${req?.status}.`;
    case "REQUEST_ASSIGNED":
      return `Request${ref} was assigned to staff. ${cc}. Status: ${req?.status}.`;
    case "REQUEST_APPROVED":
      return `Request${ref} was approved. ${cc}.`;
    case "REQUEST_REJECTED":
      return `Request${ref} was rejected. ${cc}.`;
    case "REQUEST_DONE_BY_STAFF":
      return `Request${ref} was completed by staff. ${cc}. Status: ${req?.status}.`;
    case "REQUEST_COMPLETED":
      return `Request${ref} was confirmed by customer. ${cc}. Status: ${req?.status}.`;
    case "REQUEST_UPDATED":
      return `Request${ref} was updated. ${cc}.`;
    case "REQUEST_STATUS_CHANGED":
      return `Request${ref} status changed to ${req?.status}. ${cc}.`;
    default:
      return `Request updated. ${cc}.`;
  }
}

export async function notifyStorageRequestEvent(params: {
  eventType: NotificationEventType;
  requestId: string;
  actorUserId?: string;
}): Promise<void> {
  const { eventType, requestId, actorUserId } = params;

  // Best-effort: never block request APIs.
  try {
    const { recipients, request } = await resolveNotificationRecipients(eventType, { requestId });
    const contractId = (request as any)?.contractId?.toString?.() ?? "";
    const contractCode = await getContractCode(contractId);

    const title = titleForEvent(eventType, request);
    const message = messageForEvent(eventType, request, contractCode);
    const dedupeKey = buildDedupeKey({
      eventType,
      requestId,
      status: (request as any)?.status
    });

    const createdNotifs: any[] = [];
    for (const uid of recipients) {
      const raw = await Notification.findOneAndUpdate(
        { userId: new Types.ObjectId(uid), dedupeKey },
        {
          $setOnInsert: {
            userId: new Types.ObjectId(uid),
            dedupeKey,
            type: eventType as NotificationType,
            title,
            message,
            relatedEntityType: "storage_request",
            relatedEntityId: new Types.ObjectId(requestId),
            read: false,
            meta: {
              request_id: requestId,
              contract_id: contractId,
              contract_code: contractCode,
              request_type: (request as any)?.requestType,
              status: (request as any)?.status,
              actor_user_id: actorUserId
            }
          }
        },
        { upsert: true, new: true, rawResult: true, setDefaultsOnInsert: true }
      );

      // Only emit + email when inserted (not duplicate)
      const inserted = !(raw as any)?.lastErrorObject?.updatedExisting;
      if (inserted) {
        createdNotifs.push((raw as any).value);
      }
    }

    // Realtime emit
    for (const n of createdNotifs) {
      emitToUser(n.userId.toString(), "notification:new", {
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        message: n.message,
        relatedEntityType: n.relatedEntityType,
        relatedEntityId: n.relatedEntityId?.toString(),
        read: n.read,
        createdAt: n.createdAt,
        meta: n.meta
      });
    }

    // Email (async)
    const users = await User.find({ _id: { $in: createdNotifs.map((n) => n.userId) } })
      .select("_id email name role isActive")
      .lean();

    await Promise.all(
      users
        .filter((u: any) => u.isActive && u.email)
        .map(async (u: any) => {
          const link = buildRequestLink({ requestId, roleHint: u.role });
          const subject = `Request Update - ${requestId.slice(-8).toUpperCase()}`;
          const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2 style="margin:0 0 10px 0;">${title}</h2>
              <p>${message}</p>
              <p><strong>Request ID:</strong> ${requestId}</p>
              <p><strong>Status:</strong> ${(request as any)?.status}</p>
              <p><strong>Updated by:</strong> ${actorUserId || "System"}</p>
              <p><a href="${link}">View details</a></p>
            </div>
          `;
          const text = `${title}\n\n${message}\nRequest ID: ${requestId}\nStatus: ${(request as any)?.status}\nView: ${link}\n`;
          await enqueueEmail({ to: u.email, subject, html, text });
        })
    );

    scheduleManagerReportsInvalidate();
  } catch (err) {
    console.error("[Notification] notifyStorageRequestEvent failed", err);
  }
}

/**
 * One-time in-app (deduped) notice when a contract moves to expired (scheduler).
 */
export async function notifyContractExpiredForCustomer(params: {
  contractId: string;
  customerId: string;
  contractCode?: string;
}): Promise<void> {
  try {
    const { contractId, customerId, contractCode } = params;
    if (!Types.ObjectId.isValid(contractId) || !Types.ObjectId.isValid(customerId)) return;

    const dedupeKey = `CONTRACT_EXPIRED:${contractId}`;
    const title = "Contract expired";
    const message = contractCode
      ? `Contract ${contractCode} has expired. Inbound requests are closed; you can still create outbound requests to remove inventory until the contract is renewed or terminated.`
      : "Your warehouse contract has expired. Inbound requests are closed; you can still create outbound requests to remove inventory until the contract is renewed or terminated.";

    const raw = await Notification.findOneAndUpdate(
      { userId: new Types.ObjectId(customerId), dedupeKey },
      {
        $setOnInsert: {
          userId: new Types.ObjectId(customerId),
          dedupeKey,
          type: "CONTRACT_EXPIRED",
          title,
          message,
          relatedEntityType: "contract",
          relatedEntityId: new Types.ObjectId(contractId),
          read: false,
          meta: { contract_id: contractId, contract_code: contractCode }
        }
      },
      { upsert: true, new: true, rawResult: true, setDefaultsOnInsert: true }
    );

    const inserted = !(raw as any)?.lastErrorObject?.updatedExisting;
    const doc = (raw as any)?.value;
    if (inserted && doc) {
      emitToUser(customerId, "notification:new", {
        id: doc._id.toString(),
        type: doc.type,
        title: doc.title,
        message: doc.message,
        relatedEntityType: doc.relatedEntityType,
        relatedEntityId: doc.relatedEntityId?.toString(),
        read: doc.read,
        createdAt: doc.createdAt,
        meta: doc.meta
      });
    }

    scheduleManagerReportsInvalidate();
  } catch (err) {
    console.error("[Notification] notifyContractExpiredForCustomer failed", err);
  }
}

export async function notifyContractTerminatedForCustomer(params: {
  contractId: string;
  customerId: string;
  contractCode?: string;
}): Promise<void> {
  try {
    const { contractId, customerId, contractCode } = params;
    if (!Types.ObjectId.isValid(contractId) || !Types.ObjectId.isValid(customerId)) return;

    const dedupeKey = `CONTRACT_TERMINATED:${contractId}`;
    const title = "Contract terminated";
    const message = contractCode
      ? `Contract ${contractCode} has been terminated. New service requests (inbound, outbound, inventory checking) are no longer allowed. Contact the warehouse if you need to resolve remaining inventory.`
      : "Your warehouse contract has been terminated. New service requests are no longer allowed. Contact the warehouse if you need to resolve remaining inventory.";

    const raw = await Notification.findOneAndUpdate(
      { userId: new Types.ObjectId(customerId), dedupeKey },
      {
        $setOnInsert: {
          userId: new Types.ObjectId(customerId),
          dedupeKey,
          type: "CONTRACT_TERMINATED",
          title,
          message,
          relatedEntityType: "contract",
          relatedEntityId: new Types.ObjectId(contractId),
          read: false,
          meta: { contract_id: contractId, contract_code: contractCode }
        }
      },
      { upsert: true, new: true, rawResult: true, setDefaultsOnInsert: true }
    );

    const inserted = !(raw as any)?.lastErrorObject?.updatedExisting;
    const doc = (raw as any)?.value;
    if (inserted && doc) {
      emitToUser(customerId, "notification:new", {
        id: doc._id.toString(),
        type: doc.type,
        title: doc.title,
        message: doc.message,
        relatedEntityType: doc.relatedEntityType,
        relatedEntityId: doc.relatedEntityId?.toString(),
        read: doc.read,
        createdAt: doc.createdAt,
        meta: doc.meta
      });
    }

    scheduleManagerReportsInvalidate();
  } catch (err) {
    console.error("[Notification] notifyContractTerminatedForCustomer failed", err);
  }
}

export async function listMyNotifications(params: {
  userId: string;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;
  const q: any = { userId: new Types.ObjectId(params.userId) };
  if (params.unreadOnly) q.read = false;
  const [rows, total] = await Promise.all([
    Notification.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(q)
  ]);
  return {
    notifications: rows.map((n: any) => ({
    id: n._id.toString(),
    type: n.type,
    title: n.title,
    message: n.message,
    relatedEntityType: n.relatedEntityType,
    relatedEntityId: n.relatedEntityId?.toString?.(),
    read: !!n.read,
    readAt: n.readAt,
    createdAt: n.createdAt,
    meta: n.meta
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}

export async function markNotificationRead(params: { userId: string; notificationId: string }) {
  if (!Types.ObjectId.isValid(params.notificationId)) throw new Error("Invalid notification id");
  const updated = await Notification.findOneAndUpdate(
    { _id: new Types.ObjectId(params.notificationId), userId: new Types.ObjectId(params.userId) },
    { $set: { read: true, readAt: new Date() } },
    { new: true }
  ).lean();
  if (!updated) throw new Error("Notification not found");
  return {
    id: (updated as any)._id.toString(),
    read: true,
    readAt: (updated as any).readAt
  };
}

export async function getUnreadCount(params: { userId: string }) {
  const count = await Notification.countDocuments({ userId: new Types.ObjectId(params.userId), read: false });
  return { unread: count };
}

export async function markAllNotificationsRead(params: { userId: string }) {
  const now = new Date();
  const res = await Notification.updateMany(
    { userId: new Types.ObjectId(params.userId), read: false },
    { $set: { read: true, readAt: now } }
  );
  return { updated: res.modifiedCount ?? 0 };
}

export async function deleteReadNotifications(params: { userId: string }) {
  const res = await Notification.deleteMany({
    userId: new Types.ObjectId(params.userId),
    read: true
  });
  return { deleted: res.deletedCount ?? 0 };
}

