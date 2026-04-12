import Contract from "../models/Contract";
import Shelf from "../models/Shelf";
import Payment from "../models/Payment";
import { runContractExpirySideEffects } from "./contract-expiry-side-effects.service";

/**
 * Paid contracts in `scheduled` (start date in the future at payment time) become `active`
 * when all rented zone start dates are <= now; shelves in those zones are marked RENTED.
 */
export async function activateScheduledContracts(): Promise<{
  activated: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let activated = 0;

  try {
    const candidates = await Contract.find({ status: "scheduled" });

    for (const contract of candidates) {
      const zones = contract.rentedZones || [];
      if (!zones.length) {
        errors.push(`Scheduled contract ${contract.contractCode} has no rentedZones; skipped`);
        continue;
      }
      const allZonesStarted = zones.every((rz) => new Date(rz.startDate) <= now);
      if (!allZonesStarted) continue;

      const session = await Contract.startSession();
      session.startTransaction();
      try {
        const fresh = await Contract.findById(contract._id).session(session);
        if (!fresh || fresh.status !== "scheduled") {
          await session.abortTransaction();
          continue;
        }
        fresh.status = "active";
        await fresh.save({ session });

        for (const rz of fresh.rentedZones || []) {
          await Shelf.updateMany({ zoneId: rz.zoneId }, { status: "RENTED" }, { session });
        }
        await session.commitTransaction();
        activated++;
      } catch (error: any) {
        await session.abortTransaction();
        errors.push(`Failed to activate scheduled ${contract.contractCode}: ${error.message}`);
      } finally {
        session.endSession();
      }
    }
  } catch (error: any) {
    errors.push(`Error in activateScheduledContracts: ${error.message}`);
  }

  return { activated, errors };
}

/**
 * Automatically activate contracts where rented zones' start date has passed
 * and mark all shelves in those zones as RENTED
 */
export async function activateContractsByDate(): Promise<{
  activated: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let activated = 0;

  try {
    const contractsToActivate = await Contract.find({
      status: "draft",
      "rentedZones.startDate": { $lte: now }
    });

    for (const contract of contractsToActivate) {
      const allZonesStarted = (contract.rentedZones || []).every(
        (rz) => new Date(rz.startDate) <= now
      );

      if (allZonesStarted && contract.rentedZones?.length) {
        const session = await Contract.startSession();
        session.startTransaction();
        try {
          contract.status = "active";
          await contract.save({ session });

          for (const rz of contract.rentedZones) {
            await Shelf.updateMany(
              { zoneId: rz.zoneId },
              { status: "RENTED" },
              { session }
            );
          }
          await session.commitTransaction();
          activated++;
        } catch (error: any) {
          await session.abortTransaction();
          errors.push(`Failed to activate contract ${contract.contractCode}: ${error.message}`);
        } finally {
          session.endSession();
        }
      }
    }
  } catch (error: any) {
    errors.push(`Error in activateContractsByDate: ${error.message}`);
  }

  return { activated, errors };
}

/**
 * Automatically expire contracts that have passed their end date
 * and mark shelves in those zones as AVAILABLE if no other active contract uses the zone
 */
export async function expireContractsByDate(): Promise<{
  expired: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let expired = 0;

  try {
    const contractsToExpire = await Contract.find({ status: { $in: ["active", "scheduled"] } });

    for (const contract of contractsToExpire) {
      const allZonesExpired = (contract.rentedZones || []).every(
        (rz) => new Date(rz.endDate) < now
      );

      if (allZonesExpired && contract.rentedZones?.length) {
        const priorStatus = contract.status;
        const session = await Contract.startSession();
        session.startTransaction();
        try {
          contract.status = "expired";
          await contract.save({ session });

          for (const rz of contract.rentedZones) {
            const otherActive = await Contract.countDocuments({
              _id: { $ne: contract._id },
              status: "active",
              "rentedZones.zoneId": rz.zoneId
            }).session(session);
            if (otherActive === 0) {
              await Shelf.updateMany(
                { zoneId: rz.zoneId },
                { status: "AVAILABLE" },
                { session }
              );
            }
          }
          await session.commitTransaction();
          expired++;

          if (priorStatus === "active") {
            try {
              await runContractExpirySideEffects({
                _id: contract._id,
                customerId: contract.customerId,
                contractCode: contract.contractCode
              });
            } catch (sideErr: any) {
              errors.push(
                `Post-expiry side effects failed for ${contract.contractCode}: ${sideErr?.message || sideErr}`
              );
            }
          }
        } catch (error: any) {
          await session.abortTransaction();
          errors.push(`Failed to expire contract ${contract.contractCode}: ${error.message}`);
        } finally {
          session.endSession();
        }
      }
    }
  } catch (error: any) {
    errors.push(`Error in expireContractsByDate: ${error.message}`);
  }

  return { expired, errors };
}

export async function runContractScheduler(): Promise<{
  activated: number;
  expired: number;
  errors: string[];
}> {
  const [scheduledResult, activationResult, expirationResult, pendingPaymentResult] = await Promise.all([
    activateScheduledContracts(),
    activateContractsByDate(),
    expireContractsByDate(),
    expirePendingPaymentsByTime()
  ]);

  return {
    activated: scheduledResult.activated + activationResult.activated,
    expired: expirationResult.expired + pendingPaymentResult.expired,
    errors: [
      ...scheduledResult.errors,
      ...activationResult.errors,
      ...expirationResult.errors,
      ...pendingPaymentResult.errors
    ]
  };
}

/**
 * Pending payment reservation TTL.
 * If the customer does not complete payment within this window, release the zone reservation.
 */
export async function expirePendingPaymentsByTime(): Promise<{
  expired: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let expired = 0;

  const ttlMs =
    process.env.PENDING_PAYMENT_TTL_MS != null
      ? Number(process.env.PENDING_PAYMENT_TTL_MS)
      : 60 * 60 * 1000; // 1 hour

  if (!ttlMs || Number.isNaN(ttlMs)) {
    return { expired: 0, errors: [] };
  }

  try {
    const now = Date.now();
    const contracts = await Contract.find({ status: "pending_payment" });

    // No session here intentionally (scheduler safety); process one-by-one.
    for (const contract of contracts) {
      const updatedAtMs = contract.updatedAt ? new Date(contract.updatedAt).getTime() : contract.createdAt.getTime();
      if (now - updatedAtMs < ttlMs) continue;

      const session = await Contract.startSession();
      session.startTransaction();
      try {
        contract.status = "expired";
        await contract.save({ session });

        await Payment.updateMany(
          { contractId: contract._id, status: "pending" },
          { status: "expired" },
          { session }
        );

        expired++;
        await session.commitTransaction();
      } catch (e: any) {
        await session.abortTransaction();
        errors.push(`Failed to expire pending payment ${contract.contractCode}: ${e.message}`);
      } finally {
        session.endSession();
      }
    }
  } catch (e: any) {
    errors.push(`Error in expirePendingPaymentsByTime: ${e.message}`);
  }

  return { expired, errors };
}
