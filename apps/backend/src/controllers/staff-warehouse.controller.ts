import { Request, Response } from "express";
import { listActiveStaffWithWarehouse, transferStaffWarehouse } from "../services/staff-warehouse.service";

export async function listStaffWithWarehouseController(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const warehouseId = typeof req.query.warehouseId === "string" ? req.query.warehouseId : "";
    const staffs = await listActiveStaffWithWarehouse({ search, warehouseId });

    return res.json({
      message: "Active staffs retrieved successfully",
      data: staffs,
    });
  } catch (error: any) {
    const msg = error?.message || "Failed to load active staffs";
    if (msg.includes("Invalid warehouse id")) return res.status(400).json({ message: msg });
    return res.status(500).json({ message: msg });
  }
}

export async function transferStaffWarehouseController(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { staffId } = req.params;
    const warehouseId = req.body?.warehouseId;
    if (typeof warehouseId !== "string" || !warehouseId.trim()) {
      return res.status(400).json({ message: "warehouseId is required" });
    }

    const data = await transferStaffWarehouse(staffId, warehouseId.trim());

    return res.json({
      message: "Staff warehouse updated successfully",
      data,
    });
  } catch (error: any) {
    const msg = error?.message || "Failed to update staff warehouse";
    if (
      msg.includes("Invalid staff id") ||
      msg.includes("Invalid warehouse id") ||
      msg.includes("Staff not found") ||
      msg.includes("Warehouse not found")
    ) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: msg });
  }
}

