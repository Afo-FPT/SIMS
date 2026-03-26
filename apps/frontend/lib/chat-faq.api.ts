import { apiJson } from "./api-client";

export type ChatFaqRole = "customer" | "manager" | "staff" | "admin";

export type ChatFaqItem = { label: string; prompt: string };

export async function getChatFaqsByRole(role: ChatFaqRole): Promise<{ role: ChatFaqRole; items: ChatFaqItem[] }> {
  return apiJson<{ role: ChatFaqRole; items: ChatFaqItem[] }>(
    `/ai/faqs?role=${encodeURIComponent(role)}`
  );
}

export async function updateChatFaqsByRole(
  role: ChatFaqRole,
  items: ChatFaqItem[]
): Promise<{ role: ChatFaqRole; items: ChatFaqItem[] }> {
  return apiJson<{ role: ChatFaqRole; items: ChatFaqItem[] }>(`/ai/faqs`, {
    method: "PUT",
    body: JSON.stringify({ role, items }),
  });
}

