import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAiRuntimeSettings } from "./ai-settings.service";
import { withGeminiRetry } from "./ai-gemini.util";

export type ZonePricingInputRow = {
  zoneCode: string;
  occupancyPercent: number;
  avgMonthlyRent: number;
};

/**
 * Returns suggested monthly rent per zone (same order as input). Uses Gemini when enabled; otherwise heuristic from occupancy vs avg rent.
 */
export async function suggestZoneMonthlyPrices(rows: ZonePricingInputRow[]): Promise<number[]> {
  if (rows.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  const aiSettings = await getAiRuntimeSettings();

  if (!apiKey || !aiSettings.enabled) {
    return rows.map((r) => heuristicSuggestedPrice(r));
  }

  try {
    const modelName = aiSettings.insightModel || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: [
        "You are a warehouse pricing assistant for SIMS.",
        "Input is JSON: array of { zoneCode, occupancyPercent, avgMonthlyRent }.",
        "Output ONLY a JSON array of numbers: suggested monthly rent for each row in the same order.",
        "No markdown, no explanation, no extra keys. Round to whole currency units.",
        "Consider: higher occupancy may support modest price increases; very low occupancy may need decreases vs avgMonthlyRent.",
        "Keep suggestions within 0.7x to 1.35x of avgMonthlyRent unless occupancy is extreme."
      ].join("\n"),
      generationConfig: {
        temperature: Math.min(0.5, aiSettings.temperature),
        maxOutputTokens: Math.min(1024, aiSettings.maxOutputTokens)
      }
    });

    const prompt = `zones(JSON): ${JSON.stringify(rows)}`;
    const result = await withGeminiRetry(() => model.generateContent(prompt));
    const text = result?.response?.text?.() ?? "";
    const match = text.match(/\[[\s\d.,-]+\]/);
    const jsonStr = match ? match[0] : text.trim();
    const parsed = JSON.parse(jsonStr) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== rows.length) {
      return rows.map((r) => heuristicSuggestedPrice(r));
    }
    return parsed.map((n, i) => {
      const num = Number(n);
      if (!Number.isFinite(num) || num < 0) return heuristicSuggestedPrice(rows[i]);
      return Math.round(num);
    });
  } catch {
    return rows.map((r) => heuristicSuggestedPrice(r));
  }
}

function heuristicSuggestedPrice(r: ZonePricingInputRow): number {
  const base = r.avgMonthlyRent || 0;
  if (base <= 0) return 0;
  const occ = r.occupancyPercent / 100;
  const factor = 0.92 + occ * 0.2;
  return Math.max(0, Math.round(base * Math.min(1.25, Math.max(0.75, factor))));
}
