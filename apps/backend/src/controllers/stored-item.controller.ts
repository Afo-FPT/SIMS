import { Request, Response } from "express";
import { getMyStoredItems } from "../services/stored-item.service";

/**
 * GET /api/stored-items/my?contractId=...
 * Authorization: Customer only
 */
export async function getMyStoredItemsController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const contractId = (req.query.contractId as string | undefined) || undefined;
    const data = await getMyStoredItems(req.user.userId, contractId);

    return res.json({
      message: "Stored items retrieved successfully",
      data
    });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";

    if (
      msg.includes("Invalid") ||
      msg.includes("not found") ||
      msg.includes("does not belong")
    ) {
      return res.status(400).json({ message: msg });
    }

    return res.status(500).json({ message: msg });
  }
}

