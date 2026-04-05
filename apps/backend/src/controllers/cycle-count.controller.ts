import { Request, Response } from "express";
import {
  createCycleCount,
  CreateCycleCountDTO,
  approveOrRejectCycleCount,
  ApproveCycleCountDTO,
  assignStaffToCycleCount,
  AssignStaffDTO,
  submitCycleCountResult,
  SubmitCycleCountResultDTO,
  confirmCycleCount,
  requestRecount,
  getCycleCounts,
  getCycleCountById,
  requestInventoryAdjustment,
  applyCycleCountAdjustment
} from "../services/cycle-count.service";
import {
  attachReservedCreditToEntity,
  releaseReservedCredit,
  reserveRequestCreditIfNeeded
} from "../services/request-credit.service";

/**
 * Create cycle count request
 * Only CUSTOMER can access this endpoint
 */
export async function createCycleCountController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { contractId, storedItemIds, note, preferredDate } = req.body;

    if (!contractId) {
      return res.status(400).json({ message: "Contract ID is required" });
    }

    const dto: CreateCycleCountDTO = {
      contractId,
      storedItemIds:
        storedItemIds && Array.isArray(storedItemIds) ? storedItemIds : undefined,
      note: note?.trim(),
      preferredDate: preferredDate ? new Date(preferredDate) : undefined
    };

    const customerId = req.user.userId;

    const now = new Date();
    const reservation = await reserveRequestCreditIfNeeded({
      customerId,
      contractId: contractId,
      now,
      entityType: "CYCLE"
    });

    const cycleCount = await createCycleCount(dto, customerId);

    if (reservation.reservedCreditId && reservation.reservationToken) {
      try {
        await attachReservedCreditToEntity({
          creditId: reservation.reservedCreditId,
          entityType: "CYCLE",
          entityId: cycleCount.cycle_count_id,
          reservationToken: reservation.reservationToken
        });
      } catch (e) {
        await releaseReservedCredit({
          creditId: reservation.reservedCreditId,
          reservationToken: reservation.reservationToken
        });
        throw e;
      }
    }

    res.status(201).json({
      message: "Cycle count request created successfully",
      data: cycleCount
    });
  } catch (error: any) {
    if (
      error.message.includes("required") ||
      error.message.includes("Invalid") ||
      error.message.includes("not found") ||
      error.message.includes("does not belong") ||
      error.message.includes("not active") ||
      error.message.includes("past") ||
      error.message.includes("Weekly request limit")
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

/**
 * Get cycle counts (role-based filtering)
 */
export async function getCycleCountsController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.userId;
    const userRole = req.user.role;

    const cycleCounts = await getCycleCounts(userId, userRole);

    res.status(200).json({
      message: "Cycle counts retrieved successfully",
      data: cycleCounts
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

/**
 * Get cycle count by ID
 */
export async function getCycleCountByIdController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const cycleCount = await getCycleCountById(id, userId, userRole);

    res.status(200).json({
      message: "Cycle count retrieved successfully",
      data: cycleCount
    });
  } catch (error: any) {
    if (
      error.message.includes("not found") ||
      error.message.includes("can only") ||
      error.message.includes("not assigned") ||
      error.message.includes("Invalid")
    ) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

/**
 * Approve or reject cycle count
 * Only MANAGER can access this endpoint
 */
export async function approveOrRejectCycleCountController(
  req: Request,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { decision, rejectionReason } = req.body;

    if (!decision || (decision !== "APPROVED" && decision !== "REJECTED")) {
      return res.status(400).json({
        message: "Decision must be either APPROVED or REJECTED"
      });
    }

    if (decision === "REJECTED" && (!rejectionReason || rejectionReason.trim().length === 0)) {
      return res.status(400).json({
        message: "Rejection reason is required when rejecting"
      });
    }

    const dto: ApproveCycleCountDTO = {
      decision,
      rejectionReason: rejectionReason?.trim()
    };

    const managerId = req.user.userId;
    const cycleCount = await approveOrRejectCycleCount(id, managerId, dto);

    res.status(200).json({
      message: `Cycle count ${decision.toLowerCase()} successfully`,
      data: cycleCount
    });
  } catch (error: any) {
    if (
      error.message.includes("not found") ||
      error.message.includes("Only") ||
      error.message.includes("required") ||
      error.message.includes("Invalid")
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

/**
 * Assign staff to cycle count
 * Only MANAGER can access this endpoint
 */
export async function assignStaffToCycleCountController(
  req: Request,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { staffIds, countingDeadline } = req.body;

    if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
      return res.status(400).json({
        message: "At least one staff member must be assigned"
      });
    }

    if (!countingDeadline) {
      return res.status(400).json({
        message: "Counting deadline is required"
      });
    }

    const dto: AssignStaffDTO = {
      staffIds,
      countingDeadline: new Date(countingDeadline)
    };

    const managerId = req.user.userId;
    const cycleCount = await assignStaffToCycleCount(id, managerId, dto);

    res.status(200).json({
      message: "Staff assigned successfully",
      data: cycleCount
    });
  } catch (error: any) {
    if (
      error.message.includes("not found") ||
      error.message.includes("must be") ||
      error.message.includes("required") ||
      error.message.includes("Invalid") ||
      error.message.includes("past") ||
      error.message.includes("not allowed")
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

/**
 * Submit cycle count result
 * Only STAFF can access this endpoint
 */
export async function submitCycleCountResultController(
  req: Request,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Items array is required and must not be empty"
      });
    }

    const dto: SubmitCycleCountResultDTO = {
      items: items.map((item: any) => ({
        storedItemId: item.storedItemId,
        shelfId: item.shelfId,
        countedQuantity: Number(item.countedQuantity),
        note: item.note?.trim()
      }))
    };

    const staffId = req.user.userId;
    const cycleCount = await submitCycleCountResult(id, staffId, dto);

    res.status(200).json({
      message: "Cycle count result submitted successfully",
      data: cycleCount
    });
  } catch (error: any) {
    if (
      error.message.includes("not found") ||
      error.message.includes("not assigned") ||
      error.message.includes("must be") ||
      error.message.includes("required") ||
      error.message.includes("Invalid") ||
      error.message.includes("does not belong")
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

/**
 * Confirm cycle count
 * CUSTOMER duyệt kết quả cuối cùng (không điều chỉnh tồn kho)
 */
export async function confirmCycleCountController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const cycleCount = await confirmCycleCount(id, userId, userRole);

    res.status(200).json({
      message: "Cycle count confirmed successfully",
      data: cycleCount
    });
  } catch (error: any) {
    if (
      error.message.includes("not found") ||
      error.message.includes("must be") ||
      error.message.includes("can only") ||
      error.message.includes("Invalid")
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

/**
 * Request recount
 * Only MANAGER can access this endpoint
 */
export async function requestRecountController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const managerId = req.user.userId;

    const cycleCount = await requestRecount(id, managerId);

    res.status(200).json({
      message: "Recount requested successfully",
      data: cycleCount
    });
  } catch (error: any) {
    if (
      error.message.includes("not found") ||
      error.message.includes("must be") ||
      error.message.includes("Invalid")
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

/**
 * CUSTOMER yêu cầu điều chỉnh tồn kho theo kết quả kiểm kê
 */
export async function requestInventoryAdjustmentController(
  req: Request,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const customerId = req.user.userId;
    const { reason } = req.body || {};

    const cycleCount = await requestInventoryAdjustment(id, customerId, { reason });

    res.status(200).json({
      message: "Inventory adjustment requested successfully",
      data: cycleCount
    });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";

    if (
      msg.includes("not found") ||
      msg.includes("must be") ||
      msg.includes("Invalid") ||
      msg.includes("only") ||
      msg.includes("No discrepancies")
    ) {
      return res.status(400).json({ message: msg });
    }

    res.status(500).json({
      message: msg
    });
  }
}

/**
 * MANAGER áp dụng điều chỉnh tồn kho từ kết quả kiểm kê
 */
export async function applyCycleCountAdjustmentController(
  req: Request,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const managerId = req.user.userId;

    const cycleCount = await applyCycleCountAdjustment(id, managerId);

    res.status(200).json({
      message: "Cycle count adjustment applied successfully",
      data: cycleCount
    });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";

    if (
      msg.includes("not found") ||
      msg.includes("must be") ||
      msg.includes("Invalid") ||
      msg.includes("Manager not found") ||
      msg.includes("has no items to adjust")
    ) {
      return res.status(400).json({ message: msg });
    }

    res.status(500).json({
      message: msg
    });
  }
}
