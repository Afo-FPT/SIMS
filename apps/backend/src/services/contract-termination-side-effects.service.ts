import type { Types } from "mongoose";
import StorageRequest from "../models/StorageRequest";
import { releaseReservedCreditsForEntity } from "./request-credit.service";
import { notifyStorageRequestEvent, notifyContractTerminatedForCustomer } from "./notification.service";

/**
 * When a contract becomes terminated (manager):
 * - Reject all PENDING inbound/outbound requests
 * - Release reserved credits tied to those requests
 * - Notify customer (deduped)
 */
export async function runContractTerminationSideEffects(contract: {
  _id: Types.ObjectId;
  customerId: Types.ObjectId;
  contractCode?: string;
}): Promise<void> {
  const pending = await StorageRequest.find({
    contractId: contract._id,
    status: "PENDING"
  });

  for (const req of pending) {
    req.status = "REJECTED";
    await req.save();
    const entityType = req.requestType === "IN" ? "IN" : "OUT";
    await releaseReservedCreditsForEntity({
      entityType,
      entityId: req._id.toString()
    });
    await notifyStorageRequestEvent({
      eventType: "REQUEST_REJECTED",
      requestId: req._id.toString(),
      actorUserId: undefined
    });
  }

  await notifyContractTerminatedForCustomer({
    contractId: contract._id.toString(),
    customerId: contract.customerId.toString(),
    contractCode: contract.contractCode
  });
}
