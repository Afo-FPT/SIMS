import { Request, Response } from "express";
import {
  assignStaffToWarehouse,
  listActiveStaffWithWarehouse,
  listWarehousesWithAssignedStaff,
  unassignStaffFromWarehouse,
} from "../services/staff-warehouse.service";

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

export async function listWarehousesWithAssignedStaffController(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const rows = await listWarehousesWithAssignedStaff({ search });
    return res.json({
      message: "Warehouses retrieved successfully",
      data: rows,
    });
  } catch (error: any) {
    const msg = error?.message || "Failed to load warehouse assignments";
    return res.status(500).json({ message: msg });
  }
}

export async function assignStaffToWarehouseController(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { warehouseId } = req.params;
    const staffId = req.body?.staffId;
    if (typeof staffId !== "string" || !staffId.trim()) {
      return res.status(400).json({ message: "staffId is required" });
    }

    const data = await assignStaffToWarehouse(warehouseId, staffId.trim());

    return res.json({
      message: "Warehouse staff updated successfully",
      data,
    });
  } catch (error: any) {
    const msg = error?.message || "Failed to update warehouse staff";
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

export async function unassignStaffFromWarehouseController(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { warehouseId } = req.params;
    const data = await unassignStaffFromWarehouse(warehouseId);

    return res.json({
      message: "Warehouse staff removed successfully",
      data,
    });
  } catch (error: any) {
    const msg = error?.message || "Failed to remove warehouse staff";
    if (
      msg.includes("Invalid warehouse id") ||
      msg.includes("Warehouse not found")
    ) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: msg });
  }
}

