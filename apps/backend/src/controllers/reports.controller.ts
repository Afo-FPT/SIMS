import { Request, Response } from "express";
import {
  getManagerReport,
  getTopOutboundProducts,
  getApprovalRateByManager,
  getProcessingTimeStats,
  getManagerExpiryStackedReport,
  getManagerZonePricingComboData,
  getManagerPenaltyTopCustomers,
  getManagerRevenueReport,
  type ManagerDeepReportGranularity
} from "../services/reports.service";

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

/**
 * GET /api/reports/top-outbound-products?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Manager/Admin: top 10 products by outbound quantity (last 30/90 days)
 */
export async function getTopOutboundProductsController(
  req: Request,
  res: Response
) {
  try {
    const startDate = (req.query.startDate as string) || "";
    const endDate = (req.query.endDate as string) || "";

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

    const data = await getTopOutboundProducts(startDate, endDate);
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/reports/approval-by-manager?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Manager/Admin: approval rate by manager (Inbound + Outbound)
 */
export async function getApprovalByManagerController(req: Request, res: Response) {
  try {
    const startDate = (req.query.startDate as string) || "";
    const endDate = (req.query.endDate as string) || "";

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

    const data = await getApprovalRateByManager(startDate, endDate);
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/reports/processing-time?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&granularity=week|month
 * Manager/Admin: average processing time (creation to approval/rejection) by week/month
 */
export async function getProcessingTimeController(req: Request, res: Response) {
  try {
    const startDate = (req.query.startDate as string) || "";
    const endDate = (req.query.endDate as string) || "";
    const granularity =
      ((req.query.granularity as string) || "week") === "month" ? "month" : "week";

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

    const data = await getProcessingTimeStats(startDate, endDate, granularity);
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

function parseDeepGranularity(raw: string | undefined): ManagerDeepReportGranularity | null {
  const g = (raw || "monthly").toLowerCase();
  if (g === "daily" || g === "monthly" || g === "yearly") return g;
  return null;
}

/**
 * GET /api/reports/manager/expiry-stacked?startDate&endDate&granularity=daily|monthly|yearly
 */
export async function getManagerExpiryStackedController(req: Request, res: Response) {
  try {
    const startDate = (req.query.startDate as string) || "";
    const endDate = (req.query.endDate as string) || "";
    const granularity = parseDeepGranularity(req.query.granularity as string);

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate are required (YYYY-MM-DD)"
      });
    }
    if (!granularity) {
      return res.status(400).json({
        message: "granularity must be daily, monthly, or yearly"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid startDate or endDate format" });
    }
    if (start > end) {
      return res.status(400).json({ message: "startDate must be before or equal to endDate" });
    }

    const data = await getManagerExpiryStackedReport(startDate, endDate, granularity);
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/reports/manager/zone-pricing-combo?startDate&endDate
 */
export async function getManagerZonePricingComboController(req: Request, res: Response) {
  try {
    const startDate = (req.query.startDate as string) || "";
    const endDate = (req.query.endDate as string) || "";

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate are required (YYYY-MM-DD)"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid startDate or endDate format" });
    }
    if (start > end) {
      return res.status(400).json({ message: "startDate must be before or equal to endDate" });
    }

    const data = await getManagerZonePricingComboData(startDate, endDate);
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/reports/manager/penalty-top-customers?startDate&endDate&limit=
 */
export async function getManagerPenaltyTopCustomersController(req: Request, res: Response) {
  try {
    const startDate = (req.query.startDate as string) || "";
    const endDate = (req.query.endDate as string) || "";
    const limitRaw = parseInt(String(req.query.limit || "10"), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, limitRaw)) : 10;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate are required (YYYY-MM-DD)"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid startDate or endDate format" });
    }
    if (start > end) {
      return res.status(400).json({ message: "startDate must be before or equal to endDate" });
    }

    const data = await getManagerPenaltyTopCustomers(startDate, endDate, limit);
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/reports/manager/revenue?startDate&endDate&granularity=week|month
 */
export async function getManagerRevenueReportController(req: Request, res: Response) {
  try {
    const startDate = (req.query.startDate as string) || "";
    const endDate = (req.query.endDate as string) || "";
    const granularity = ((req.query.granularity as string) || "week") === "month" ? "month" : "week";

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate are required (YYYY-MM-DD)"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid startDate or endDate format" });
    }
    if (start > end) {
      return res.status(400).json({ message: "startDate must be before or equal to endDate" });
    }

    const data = await getManagerRevenueReport(startDate, endDate, granularity);
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
