import { Request, Response } from "express";
import {
  staffCompleteStorageRequest,
  StaffCompleteStorageRequestDTO
} from "../services/staff-storage-request.service";

/**
 * PATCH /api/staff/storage-requests/:id/complete
 * Authorization: Staff only
 */
export async function staffCompleteStorageRequestController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { items } = req.body;

    const dto: StaffCompleteStorageRequestDTO = { items };
    const data = await staffCompleteStorageRequest(id, dto, req.user!.userId);

    return res.json({
      message: "Storage request completed by staff successfully",
      data
    });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";

    if (
      msg.includes("Invalid") ||
      msg.includes("required") ||
      msg.includes("must be") ||
      msg.includes("not found") ||
      msg.includes("Only") ||
      msg.includes("does not belong") ||
      msg.includes("Not enough") ||
      msg.includes("has no items") ||
      msg.includes("not assigned") ||
      msg.includes("capacity") ||
      msg.includes("Remaining") ||
      msg.includes("enough remaining") ||
      msg.includes("Contract has expired") ||
      msg.includes("Contract is terminated") ||
      msg.includes("Contract is not active")
    ) {
      return res.status(400).json({ message: msg });
    }

    return res.status(500).json({ message: msg });
  }
}

