import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAiRuntimeSettings } from "./ai-settings.service";
import { withGeminiRetry } from "./ai-gemini.util";

type ReportInsightParams = {
  chartKey: string;
  startDate: string;
  endDate: string;
  data: unknown;
  userId?: string;
  role?: string;
};

const MAX_INSIGHT_PAYLOAD_CHARS = 12000;

function compactForInsight(value: unknown, maxArrayItems: number, depth = 0): unknown {
  if (depth > 8) return "[truncated_depth]";
  if (value == null) return value;
  if (typeof value !== "object") return value;

  if (Array.isArray(value)) {
    if (value.length <= maxArrayItems) {
      return value.map((v) => compactForInsight(v, maxArrayItems, depth + 1));
    }
    return {
      _note: "array truncated for insight context",
      totalItems: value.length,
      sampleItems: value
        .slice(0, maxArrayItems)
        .map((v) => compactForInsight(v, maxArrayItems, depth + 1)),
    };
  }

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = compactForInsight(v, maxArrayItems, depth + 1);
  }
  return out;
}

function serializeInsightData(data: unknown): string {
  const attempts = [120, 80, 50, 30, 20, 10];
  let last = "{}";
  for (const maxArrayItems of attempts) {
    const compacted = compactForInsight(data ?? {}, maxArrayItems);
    const text = JSON.stringify(compacted);
    last = text;
    if (text.length <= MAX_INSIGHT_PAYLOAD_CHARS) {
      return text;
    }
  }
  // Hard fallback: still keep valid JSON and explicit notice.
  return JSON.stringify({
    _note: "payload heavily truncated due size",
    preview: last.slice(0, MAX_INSIGHT_PAYLOAD_CHARS),
  });
}

function buildFallbackInsight(params: ReportInsightParams): string {
  const { chartKey, startDate, endDate, data } = params;
  const asObj = (data && typeof data === "object" ? (data as Record<string, unknown>) : {}) || {};

  const heading = [
    "### Executive summary",
    `Auto-generated insight for **${chartKey}** (${startDate} -> ${endDate}) because AI output was empty.`,
    "",
    "### Evidence from chart",
  ];

  if (chartKey === "io_history") {
    const trend = Array.isArray(asObj.ioTrend) ? (asObj.ioTrend as Array<Record<string, unknown>>) : [];
    const inbound = trend.reduce((s, r) => s + Number(r.inbound || 0), 0);
    const outbound = trend.reduce((s, r) => s + Number(r.outbound || 0), 0);
    return [
      ...heading,
      `- Periods in range: **${trend.length}**`,
      `- Total inbound quantity: **${inbound.toLocaleString("en-US")}**`,
      `- Total outbound quantity: **${outbound.toLocaleString("en-US")}**`,
      "",
      "### Assessment",
      "- Data payload is available and structured; no major quality issue detected.",
      "- Use this as a baseline until AI-generated narrative is available.",
      "",
      "### Action plan",
      "- Compare inbound vs outbound totals to check stock pressure.",
      "- Review abnormal spikes by period in the chart.",
      "- Re-run insight after next data refresh for richer interpretation.",
    ].join("\n");
  }

  if (chartKey === "discrepancy") {
    const rows = Array.isArray(asObj.discrepancyRows)
      ? (asObj.discrepancyRows as Array<Record<string, unknown>>)
      : [];
    const totalDisc = rows.reduce((s, r) => s + Number(r.discrepancy || 0), 0);
    return [
      ...heading,
      `- Cycle checks included: **${rows.length}**`,
      `- Total discrepancy: **${totalDisc.toLocaleString("en-US")}**`,
      `- Records with non-zero discrepancy: **${rows.filter((r) => Number(r.discrepancy || 0) !== 0).length}**`,
      "",
      "### Assessment",
      "- Payload contains enough numeric rows for trend reading.",
      "- Prioritize non-zero discrepancy cycles for reconciliation.",
      "",
      "### Action plan",
      "- Investigate top discrepancy cycles first.",
      "- Validate counting process and shelf mapping for repeated mismatches.",
      "- Track discrepancy trend after corrective actions.",
    ].join("\n");
  }

  if (chartKey === "request_status") {
    const rows = Array.isArray(asObj.statusRows) ? (asObj.statusRows as Array<Record<string, unknown>>) : [];
    const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
    return [
      ...heading,
      `- Status groups: **${rows.length}**`,
      `- Total requests: **${total.toLocaleString("en-US")}**`,
      `- Largest bucket: **${rows.sort((a, b) => Number(b.total || 0) - Number(a.total || 0))[0]?.status ?? "N/A"}**`,
      "",
      "### Assessment",
      "- Distribution is available for workload/throughput interpretation.",
      "- Focus on high pending/in-progress buckets if they dominate.",
      "",
      "### Action plan",
      "- Monitor backlog-driving statuses daily.",
      "- Escalate long-staying requests in non-terminal statuses.",
      "- Rebalance operations capacity if pending share remains high.",
    ].join("\n");
  }

  if (chartKey === "top_products") {
    const rows = Array.isArray(asObj.topProductsByQuantity)
      ? (asObj.topProductsByQuantity as Array<Record<string, unknown>>)
      : [];
    const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
    return [
      ...heading,
      `- Products in ranking: **${rows.length}**`,
      `- Total moved quantity in ranking: **${total.toLocaleString("en-US")}**`,
      `- Top product: **${String(rows[0]?.name || "N/A")}**`,
      "",
      "### Assessment",
      "- Product concentration can be evaluated from ranking totals.",
      "- High concentration may indicate replenishment or allocation risk.",
      "",
      "### Action plan",
      "- Prioritize slotting and replenishment for top products.",
      "- Check picking efficiency for high-volume SKUs.",
      "- Re-run insight after demand changes to detect shifts.",
    ].join("\n");
  }

  const keys = Object.keys(asObj);
  return [
    ...heading,
    `- Available data fields: **${keys.length}**`,
    `- Fields: ${keys.slice(0, 8).join(", ") || "none"}`,
    "- Data payload was received but AI returned empty content.",
    "",
    "### Assessment",
    "- Data exists; this is likely a model-side empty response.",
    "- The chart can still be interpreted manually from the shown metrics.",
    "",
    "### Action plan",
    "- Retry insight generation.",
    "- Narrow the date range if chart payload is too broad.",
    "- Keep monitoring for repeated empty-model responses.",
  ].join("\n");
}

function buildSystemInstruction(chartKey: string, startDate: string, endDate: string): string {
  if (chartKey === "manager_deep_expiry_stacked") {
    return [
      "You are a SIMS warehouse analytics assistant for managers.",
      "Use ONLY the JSON payload (bucket totals and contractAlerts / zoneLeaseAlerts / focus* fields). Do not invent contract codes or names.",
      "Respond in English using Markdown headings and bullet points.",
      "Write a detailed response of around 220-380 words.",
      "You MUST mention at least one specific contractCode and customerName from contractAlerts or zoneLeaseAlerts when that array is non-empty (e.g. which contracts are expired or expiring soon and by when).",
      "If shelfCodes appear for a zone lease, you may reference them as shelf location hints.",
      "Include EXACT sections in this order: Executive summary, Evidence from chart, Assessment, Action plan.",
      "In Evidence from chart, include at least 3 bullet points with concrete numbers from payload.",
      "In Assessment, provide explicit judgement: trend direction, urgency level (Low/Medium/High), and operational impact.",
      "In Action plan, provide 3-5 prioritized actions with short rationale and expected effect.",
      `Reporting window: ${startDate} → ${endDate}.`
    ].join("\n");
  }
  if (chartKey.startsWith("manager_deep_")) {
    return [
      "You are a SIMS analytics assistant for warehouse managers.",
      "Use only the attached JSON data; do not invent numbers.",
      "Respond in English using Markdown headings and concise bullet points.",
      "Write around 190-330 words so the chart is clearly explained.",
      "Include EXACT sections in this order: Executive summary, Evidence from chart, Assessment, Action plan.",
      "Evidence from chart must include at least 3 bullets and each bullet must cite concrete values.",
      "Assessment must state what is going well, what is risky, and urgency level (Low/Medium/High).",
      "Action plan must include 3-5 prioritized recommendations.",
      `Reporting window: ${startDate} → ${endDate}.`
    ].join("\n");
  }
  return [
    "You are an operations-report analytics assistant for the SIMS warehouse system.",
    "Read the provided chart JSON and provide useful business insights for managers.",
    "Use only the data in the JSON payload (no fabricated values). If data is insufficient, clearly state the limitation.",
    "Respond strictly in English.",
    "Use Markdown headings and bullet points; do not use Markdown tables.",
    "Write a substantive response around 170-320 words; avoid generic wording.",
    "Answer using EXACT sections in this order:",
    "1) Executive summary",
    "2) Evidence from chart",
    "3) Assessment",
    "4) Action plan",
    "Section requirements:",
    "- Evidence from chart: at least 3 bullets with explicit numbers/labels from payload.",
    "- Assessment: provide judgement on trend direction, severity/urgency (Low/Medium/High), and likely business impact.",
    "- Action plan: provide 3-5 prioritized recommendations; include quick wins first.",
    "If data quality is poor, explicitly state what is missing and still provide best-effort assessment.",
    `Reporting window: ${startDate} -> ${endDate}.`
  ].join("\n");
}

export async function getReportInsight(params: ReportInsightParams): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const aiSettings = await getAiRuntimeSettings();
  if (!aiSettings.enabled) {
    throw new Error("AI is currently disabled by admin settings.");
  }

  const modelName = aiSettings.insightModel || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const startDate = params.startDate;
  const endDate = params.endDate;
  const chartKey = params.chartKey;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: buildSystemInstruction(chartKey, startDate, endDate),
    generationConfig: {
      temperature: aiSettings.temperature,
      // Avoid overly short chart insights when admin sets a low token cap.
      maxOutputTokens: Math.max(1400, aiSettings.maxOutputTokens),
    },
  });

  // Keep payload within model limits while preserving valid JSON structure.
  const dataStr = serializeInsightData(params.data ?? {});

  const prompt = [
    `chartKey: ${chartKey}`,
    `startDate: ${startDate}`,
    `endDate: ${endDate}`,
    "data(JSON):",
    dataStr
  ].join("\n");

  const chat = model.startChat();
  const result = await withGeminiRetry(() => chat.sendMessage(prompt));
  const text = result?.response?.text?.() ?? "";

  const trimmed = String(text).trim();

  let sanitized = trimmed;

  // Remove any trailing open-ended question line.
  const lines = sanitized.split(/\r?\n/);
  if (lines.length > 0) {
    const last = lines[lines.length - 1];
    if (/[?？]\s*$/.test(last.trim())) {
      lines.pop();
    }
  }

  sanitized = lines.join("\n").trim();
  return sanitized || buildFallbackInsight(params);
}

