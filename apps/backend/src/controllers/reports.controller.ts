import { Request, Response } from "express";
import { getManagerReport } from "../services/reports.service";

/**
 * GET /api/reports?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&granularity=day|week
 * Manager/Admin: lấy dữ liệu báo cáo operations (gồm trend + anomalies)
 */
export async function getManagerReportController(
  req: Request,
  res: Response
) {
  try {
    const startDate = (req.query.startDate as string) || "";
    const endDate = (req.query.endDate as string) || "";
    const granularity = ((req.query.granularity as string) || "day") === "week" ? "week" : "day";

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate are required (YYYY-MM-DD)"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Invalid startDate or endDate format"
      });
    }
    if (start > end) {
      return res.status(400).json({
        message: "startDate must be before or equal to endDate"
      });
    }

    const report = await getManagerReport(startDate, endDate, granularity);
    res.json({ data: report });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
