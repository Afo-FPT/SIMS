import Contract from "../models/Contract";
import Shelf from "../models/Shelf";
import { Types } from "mongoose";

/**
 * Automatically activate contracts that have reached their start date
 * and update shelf status to RENTED
 */
export async function activateContractsByDate(): Promise<{
  activated: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let activated = 0;

  try {
    // Find all draft contracts where any rented shelf's startDate has passed
    const contractsToActivate = await Contract.find({
      status: "draft",
      "rentedShelves.startDate": { $lte: now }
    });

    for (const contract of contractsToActivate) {
      // Check if ALL rented shelves have reached their start date
      const allShelvesStarted = contract.rentedShelves.every(
        (shelf) => new Date(shelf.startDate) <= now
      );

      if (allShelvesStarted) {
        const session = await Contract.startSession();
        session.startTransaction();

        try {
          // Update contract status to active
          contract.status = "active";
          await contract.save({ session });

          // Update all shelves to RENTED
          for (const rentedShelf of contract.rentedShelves) {
            await Shelf.findByIdAndUpdate(
              rentedShelf.shelfId,
              { status: "RENTED" },
              { session }
            );
          }

          await session.commitTransaction();
          activated++;
        } catch (error: any) {
          await session.abortTransaction();
          errors.push(
            `Failed to activate contract ${contract.contractCode}: ${error.message}`
          );
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
 * and update shelf status to AVAILABLE (if not used by other active contracts)
 */
export async function expireContractsByDate(): Promise<{
  expired: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let expired = 0;

  try {
    // Find all active contracts where ALL rented shelves have passed their end date
    const contractsToExpire = await Contract.find({
      status: "active"
    });

    for (const contract of contractsToExpire) {
      // Check if ALL rented shelves have passed their end date
      const allShelvesExpired = contract.rentedShelves.every(
        (shelf) => new Date(shelf.endDate) < now
      );

      if (allShelvesExpired) {
        const session = await Contract.startSession();
        session.startTransaction();

        try {
          // Update contract status to expired
          contract.status = "expired";
          await contract.save({ session });

          // Check each shelf and mark as AVAILABLE if no other active contract uses it
          for (const rentedShelf of contract.rentedShelves) {
            // Check if any other active contract is using this shelf
            const otherActiveContracts = await Contract.countDocuments({
              _id: { $ne: contract._id },
              status: "active",
              "rentedShelves.shelfId": rentedShelf.shelfId
            }).session(session);

            // Only mark as AVAILABLE if no other active contract uses this shelf
            if (otherActiveContracts === 0) {
              await Shelf.findByIdAndUpdate(
                rentedShelf.shelfId,
                { status: "AVAILABLE" },
                { session }
              );
            }
          }

          await session.commitTransaction();
          expired++;
        } catch (error: any) {
          await session.abortTransaction();
          errors.push(
            `Failed to expire contract ${contract.contractCode}: ${error.message}`
          );
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

/**
 * Run all scheduled contract updates
 * This function should be called periodically (e.g., every hour or daily)
 */
export async function runContractScheduler(): Promise<{
  activated: number;
  expired: number;
  errors: string[];
}> {
  const [activationResult, expirationResult] = await Promise.all([
    activateContractsByDate(),
    expireContractsByDate()
  ]);

  return {
    activated: activationResult.activated,
    expired: expirationResult.expired,
    errors: [...activationResult.errors, ...expirationResult.errors]
  };
}
