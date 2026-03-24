import { apiJson } from './api-client';

export type AiChatRole = 'user' | 'model';

export interface AiChatMessage {
  role: AiChatRole;
  content: string;
  /** Optional structured table rendered by the chatbot UI. Only attached to assistant messages. */
  table?: ChatTableSpec;
}

export interface AiChatResponse {
  reply: string;
  model?: string;
  table?: ChatTableSpec;
}

export interface ChatTableColumn {
  key: string;
  label: string;
  hrefTemplate?: string;
  textKey?: string;
}

export interface ChatTableSpec {
  columns: ChatTableColumn[];
  rows: Array<Record<string, unknown>>;
}

export async function sendAiChatMessage(messages: AiChatMessage[]): Promise<AiChatResponse> {
  return await apiJson<AiChatResponse>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
}
