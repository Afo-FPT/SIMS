import { Request, Response } from "express";
import { createZone, listZonesByWarehouse, CreateZoneRequest } from "../services/zone.service";

export async function createZoneController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { warehouseId } = req.params;
    const { zoneCode, name, description } = req.body;
    if (!zoneCode || !name) {
      return res.status(400).json({ message: "zoneCode and name are required" });
    }
    const payload: CreateZoneRequest = { zoneCode, name, description };
    const zone = await createZone(warehouseId, payload, req.user.userId);
    res.status(201).json({
      message: "Zone created successfully",
      data: zone
    });
  } catch (error: any) {
    if (
      error.message.includes("required") ||
      error.message.includes("not found") ||
      error.message.includes("already exists") ||
      error.message.includes("Invalid")
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function listZonesByWarehouseController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { warehouseId } = req.params;
    const zones = await listZonesByWarehouse(warehouseId);
    res.json({
      message: "Zones retrieved successfully",
      data: zones
    });
  } catch (error: any) {
    if (error.message.includes("not found") || error.message.includes("Invalid")) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}
