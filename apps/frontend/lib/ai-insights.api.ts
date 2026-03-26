import { apiJson } from "./api-client";

export type ReportInsightChartKey = string;

export type RequestReportInsightParams = {
  chartKey: ReportInsightChartKey;
  startDate: string;
  endDate: string;
  data: unknown;
};

export async function requestReportInsight(
  params: RequestReportInsightParams
): Promise<{ insight: string }> {
  return apiJson<{ insight: string }>("/ai/insights", {
    method: "POST",
    body: JSON.stringify(params)
  });
}

