import { Request, Response } from "express";
import { customerConfirmStorageRequest } from "../services/storage-request-confirm.service";

/**
 * PATCH /api/storage-requests/:id/confirm
 * Authorization: Customer only
 */
export async function customerConfirmStorageRequestController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const data = await customerConfirmStorageRequest(id, req.user.userId);

    return res.json({
      message: "Storage request confirmed successfully",
      data
    });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";

    if (
      msg.includes("Invalid") ||
      msg.includes("not found") ||
      msg.includes("does not belong") ||
      msg.includes("Only DONE_BY_STAFF")
    ) {
      return res.status(400).json({ message: msg });
    }

    return res.status(500).json({ message: msg });
  }
}

