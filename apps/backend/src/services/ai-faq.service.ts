import { ChatFaq, type ChatFaqRole, type IChatFaqItem } from "../models/ChatFaq";

function validateRole(role: unknown): role is ChatFaqRole {
  return role === "customer" || role === "manager" || role === "staff" || role === "admin";
}

export async function getFaqsByRole(role: unknown): Promise<IChatFaqItem[]> {
  if (!validateRole(role)) throw new Error("Invalid role");

  const doc = await ChatFaq.findOne({ role }).lean();
  // DB-only: if nothing is configured, return empty list (frontend will hide FAQs).
  return (doc as any)?.items ?? [];
}

export type UpdateFaqsInput = {
  role: ChatFaqRole;
  items: IChatFaqItem[];
};

function validateItems(items: unknown): IChatFaqItem[] {
  if (!Array.isArray(items)) throw new Error("items must be an array");

  const maxItems = 20;
  if (items.length === 0) throw new Error("At least 1 FAQ item is required");
  if (items.length > maxItems) throw new Error(`Max ${maxItems} FAQ items is allowed`);

  const out: IChatFaqItem[] = [];
  for (const it of items) {
    const label = (it as any)?.label;
    const prompt = (it as any)?.prompt;
    if (typeof label !== "string" || label.trim().length < 2) {
      throw new Error("Each item.label must be a non-empty string (min 2 chars)");
    }
    if (typeof prompt !== "string" || prompt.trim().length < 3) {
      throw new Error("Each item.prompt must be a non-empty string (min 3 chars)");
    }
    out.push({ label: label.trim(), prompt: prompt.trim() });
  }
  return out;
}

export async function updateFaqsByRole(input: UpdateFaqsInput): Promise<IChatFaqItem[]> {
  if (!validateRole(input.role)) throw new Error("Invalid role");

  const items = validateItems(input.items);

  const doc = await ChatFaq.findOneAndUpdate(
    { role: input.role },
    { $set: { items } },
    { upsert: true, new: true }
  );
  return doc?.items ?? items;
}

