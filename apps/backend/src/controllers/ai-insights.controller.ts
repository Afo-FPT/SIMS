import { Request, Response } from "express";
import { getReportInsight } from "../services/ai-insights.service";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function aiInsightsController(req: Request, res: Response) {
  try {
    const { chartKey, startDate, endDate, data } = req.body ?? {};

    if (!isNonEmptyString(chartKey) || !isNonEmptyString(startDate) || !isNonEmptyString(endDate)) {
      return res.status(400).json({
        message: "chartKey, startDate, endDate are required"
      });
    }

    const insight = await getReportInsight({
      chartKey,
      startDate,
      endDate,
      data,
      // `authenticate` middleware should attach user info.
      // We keep them optional so this endpoint is resilient.
      userId: (req as any).user?.userId ?? "unknown",
      role: (req as any).user?.role ?? "customer"
    });

    return res.json({
      message: "ok",
      data: { insight }
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error?.message || "Failed to generate insight"
    });
  }
}

