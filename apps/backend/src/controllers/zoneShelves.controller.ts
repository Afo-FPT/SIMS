import { Request, Response } from "express";
import { listAvailableShelvesByZone } from "../services/shelf.service";

export async function listAvailableShelvesByZoneController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { zoneId } = req.params;
    const data = await listAvailableShelvesByZone(zoneId);
    return res.json({ message: "Zone shelves retrieved successfully", data });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";
    if (msg.includes("Invalid") || msg.includes("not found")) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: msg });
  }
}

