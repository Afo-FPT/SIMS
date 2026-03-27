import { Request, Response } from "express";
import {
  createContractPackage,
  listContractPackages,
  updateContractPackage
} from "../services/contract-package.service";

export async function listContractPackagesController(
  req: Request,
  res: Response
) {
  try {
    const warehouseId = typeof req.query.warehouseId === "string" ? req.query.warehouseId : undefined;
    const includeInactive = req.user?.role === "manager";
    const data = await listContractPackages(warehouseId, includeInactive);
    return res.json({ data });
  } catch (error) {
    console.error("Error listing contract packages:", error);
    return res.status(500).json({ message: "Failed to list contract packages" });
  }
}

export async function createContractPackageController(
  req: Request,
  res: Response
) {
  try {
    const { name, warehouseId, duration, unit, pricePerM2, pricePerDay, description, isActive } = req.body;

    if (!name || !String(name).trim() || !warehouseId || !duration || !unit || pricePerM2 == null || pricePerDay == null) {
      return res.status(400).json({
        message: "name, warehouseId, duration, unit, pricePerM2, and pricePerDay are required"
      });
    }
    const d = Number(duration);
    const m2 = Number(pricePerM2);
    const day = Number(pricePerDay);
    if (!Number.isFinite(d) || d <= 0) {
      return res.status(400).json({ message: "duration must be > 0" });
    }
    if (!Number.isFinite(m2) || m2 <= 0) {
      return res.status(400).json({ message: "pricePerM2 must be > 0" });
    }
    if (!Number.isFinite(day) || day <= 0) {
      return res.status(400).json({ message: "pricePerDay must be > 0" });
    }

    const pkg = await createContractPackage({
      name,
      warehouseId,
      duration: d,
      unit,
      pricePerM2: m2,
      pricePerDay: day,
      description,
      ...(isActive == null ? {} : { isActive: Boolean(isActive) })
    });

    return res.status(201).json({ data: pkg });
  } catch (error) {
    console.error("Error creating contract package:", error);
    return res.status(500).json({ message: "Failed to create contract package" });
  }
}

export async function updateContractPackageController(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;
    const { name, warehouseId, duration, unit, pricePerM2, pricePerDay, description, isActive } = req.body;

    const updated = await updateContractPackage(id, {
      name,
      warehouseId,
      duration,
      unit,
      pricePerM2: pricePerM2 == null ? undefined : Number(pricePerM2),
      pricePerDay: pricePerDay == null ? undefined : Number(pricePerDay),
      description,
      isActive: isActive == null ? undefined : Boolean(isActive)
    });

    if (!updated) {
      return res.status(404).json({ message: "Contract package not found" });
    }

    return res.json({ data: updated });
  } catch (error) {
    console.error("Error updating contract package:", error);
    return res.status(500).json({ message: "Failed to update contract package" });
  }
}

