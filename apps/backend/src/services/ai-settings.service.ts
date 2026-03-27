import AiSetting, { IAiSetting } from "../models/AiSetting";

const AI_SETTINGS_KEY = "default";

export type AiSettingsPayload = Partial<{
  enabled: boolean;
  chatModel: string;
  insightModel: string;
  temperature: number;
  maxOutputTokens: number;
}>;

type AiSettingsResponse = {
  key: string;
  enabled: boolean;
  chatModel: string;
  insightModel: string;
  temperature: number;
  maxOutputTokens: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type AiRuntimeSettings = {
  enabled: boolean;
  chatModel: string;
  insightModel: string;
  temperature: number;
  maxOutputTokens: number;
};

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_OUTPUT_TOKENS = 1024;

function toAiSettingsResponse(doc: IAiSetting): AiSettingsResponse {
  return {
    key: doc.key,
    enabled: doc.enabled,
    chatModel: doc.chatModel,
    insightModel: doc.insightModel,
    temperature: doc.temperature,
    maxOutputTokens: doc.maxOutputTokens,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function getAiSettings(): Promise<AiSettingsResponse> {
  const existing = await AiSetting.findOne({ key: AI_SETTINGS_KEY });
  if (existing) {
    return toAiSettingsResponse(existing);
  }

  const created = await AiSetting.create({ key: AI_SETTINGS_KEY });
  return toAiSettingsResponse(created);
}

export async function updateAiSettings(payload: AiSettingsPayload): Promise<AiSettingsResponse> {
  const updateData: AiSettingsPayload = {};

  if (typeof payload.enabled !== "undefined") {
    updateData.enabled = payload.enabled;
  }
  if (typeof payload.chatModel !== "undefined") {
    updateData.chatModel = payload.chatModel.trim();
  }
  if (typeof payload.insightModel !== "undefined") {
    updateData.insightModel = payload.insightModel.trim();
  }
  if (typeof payload.temperature !== "undefined") {
    updateData.temperature = payload.temperature;
  }
  if (typeof payload.maxOutputTokens !== "undefined") {
    updateData.maxOutputTokens = payload.maxOutputTokens;
  }

  const updated = await AiSetting.findOneAndUpdate(
    { key: AI_SETTINGS_KEY },
    { $set: updateData, $setOnInsert: { key: AI_SETTINGS_KEY } },
    { new: true, upsert: true, runValidators: true }
  );

  return toAiSettingsResponse(updated!);
}

export async function getAiRuntimeSettings(): Promise<AiRuntimeSettings> {
  const existing = await AiSetting.findOne({ key: AI_SETTINGS_KEY });
  const envModel = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const envTemperature = Number(process.env.GEMINI_TEMPERATURE);
  const envMaxOutputTokens = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS);

  return {
    enabled: existing?.enabled ?? true,
    chatModel: existing?.chatModel || envModel,
    insightModel: existing?.insightModel || envModel,
    temperature:
      existing?.temperature ?? (Number.isFinite(envTemperature) && envTemperature >= 0 && envTemperature <= 1
        ? envTemperature
        : DEFAULT_TEMPERATURE),
    maxOutputTokens:
      existing?.maxOutputTokens ??
      (Number.isFinite(envMaxOutputTokens) && envMaxOutputTokens >= 128 && envMaxOutputTokens <= 8192
        ? Math.floor(envMaxOutputTokens)
        : DEFAULT_MAX_OUTPUT_TOKENS),
  };
}
