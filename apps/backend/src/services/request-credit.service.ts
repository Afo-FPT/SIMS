import { Types } from "mongoose";
import StorageRequest from "../models/StorageRequest";
import CycleCount from "../models/CycleCount";
import RequestCredit, { type RequestCreditEntityType, type RequestCreditStatus } from "../models/RequestCredit";
import { ClientSession } from "mongoose";

export const WEEKLY_FREE_REQUEST_LIMIT = 3;
export const REQUEST_CREDIT_PRICE_VND = 100000;

function getWeekStartInGMT7(date: Date): Date {
  // Shift to GMT+7 so we can use UTC getters to get "local" week boundaries.
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const day = shifted.getUTCDay(); // 0 (Sun) - 6 (Sat)
  // Convert so Monday = 0 ... Sunday = 6
  const mondayBasedDay = (day + 6) % 7;
  const weekStartShifted = new Date(shifted);
  weekStartShifted.setUTCDate(shifted.getUTCDate() - mondayBasedDay);
  weekStartShifted.setUTCHours(0, 0, 0, 0);

  // Convert back to UTC
  return new Date(weekStartShifted.getTime() - 7 * 60 * 60 * 1000);
}

function getWeekEndInGMT7(weekStart: Date): Date {
  return new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
}

export async function countCustomerCompletedRequestsInWeek(
  customerId: string,
  contractId: string,
  now: Date,
  session?: ClientSession
): Promise<number> {
  const customerOid = new Types.ObjectId(customerId);
  const contractOid = new Types.ObjectId(contractId);
  const weekStart = getWeekStartInGMT7(now);
  const weekEnd = getWeekEndInGMT7(weekStart);

  const [storageCompletedCount, cycleCompletedCount] = await Promise.all([
    StorageRequest.countDocuments(
      {
        customerId: customerOid,
        contractId: contractOid,
        status: "DONE_BY_STAFF",
        updatedAt: { $gte: weekStart, $lt: weekEnd }
      },
      session ? { session } : undefined
    ),
    CycleCount.countDocuments(
      {
        createdByCustomerId: customerOid,
        contractId: contractOid,
        status: "STAFF_SUBMITTED",
        completedAt: { $gte: weekStart, $lt: weekEnd }
      },
      session ? { session } : undefined
    )
  ]);

  return storageCompletedCount + cycleCompletedCount;
}

/**
 * Count requests that are submitted but NOT yet staff-completed within this week.
 * Used for the "in progress" quota rule: pending (staff not finished yet) + used (staff finished).
 */
export async function countCustomerUnfinishedRequestsInWeek(
  customerId: string,
  contractId: string,
  now: Date,
  session?: ClientSession
): Promise<number> {
  const customerOid = new Types.ObjectId(customerId);
  const contractOid = new Types.ObjectId(contractId);
  const weekStart = getWeekStartInGMT7(now);
  const weekEnd = getWeekEndInGMT7(weekStart);

  const [storagePendingCount, cyclePendingCount] = await Promise.all([
    StorageRequest.countDocuments(
      {
        customerId: customerOid,
        contractId: contractOid,
        status: { $in: ["PENDING", "APPROVED"] },
        createdAt: { $gte: weekStart, $lt: weekEnd }
      },
      session ? { session } : undefined
    ),
    CycleCount.countDocuments(
      {
        createdByCustomerId: customerOid,
        contractId: contractOid,
        status: { $in: ["PENDING_MANAGER_APPROVAL", "ASSIGNED_TO_STAFF"] },
        createdAt: { $gte: weekStart, $lt: weekEnd }
      },
      session ? { session } : undefined
    )
  ]);

  return storagePendingCount + cyclePendingCount;
}

export function getCurrentWeekStart(now: Date): Date {
  return getWeekStartInGMT7(now);
}

export async function reserveRequestCreditIfNeeded(params: {
  customerId: string;
  contractId: string;
  now: Date;
  entityType: RequestCreditEntityType;
  session?: ClientSession;
}): Promise<{
  reservedCreditId?: string;
  reservationToken?: string;
}> {
  const { customerId, contractId, now, entityType, session } = params;
  const [completedCount, unfinishedCount] = await Promise.all([
    countCustomerCompletedRequestsInWeek(customerId, contractId, now, session),
    countCustomerUnfinishedRequestsInWeek(customerId, contractId, now, session)
  ]);

  // In progress quota rule:
  // (unfinished + used) >= quota => need extra credit/payment to create new request
  const totalUsed = completedCount + unfinishedCount;

  if (totalUsed < WEEKLY_FREE_REQUEST_LIMIT) {
    return {};
  }

  const weekStart = getWeekStartInGMT7(now);
  const token = new Types.ObjectId().toString();
  const contractOid = new Types.ObjectId(contractId);

  const credit = await RequestCredit.findOneAndUpdate(
    {
      customerId: new Types.ObjectId(customerId),
      contractId: contractOid,
      weekStart,
      status: "available"
    },
    {
      $set: {
        status: "reserved" as RequestCreditStatus,
        reservationToken: token,
        reservedEntityType: entityType
      }
    },
    {
      sort: { createdAt: 1 },
      new: true,
      session: session || undefined
    }
  );

  if (!credit) {
    const err: any = new Error(
      `Weekly request limit reached. Please pay ${REQUEST_CREDIT_PRICE_VND} VND for 1 more request in this week.`
    );
    err.code = "WEEKLY_LIMIT_REACHED";
    throw err;
  }

  return { reservedCreditId: credit._id.toString(), reservationToken: token };
}

export async function attachReservedCreditToEntity(params: {
  creditId: string;
  entityType: RequestCreditEntityType;
  entityId: string;
  reservationToken: string;
  session?: ClientSession;
}): Promise<void> {
  const { creditId, entityType, entityId, reservationToken, session } = params;

  const updated = await RequestCredit.findOneAndUpdate(
    {
      _id: new Types.ObjectId(creditId),
      reservationToken,
      reservedEntityType: entityType
    },
    {
      $set: {
        reservedEntityId: new Types.ObjectId(entityId)
      }
    },
    { session: session || undefined, new: true }
  );

  if (!updated) {
    throw new Error("Failed to attach reserved credit to request.");
  }
}

export async function releaseReservedCredit(params: {
  creditId: string;
  reservationToken: string;
  session?: ClientSession;
}): Promise<void> {
  const { creditId, reservationToken, session } = params;
  await RequestCredit.findOneAndUpdate(
    {
      _id: new Types.ObjectId(creditId),
      reservationToken
    },
    {
      $set: { status: "available" },
      $unset: {
        reservationToken: 1,
        reservedEntityType: 1,
        reservedEntityId: 1,
        consumedAt: 1
      }
    },
    { session: session || undefined }
  );
}

/** Release any credits reserved for a storage request / cycle entity (e.g. contract auto-expiry). */
export async function releaseReservedCreditsForEntity(params: {
  entityType: RequestCreditEntityType;
  entityId: string;
  session?: ClientSession;
}): Promise<void> {
  const { entityType, entityId, session } = params;
  if (!Types.ObjectId.isValid(entityId)) return;
  await RequestCredit.updateMany(
    {
      reservedEntityType: entityType,
      reservedEntityId: new Types.ObjectId(entityId),
      status: "reserved"
    },
    {
      $set: { status: "available" },
      $unset: {
        reservationToken: 1,
        reservedEntityType: 1,
        reservedEntityId: 1,
        consumedAt: 1
      }
    },
    { session: session || undefined }
  );
}

export async function consumeReservedCreditForEntity(params: {
  customerId: string;
  contractId: string;
  entityType: RequestCreditEntityType;
  entityId: string;
  now?: Date;
  session?: ClientSession;
}): Promise<void> {
  const { customerId, contractId, entityType, entityId, now, session } = params;
  const at = now ?? new Date();
  const contractOid = new Types.ObjectId(contractId);

  await RequestCredit.findOneAndUpdate(
    {
      customerId: new Types.ObjectId(customerId),
      contractId: contractOid,
      status: "reserved",
      reservedEntityType: entityType,
      reservedEntityId: new Types.ObjectId(entityId)
    },
    {
      $set: {
        status: "consumed",
        consumedAt: at
      },
      $unset: {
        reservationToken: 1
      }
    },
    { session: session || undefined }
  );
}

export async function grantRequestCredits(params: {
  customerId: string;
  contractId: string;
  credits: number;
  paidAt: Date;
  session?: ClientSession;
}): Promise<void> {
  const { customerId, contractId, credits, paidAt, session } = params;
  const weekStart = getWeekStartInGMT7(paidAt);
  const contractOid = new Types.ObjectId(contractId);
  await RequestCredit.create(
    [
      {
        customerId: new Types.ObjectId(customerId),
        contractId: contractOid,
        weekStart,
        credits,
        status: "available"
      }
    ],
    { session }
  );
}

