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
    const data = await listContractPackages();
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
    const { name, duration, unit, price, description } = req.body;

    if (!name || !duration || !unit || price === undefined) {
      return res.status(400).json({
        message: "name, duration, unit, and price are required"
      });
    }

    const pkg = await createContractPackage({
      name,
      duration,
      unit,
      price,
      description
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
    const { name, duration, unit, price, description } = req.body;

    const updated = await updateContractPackage(id, {
      name,
      duration,
      unit,
      price,
      description
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

