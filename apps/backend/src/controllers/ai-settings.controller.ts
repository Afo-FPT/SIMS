import { Request, Response } from "express";
import { getAiSettings, updateAiSettings, type AiSettingsPayload } from "../services/ai-settings.service";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function getAiSettingsController(req: Request, res: Response) {
  try {
    const settings = await getAiSettings();
    return res.json({ message: "ok", data: settings });
  } catch (error: any) {
    return res.status(500).json({
      message: error?.message || "Failed to load AI settings",
    });
  }
}

export async function updateAiSettingsController(req: Request, res: Response) {
  try {
    const payload = req.body ?? {};
    const normalized: AiSettingsPayload = {};

    if ("enabled" in payload) {
      if (typeof payload.enabled !== "boolean") {
        return res.status(400).json({ message: "enabled must be a boolean" });
      }
      normalized.enabled = payload.enabled;
    }

    if ("chatModel" in payload) {
      if (!isNonEmptyString(payload.chatModel)) {
        return res.status(400).json({ message: "chatModel must be a non-empty string" });
      }
      normalized.chatModel = payload.chatModel.trim();
    }

    if ("insightModel" in payload) {
      if (!isNonEmptyString(payload.insightModel)) {
        return res.status(400).json({ message: "insightModel must be a non-empty string" });
      }
      normalized.insightModel = payload.insightModel.trim();
    }

    if ("temperature" in payload) {
      if (!isValidNumber(payload.temperature) || payload.temperature < 0 || payload.temperature > 1) {
        return res.status(400).json({ message: "temperature must be a number between 0 and 1" });
      }
      normalized.temperature = payload.temperature;
    }

    if ("maxOutputTokens" in payload) {
      if (
        !isValidNumber(payload.maxOutputTokens) ||
        payload.maxOutputTokens < 128 ||
        payload.maxOutputTokens > 8192
      ) {
        return res.status(400).json({ message: "maxOutputTokens must be a number between 128 and 8192" });
      }
      normalized.maxOutputTokens = Math.floor(payload.maxOutputTokens);
    }

    const settings = await updateAiSettings(normalized);
    return res.json({ message: "AI settings updated successfully", data: settings });
  } catch (error: any) {
    return res.status(500).json({
      message: error?.message || "Failed to update AI settings",
    });
  }
}
