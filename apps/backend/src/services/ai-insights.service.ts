import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAiRuntimeSettings } from "./ai-settings.service";

type ReportInsightParams = {
  chartKey: string;
  startDate: string;
  endDate: string;
  data: unknown;
  userId?: string;
  role?: string;
};

function buildSystemInstruction(chartKey: string, startDate: string, endDate: string): string {
  if (chartKey === "manager_deep_expiry_stacked") {
    return [
      "You are a SIMS warehouse analytics assistant for managers.",
      "Use ONLY the JSON payload (bucket totals and contractAlerts / zoneLeaseAlerts / focus* fields). Do not invent contract codes or names.",
      "Respond in English, 2–4 short sentences in one paragraph.",
      "You MUST mention at least one specific contractCode and customerName from contractAlerts or zoneLeaseAlerts when that array is non-empty (e.g. which contracts are expired or expiring soon and by when).",
      "If shelfCodes appear for a zone lease, you may reference them as shelf location hints.",
      `Reporting window: ${startDate} → ${endDate}.`
    ].join("\n");
  }
  if (chartKey.startsWith("manager_deep_")) {
    return [
      "You are a SIMS analytics assistant for warehouse managers.",
      "Use only the attached JSON data; do not invent numbers.",
      "Respond in English only, in 2-3 concise sentences in a single paragraph.",
      `Reporting window: ${startDate} → ${endDate}.`
    ].join("\n");
  }
  return [
    "You are an operations-report analytics assistant for the SIMS warehouse system.",
    "Read the provided chart JSON and provide useful business insights for managers.",
    "Use only the data in the JSON payload (no fabricated values). If data is insufficient, clearly state the limitation.",
    "Respond strictly in English.",
    "You may use light Markdown for emphasis (e.g., **keyword**), but don't use Markdown tables.",
    "Answer using this structure:",
    "- 1-2 sentences summarizing the main trend",
    "- 2 notable points or anomalies (or explicitly state none are clear)",
    "- 1-2 plausible causes (as hypotheses)",
    "- 1-2 concrete action recommendations",
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
      maxOutputTokens: aiSettings.maxOutputTokens,
    },
  });

  // Limit payload size to avoid exceeding model limits.
  const rawDataStr = JSON.stringify(params.data ?? {});
  const dataStr = rawDataStr.length > 12000 ? rawDataStr.slice(0, 12000) : rawDataStr;

  const prompt = [
    `chartKey: ${chartKey}`,
    `startDate: ${startDate}`,
    `endDate: ${endDate}`,
    "data(JSON):",
    dataStr
  ].join("\n");

  const chat = model.startChat();
  const result = await chat.sendMessage(prompt);
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
  return sanitized || "Insufficient data to produce a clear insight.";
}

