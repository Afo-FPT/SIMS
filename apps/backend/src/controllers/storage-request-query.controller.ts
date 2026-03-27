import { Request, Response } from "express";
import {
  listStorageRequests,
  getStorageRequestById,
  ListStorageRequestsQuery
} from "../services/storage-request-query.service";

/**
 * GET /api/storage-requests
 * Authorization: Customer (own), Manager/Staff/Admin (all)
 */
export async function listStorageRequestsController(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const query: ListStorageRequestsQuery = {
      requestType: (req.query.requestType as any) || undefined,
      status: (req.query.status as any) || undefined
    };

    const data = await listStorageRequests(req.user.userId, req.user.role, query);
    return res.json({ message: "Storage requests retrieved successfully", data });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";
    if (msg.includes("Invalid") || msg.includes("must be")) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: msg });
  }
}

/**
 * GET /api/storage-requests/:id
 * Authorization: Customer (own), Manager/Staff/Admin (any)
 */
export async function getStorageRequestByIdController(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const data = await getStorageRequestById(id, req.user.userId, req.user.role);
    return res.json({ message: "Storage request retrieved successfully", data });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";
    if (msg.includes("Invalid") || msg.includes("not found") || msg.includes("Access denied")) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: msg });
  }
}

