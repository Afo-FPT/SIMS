import { apiJson } from './api-client';

export interface AiSettings {
  key: string;
  enabled: boolean;
  chatModel: string;
  insightModel: string;
  temperature: number;
  maxOutputTokens: number;
  createdAt?: string;
  updatedAt?: string;
}

export type UpdateAiSettingsPayload = Partial<{
  enabled: boolean;
  chatModel: string;
  insightModel: string;
  temperature: number;
  maxOutputTokens: number;
}>;

export async function getAiSettings(): Promise<AiSettings> {
  return apiJson<AiSettings>('/ai/settings', { method: 'GET' });
}

export async function updateAiSettings(payload: UpdateAiSettingsPayload): Promise<AiSettings> {
  return apiJson<AiSettings>('/ai/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
