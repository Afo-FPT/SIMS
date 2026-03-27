import { Request, Response } from "express";
import { getOrCreateSpaceLimits, updateSpaceLimits } from "../services/system-setting.service";

export async function getSpaceLimitsController(_req: Request, res: Response) {
  try {
    const data = await getOrCreateSpaceLimits();
    return res.json({ message: "Space limits retrieved successfully", data });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Internal server error" });
  }
}

export async function updateSpaceLimitsController(req: Request, res: Response) {
  try {
    const zone = Number(req.body?.zone_area_percent_of_warehouse);
    const shelf = Number(req.body?.shelf_area_percent_of_zone);
    const data = await updateSpaceLimits({
      zone_area_percent_of_warehouse: zone,
      shelf_area_percent_of_zone: shelf,
    });
    return res.json({ message: "Space limits updated successfully", data });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";
    if (msg.includes("must be a number")) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: msg });
  }
}
