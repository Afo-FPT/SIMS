import { Request, Response } from "express";
import {
  createWarehouseIssueReport,
  CreateWarehouseIssueReportDTO
} from "../services/warehouse-issue-report.service";

/**
 * STAFF creates a warehouse issue report. Note is required.
 */
export async function createWarehouseIssueReportController(
  req: Request,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { note, warehouseId, type } = req.body;

    const dto: CreateWarehouseIssueReportDTO = {
      note: note ?? "",
      warehouseId: warehouseId?.trim() || undefined,
      type: type?.trim() || undefined
    };

    const staffId = req.user.userId;
    const report = await createWarehouseIssueReport(staffId, dto);

    res.status(201).json({
      message: "Warehouse issue report submitted successfully",
      data: report
    });
  } catch (error: any) {
    if (
      error.message.includes("required") ||
      error.message.includes("cannot be empty") ||
      error.message.includes("Invalid")
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}
