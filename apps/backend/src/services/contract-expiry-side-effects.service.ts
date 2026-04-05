import type { Types } from "mongoose";
import StorageRequest from "../models/StorageRequest";
import { releaseReservedCreditsForEntity } from "./request-credit.service";
import { notifyStorageRequestEvent, notifyContractExpiredForCustomer } from "./notification.service";

/**
 * When a contract becomes expired (scheduler or manager):
 * - Reject pending inbound requests (no new stock)
 * - Release reserved request credits tied to those requests
 * - Notify customer (deduped) about contract expiry
 */
export async function runContractExpirySideEffects(contract: {
  _id: Types.ObjectId;
  customerId: Types.ObjectId;
  contractCode?: string;
}): Promise<void> {
  const pendingInbound = await StorageRequest.find({
    contractId: contract._id,
    requestType: "IN",
    status: "PENDING"
  });

  for (const req of pendingInbound) {
    req.status = "REJECTED";
    await req.save();
    await releaseReservedCreditsForEntity({
      entityType: "IN",
      entityId: req._id.toString()
    });
    await notifyStorageRequestEvent({
      eventType: "REQUEST_REJECTED",
      requestId: req._id.toString(),
      actorUserId: undefined
    });
  }

  await notifyContractExpiredForCustomer({
    contractId: contract._id.toString(),
    customerId: contract.customerId.toString(),
    contractCode: contract.contractCode
  });
}
